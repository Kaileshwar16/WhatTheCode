import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# --- SETUP ---

# 1. Load your .env file
load_dotenv()

# 2. Set up the Flask app
app = Flask(__name__)
# 3. Enable CORS. This is CRITICAL to allow your extension
#    (running on github.com) to talk to this server (running on 127.0.0.1).
CORS(app) 

# 4. Get your secret key safely from the .env file
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY not found in .env file. Please check your .env file.")

# 5. This is the correct, single-line URL
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"

# --- API ENDPOINT ---

@app.route('/api/explain', methods=['POST', 'OPTIONS'])
def explain_code():
    
    # This block handles the "pre-flight" request that
    # the browser sends first to check if it's safe to proceed.
    if request.method == 'OPTIONS':
        return jsonify({"message": "CORS pre-flight OK"}), 200

    # This block handles the actual POST request from your extension
    if request.method == 'POST':
        try:
            # 1. Get the code snippet from the extension
            data = request.json
            code = data.get('code')

            if not code:
                return jsonify({"error": "No code provided"}), 400

            # 2. Prepare the prompt and payload for Gemini
            system_prompt = "You are an expert developer. Explain the following code snippet concisely (3 sentences max) for a fellow developer. Focus on the 'what' and the 'why'. Do not use markdown or formatting."
            
            payload = {
                "contents": [{
                    "parts": [{"text": code}]
                }],
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
            }

            # 3. Call the Gemini API (securely from your server)
            response = requests.post(GEMINI_API_URL, json=payload)
            response.raise_for_status()  # Raise an exception for bad status codes

            result = response.json()
            explanation = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')

            if not explanation:
                return jsonify({"error": "No explanation found in API response"}), 500

            # 4. Send the clean explanation back to the extension
            return jsonify({"explanation": explanation})

        except requests.exceptions.RequestException as e:
            print(f"API Request Error: {e}")
            return jsonify({"error": str(e)}), 502
        except Exception as e:
            print(f"Server Error: {e}")
            return jsonify({"error": "Internal server error"}), 500

# --- RUN THE SERVER ---

if __name__ == '__main__':
    print("Starting Python backend server on http://127.0.0.1:5000")
    # Run the server on port 5000.
    app.run(debug=True, port=5000)
