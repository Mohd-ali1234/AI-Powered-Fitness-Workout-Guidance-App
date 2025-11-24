# database.py (or keep this at the top of your main file, but REMOVE the 'with' block)

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from typing import Optional
import json  # ⬅️ **ADD THIS IMPORT**s

# --- Configuration ---
DB_USERNAME = "mohd16"
DB_PASSWORD = "mohd1234" 
DB_NAME = "gymDatabase"
COLLECTION_NAME = "fitness_plans"

CONNECTION_STRING = (
    f"mongodb+srv://{DB_USERNAME}:{DB_PASSWORD}"
    f"@cluster0.okqqd6c.mongodb.net/"
    f"?appName=Cluster0"
)

# 1. Establish the client globally (Do NOT use 'with' here)
try:
    client = MongoClient(
        CONNECTION_STRING,
        server_api=ServerApi('1'),
        serverSelectionTimeoutMS=30000 # Set a shorter timeout for faster startup feedback
    )
    
    # Ping the deployment to confirm a successful connection
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas.")

except Exception as e:
    # If connection fails, log error and set client to None
    print(f"❌ CRITICAL CONNECTION ERROR: {e}")
    client = None

# 2. Define database and collection globally
if client:
    db = client[DB_NAME]
    plans_collection = db[COLLECTION_NAME]
else:
    # If connection failed, set dummy variables to avoid NameError later
    db = None 
    plans_collection = None


# --- Helper Function for Retrieval (Still needed, but simplified) ---
def get_latest_plan_text_content() -> Optional[str]:
    """
    Retrieves the workout plan text from the most recently inserted document.
    """
    if plans_collection is None:
        return "ERROR: Database connection is unavailable."
        
    try:
        latest_plan_doc = plans_collection.find_one(
            sort=[('_id', -1)] 
        )
        
        if latest_plan_doc and latest_plan_doc.get("generatedPlan"):
            # Assuming you want to return the whole generatedPlan JSON structure as text
            return json.dumps(latest_plan_doc["generatedPlan"], indent=2)
        else:
            return "No workout plans found in the collection."
            
    except Exception as e:
        print(f"An error occurred while fetching the latest plan: {e}")
        return None