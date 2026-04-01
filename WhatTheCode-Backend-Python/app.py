import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# --- SETUP ---

# 1. Load environment variables
load_dotenv()

# 2. Initialize FastAPI app
app = FastAPI()

# 3. Enable CORS (allow Chrome extension)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can restrict this later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Load API key
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GEMINI_API_KEY:
    raise EnvironmentError("GOOGLE_API_KEY not found in .env file")

# 5. Gemini API URL
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"

# --- REQUEST MODEL ---

class CodeRequest(BaseModel):
    code: str

# --- API ENDPOINT ---

@app.post("/api/explain")
async def explain_code(request: CodeRequest):
    try:
        code = request.code

        if not code:
            raise HTTPException(status_code=400, detail="No code provided")

        system_prompt = (
            "You are an expert developer. Explain the following code snippet concisely "
            "(3 sentences max) for a fellow developer. Focus on the 'what' and the 'why'. "
            "Do not use markdown or formatting."
        )

        payload = {
            "contents": [{"parts": [{"text": code}]}],
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
        }

        # NOTE: requests is blocking → okay for now, can optimize later
        response = requests.post(GEMINI_API_URL, json=payload)
        response.raise_for_status()

        result = response.json()

        explanation = (
            result.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        if not explanation:
            raise HTTPException(status_code=500, detail="No explanation found")

        return {"explanation": explanation}

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

# --- RUN SERVER ---
# uvicorn main:app --reload
