import os
import re
import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# --- SETUP ---
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

print(f"API key loaded: {bool(GEMINI_API_KEY)} — starts with: {GEMINI_API_KEY[:8] if GEMINI_API_KEY else 'NONE'}")

if not GEMINI_API_KEY:
    raise EnvironmentError("GOOGLE_API_KEY not found in .env file.")

GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
)

# --- REQUEST BODY SCHEMA ---
class CodeRequest(BaseModel):
    code: str

# --- HELPER: extract retry delay from 429 response ---
def get_retry_delay(response_json: dict, default: float = 60.0) -> float:
    try:
        for detail in response_json.get("error", {}).get("details", []):
            if detail.get("@type", "").endswith("RetryInfo"):
                delay_str = detail.get("retryDelay", "")
                match = re.search(r"[\d.]+", delay_str)
                if match:
                    return float(match.group()) + 2  # small buffer
    except Exception:
        pass
    return default

# --- API ENDPOINT ---
@app.post("/api/explain")
async def explain_code(body: CodeRequest):
    system_prompt = (
        "You are an expert developer. Explain the following code snippet concisely "
        "(3 sentences max) for a fellow developer. Focus on the 'what' and the 'why'. "
        "Do not use markdown or formatting."
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": body.code}]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        }
    }

    max_retries = 3

    async with httpx.AsyncClient() as client:
        for attempt in range(max_retries):
            try:
                response = await client.post(GEMINI_API_URL, json=payload, timeout=60)
                print(f"Gemini status: {response.status_code}")

                # Rate limited — wait and retry
                if response.status_code == 429:
                    result = response.json()
                    delay = get_retry_delay(result)
                    print(f"Rate limited. Retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(delay)
                    continue

                # Any other non-200 — fail immediately, no retry
                if response.status_code != 200:
                    print(f"HTTP error: {response.status_code} - {response.text}")
                    raise HTTPException(status_code=502, detail=f"Gemini API error: {response.text}")

                # Success
                break

            except HTTPException:
                raise  # re-raise our own exceptions immediately
            except httpx.RequestError as e:
                print(f"Request error: {type(e).__name__}: {e}")
                raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")
        else:
            # All retries exhausted
            raise HTTPException(status_code=429, detail="Gemini rate limit hit. Please try again in a minute.")

    result = response.json()
    explanation = (
        result.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text")
    )

    if not explanation:
        print(f"Unexpected response structure: {result}")
        raise HTTPException(status_code=500, detail="No explanation in API response")

    return {"explanation": explanation}

# --- RUN THE SERVER ---
if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server on http://127.0.0.1:5000")
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)
