# 🏙️ Can I Buy This House?

> Ask a house if you can afford it.

An AI agent that analyzes a home and tells you whether you qualify for
the mortgage.

Upload a house → talk to the AI → get a **reality check**.

------------------------------------------------------------------------

## 🎥 Demo

**Scenario**

A user asks if they can afford a luxury NYC penthouse.

The AI analyzes the home, calculates mortgage affordability, and
responds in real time.

House Price: \$21,950,000\
User Income: \$90,000

Result:

NOT QUALIFIED\
5\
4\
3\
2\
1\
Welcome to NYC housing reality.

------------------------------------------------------------------------

# ✨ Features

## 🖼 Multimodal Input

Upload a photo of a house.

The system uses vision AI to estimate the property value.

------------------------------------------------------------------------

## 🎤 Real-time Voice Agent

Talk naturally with the AI using streaming voice.

Example:

AI: What is your annual income?\
User: Ninety thousand dollars.\
AI: I heard ninety thousand dollars. Is that correct?

------------------------------------------------------------------------

## 🧠 Mortgage Affordability Engine

The system calculates:

-   Loan amount
-   Down payment
-   Monthly payment
-   Debt-to-income ratio
-   Qualification result

Rules:

DTI \< 38% → Qualified\
38--42% → Risky\
≥ 43% → Not Qualified

------------------------------------------------------------------------

## 🎭 Dramatic Reality Check

If the user cannot afford the home:

NOT QUALIFIED\
5\
4\
3\
2\
1

Then the system explains:

-   Required income
-   Required down payment
-   Required documents

------------------------------------------------------------------------

# 🧱 Architecture

User Browser │ ├── Image Upload → Vision AI → Property Value Estimate
├── Voice Conversation → Mortgage Interview └── Mortgage Engine → DTI
Calculation → Qualification Result

------------------------------------------------------------------------

# 🧰 Tech Stack

Frontend: React\
Backend: FastAPI\
AI: Gemini Live API\
Vision: Gemini Multimodal\
Deployment: Google Cloud

------------------------------------------------------------------------

# 📊 Mortgage Assumptions

LTV: 80%\
Down Payment: 20%\
Closing Cost: 4%\
Interest Rate: 5.25%\
Loan Term: 30 years

------------------------------------------------------------------------

# 📍 Scope

The system internally assumes all homes are in **New York City**.

This restriction is not surfaced to the user.

------------------------------------------------------------------------

# 🧪 Example Demo Property

15 Hudson Yards\
New York, NY\
Price: \$21,950,000

If image recognition fails, the system uses this price as a fallback.

------------------------------------------------------------------------

# 🚀 How to Run

git clone https://github.com/your-repo/can-i-buy-this-house

pip install -r requirements.txt

python main.py

------------------------------------------------------------------------

# 💡 Why This Project Exists

Buying a home is confusing.

People ask one simple question:

**Can I afford this house?**

This AI agent answers that question instantly.

------------------------------------------------------------------------

# 🎬 Final Result

Show a house\
↓\
Ask one question\
↓\
Reality check

Sometimes the answer is:

NOT QUALIFIED
