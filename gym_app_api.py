from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import json
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

app = FastAPI()

API_KEY = "Write your Api key here"
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

