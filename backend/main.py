import asyncio
import os
import io
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Replace with your API key configuration method if needed, the new SDK expects GOOGLE_API_KEY environment variable.
if not os.getenv("GOOGLE_API_KEY"):
    raise Exception("GOOGLE_API_KEY environment variable not set")

class PropertyResponse(BaseModel):
    value: int
    is_demo: bool

@app.post("/api/analyze-property", response_model=PropertyResponse)
async def analyze_property(file: UploadFile = File(...)):
    """
    Receives property image, checks with Gemini Vision to estimate value.
    If fails, falls back to demo estimate $21,950,000.
    """
    demo_estimate = 21950000
    try:
        content = await file.read()
        
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                "You are a real estate AI expert estimating property value for New York City homes. Based on this image, what is your best estimate of the property's value in USD? Only return digits. Be very short. If you are unsure, just say UNSURE.",
                types.Part.from_bytes(data=content, mime_type=file.content_type or 'image/jpeg')
            ]
        )
        
        text = response.text.strip().replace("$", "").replace(",", "")
        
        if "UNSURE" in text.upper():
            return PropertyResponse(value=demo_estimate, is_demo=True)
            
        try:
            val = int("".join([c for c in text if c.isdigit()]))
            if val <= 0:
                raise ValueError
            return PropertyResponse(value=val, is_demo=False)
        except ValueError:
            return PropertyResponse(value=demo_estimate, is_demo=True)
            
    except Exception as e:
        print(f"Error in analyze_property: {e}")
        return PropertyResponse(value=demo_estimate, is_demo=True)


SYSTEM_INSTRUCTION = """
You are the Mortgage AI Agent, a helpful but realistic mortgage qualification assistant. 
Your primary goal is to conduct a voice-driven mortgage interview. The conversation must be natural, brief, and sequential. Do not ask multiple questions at once.

Important Context:
- The user is trying to buy a home in New York City (do not tell the user this unless asked).
- Speak out all numeric inputs for confirmation. (e.g. "I heard ninety thousand dollars. Is that correct?")
- Be professional but add dramatic flair if the user is not qualified.

Interview Flow (Follow this exact order):
1. Intro: Acknowledge the home value. Explain standard financing: 80% Loan-to-Value (LTV), 20% down payment, 4% closing costs.
2. Ask for the user's expected interest rate. If they don't know, default to 5.25%.
3. Calculate the estimated monthly mortgage payment and state it. (Formula: P * (r * (1+r)^360) / ((1+r)^360 - 1)).
4. Ask for last year's W-2 gross annual income. Confirm the number explicitly.
5. Ask if they own a business. If yes, ask for monthly Net Operating Income (NOI).
6. Ask about existing debts: number of credit cards, student loans, auto loans.
7. Ask for monthly payments on each. (Defaults if unknown: $40/card, $300/student loan, $500/auto loan).
8. Ask for their credit score. If unknown, ignore.
9. Calculate Debt-to-Income (DTI) ratio: (Estimated Mortgage + Monthly Debts) / (Total Monthly Gross Income).
10. Deliver qualification result based on these rules:
    - DTI >= 43%: NOT QUALIFIED (Say exactly "You are NOT qualified for this home.", then slowly count down: "5... 4... 3... 2... 1...", then say "You are not qualified for this home with your current income. However, here is what you would need...", then pause for the UI to update).
    - DTI 38% to 42%: RISKY
    - DTI < 38%: QUALIFIED
    - Credit score <= 700 and they were Qualified: Downgrade to RISKY.
11. Output your recommendation:
    - If NOT QUALIFIED or RISKY: Calculate max home price they can afford. Add a humorous comment at the end (e.g., "And if all else fails, we found a lovely kennel in Astoria well within your budget.")
    - If they ask why, explain specific to DTI >= 43%, Borderline DTI, or Low Credit Score.

Keep responses concise and conversational since this is spoken out loud. Wait for the user to respond after asking a question.
"""

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    client = genai.Client()
    
    # We will use the live API via WebSocket
    # We will pipe the client's audio (from frontend) to gemini 
    # and pipe gemini's audio (from backend) to the client
    try:
        async with client.aio.live.connect(
            model='gemini-2.5-flash',
            config=types.LiveConnectConfig(
                system_instruction=types.Content(parts=[types.Part.from_text(text=SYSTEM_INSTRUCTION)]),
                response_modalities=["AUDIO"]
            )
        ) as session:
            
            print("Connected to Gemini Live API")
            # Send initial greeting prompt as a raw string
            await session.send(
                input="Introduce yourself as the Mortgage AI assistant and start the conversation with the user about whether they can afford the house.",
                end_of_turn=True
            )
            
            async def receive_from_client():
                """Receive audio bytes from frontend and send to Gemini"""
                try:
                    while True:
                        data = await websocket.receive()
                        if "bytes" in data:
                            audio_bytes = data["bytes"]
                            # Frontend should send raw 16-bit PCM 16kHz audio
                            await session.send(
                                input={"data": audio_bytes, "mime_type": "audio/pcm;rate=16000"}
                            )
                        elif "text" in data:
                            # Frontend can send some initial setup as JSON
                            try:
                                msg = json.loads(data["text"])
                                if "type" in msg and msg["type"] == "setup":
                                    # Send user's setup text to Gemini
                                    await session.send(
                                        input=msg["message"],
                                        end_of_turn=True
                                    )
                            except json.JSONDecodeError:
                                pass
                except WebSocketDisconnect:
                    print("Client disconnected.")
                except Exception as e:
                    print(f"Error in receive_from_client: {e}")

            async def receive_from_gemini():
                """Receive output from Gemini and send to frontend"""
                try:
                    while True:
                        async for message in session.receive():
                            server_content = message.server_content
                            if server_content is not None:
                                model_turn = server_content.model_turn
                                if model_turn is not None:
                                    for part in model_turn.parts:
                                        if part.inline_data:
                                            # Sent back audio output to frontend
                                            await websocket.send_bytes(part.inline_data.data)
                                        elif part.text:
                                            # Send transcript/text as JSON
                                            await websocket.send_text(json.dumps({
                                                "type": "transcript",
                                                "text": part.text
                                            }))
                                            
                                if server_content.turn_complete:
                                    await websocket.send_text(json.dumps({
                                        "type": "turn_complete"
                                    }))

                except Exception as e:
                    print(f"Error in receive_from_gemini: {e}")

            # Run both bidirectional tasks
            task_rx = asyncio.create_task(receive_from_client())
            task_tx = asyncio.create_task(receive_from_gemini())
            
            done, pending = await asyncio.wait(
                [task_rx, task_tx],
                return_when=asyncio.FIRST_COMPLETED
            )
            for p in pending:
                p.cancel()
                
    except Exception as e:
        print(f"Failed to connect to Live API: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
