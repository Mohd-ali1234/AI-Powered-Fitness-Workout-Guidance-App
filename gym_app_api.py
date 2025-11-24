from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import json
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
# chat_app_api.py
from google import genai
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
# from mongoDb import get_latest_plan_text  # import the plan text from mongodb.py

# Initialize Gemini client
from mongoDb import plans_collection, client, get_latest_plan_text_content # Assuming you put the setup in database.py

app = FastAPI()

API_KEY = "AIzaSyAanhZwTC8SuGpUKH9DKMis-C8NiWYTwUc"
client = genai.Client(api_key=API_KEY)

class PromptRequest(BaseModel):
    name: str
    phone: Optional[str] = None
    age: Optional[int] = None
    heightCm: Optional[int] = None
    weightKg: Optional[int] = None
    goal: Optional[str] = None
    trainingDaysPerWeek: Optional[int] = None
    preferredTimes: List[str] = []
    notes: Optional[str] = None
    submittedAtIso: Optional[str] = None


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def ask_gemini(query: str) -> str:
    """
    Ask a question using the generated plan from MongoDB as context.
    Returns Gemini's response.
    """
    # Embed plan and query

    plan_text_content = get_latest_plan_text_content()

    plan_embedding = embedding_model.encode([plan_text_content])
    query_embedding = embedding_model.encode([query])

    # Optional: compute similarity (for logging)
    similarity_score = cosine_similarity(query_embedding, plan_embedding)[0][0]
    print(f"[DEBUG] Similarity score with plan: {similarity_score:.4f}")

    # Prepare prompt for Gemini
    prompt = f"""
Use ONLY the information provided below to answer the question.

--- Generated Plan ---
{plan_text_content}
---------------------

Question: {query}
Answer:
"""
    # Call Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text



def extract_json(text: str):
    """
    Cleans AI response and extracts JSON.
    Works even if the response is wrapped in ```json ... ``` or has extra text.
    """
    text = text.strip()
    
    # Remove ```json ... ``` block if present
    if text.startswith("```"):
        text = text.split("```")[1]  # remove first ```
        text = text.replace("json", "", 1).strip()  # remove "json" tag
        text = text.split("```")[0].strip()  # remove closing ```
    
    return json.loads(text)

class ChatRequest(BaseModel):
    sender: str
    message: str

@app.post("/api/chats")
async def chat_endpoint(request: ChatRequest):
    """
    Receives a user message and returns Gemini's response
    """
    user_message = request.message
    ai_reply = ask_gemini(user_message)
    return {"reply": {"message": ai_reply}}

@app.get("/api/chats")
async def get_chats():
    """
    Optional: could return chat history if you store messages in DB
    """
    return []  # empty for now


@app.post("/gemini")
async def call_gemini(request: PromptRequest):
    """
    POST endpoint that accepts user details and calls Gemini API.
    Returns a structured workout & diet plan in JSON format.
    """
    try:
        # Constructing a well-structured prompt
        user_data = request.dict()
        formatted_data = json.dumps(user_data, indent=2)

        prompt = f"""
You are a certified personal trainer and nutrition coach.
Using the following client data, create a personalized **fitness and diet plan**.

Client data:
{formatted_data}

### Your Task
1. Analyze the user's goal, age, height, and weight.
2. Design a weekly workout plan (with exercise names, sets, reps, and rest time).
3. Provide a detailed daily diet plan (breakfast, lunch, dinner, and snacks).
4. Include general tips or precautions, especially if there are any injuries.
5. Output the entire response **only** in JSON format.

### Response Format Example (MUST follow strictly)
{{
  "userSummary": {{
    "name": "",
    "goal": "",
    "age": 0,
    "heightCm": 0,
    "weightKg": 0
  }},
  "workoutPlan": [
    {{
      "day": "Monday",
      "focus": "Upper Body Strength",
      "exercises": [
        {{"name": "Bench Press", "sets": 4, "reps": 10, "restSec": 90}},
        {{"name": "Push-ups", "sets": 3, "reps": 15, "restSec": 60}}
      ]
    }}
  ],
  "dietPlan": {{
    "breakfast": "Oatmeal with banana and almonds",
    "lunch": "Grilled chicken with brown rice and vegetables",
    "dinner": "Paneer salad with olive oil dressing",
    "snacks": ["Greek yogurt", "Protein shake"]
  }},
  "tips": [
    "Avoid heavy lifting if you have shoulder pain",
    "Stay hydrated throughout the day"
  ]
}}

Make sure to produce **valid JSON only**, without any markdown or extra text.
        """

        # Call Gemini API
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        print("HEere check ouu rh "+response.text)

        generated_plan = extract_json(response.text)
        if plans_collection is None:
                    raise Exception("Database connection failed during startup.")
        # generated_plan = extract_json(response.text)

        insert_result = plans_collection.insert_one({
            "userData": user_data,
            "generatedPlan": generated_plan
        })


        return {
            "success": True,
            "response": response.text
        }


    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/")
async def root():
    return {"message": "Gym App API is running"}

