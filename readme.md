# 🏠 Can I Buy This House?

> **AI-powered mortgage qualification agent** — Upload a house photo, speak your financial details, and get a real-time verdict on whether you can afford it.

![Team](https://img.shields.io/badge/Team-Mortgage%20AI-blue?style=for-the-badge)
![Built With](https://img.shields.io/badge/Built%20With-Gemini%20Live%20API-orange?style=for-the-badge)
![Modalities](https://img.shields.io/badge/Modalities-Voice%20%2B%20Vision-purple?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Hackathon%20Demo-green?style=for-the-badge)

---

## 📌 Overview

**Can I Buy This House?** is a **multimodal, real-time AI mortgage qualification agent** built on the **Gemini Live API**. It combines computer vision and voice-enabled conversational AI to give users an instant, data-driven answer to the question every homebuyer asks.

Users upload a photo of any property and **speak naturally** with the agent — asking about affordability, loan structure, or required income. The agent uses **Gemini Vision** to estimate market value from the image and **Gemini Live** to conduct a fluid, voice-based financial consultation — handling follow-up questions and interruptions in real time, just like talking to a mortgage advisor.

---

## ✨ Features

- 📸 **Vision-based home valuation** — Gemini Vision analyzes property photos to estimate market price
- 🎙️ **Real-time voice conversation** — Speak naturally with the agent; no forms, no typing required
- 🔄 **Interruption handling** — Agent gracefully handles mid-sentence follow-ups and topic changes
- 💰 **Live DTI analysis** — Debt-to-income ratio calculated and explained in real time during conversation
- 🧮 **Full mortgage breakdown** — Loan amount, down payment, P&I, HOA, taxes, insurance — narrated aloud
- ✅ / ❌ **Instant qualification verdict** — Clear result with a spoken plain-language explanation
- 📊 **Affordability gap analysis** — Agent tells you exactly how much income you'd need and why

---

## 🎙️ Live Agent Capabilities

This project is built on the **Gemini Live API**, qualifying it as a **real-time, voice-and-vision enabled agent**:

| Capability | Implementation |
|---|---|
| **Real-time voice I/O** | User speaks income/financial details; agent responds with full audio |
| **Vision input** | Property photo analyzed by Gemini Vision for price estimation |
| **Natural conversation** | Multi-turn dialogue — ask follow-ups like *"What if I earned $150k?"* |
| **Interruption handling** | Live API supports barge-in; user can redirect mid-response |
| **Multimodal fusion** | Vision (image) + voice (audio) processed together in a single agent context |

---

## 🔄 User Flow

```
[Landing Page]
      ↓
[Upload House Photo]  →  Gemini Vision estimates home price
      ↓
[Voice Conversation Starts]
  "What's your annual income?"
  "Do you have any existing debts?"
  "Are you looking at a 15 or 30-year term?"
      ↓
[Live Agent calculates DTI, mortgage structure, affordability]
      ↓
[Spoken + Visual Qualification Result + Full Breakdown]
      ↓
[Follow-up Q&A — "What if I put 30% down?"]
```

---

## 🧠 How It Works

1. **Image Analysis** — Gemini Vision processes the uploaded property photo and estimates fair market value based on visual cues (architecture, finishes, location context, size)
2. **Voice Intake** — Gemini Live API conducts a real-time voice interview to collect income, debts, and loan preferences
3. **Mortgage Calculation** — Assumes standard 80/20 LTV, 30-year fixed at current rates, with estimated HOA, property tax, and insurance
4. **DTI Evaluation** — Total monthly housing cost divided by gross monthly income; lender threshold is 43%
5. **Live Verdict** — Agent delivers a spoken + visual qualification result, then remains available for follow-up questions and scenario modeling

---

## 📐 Mortgage Logic

| Parameter | Assumption |
|---|---|
| Down Payment | 20% |
| Loan-to-Value | 80% |
| Loan Term | 30 years |
| Interest Rate | 5.25% (fixed) |
| DTI Threshold | 43% of gross monthly income |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/team-mortgage-ai/can-i-buy-this-house.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Run the development server
npm run dev
```

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Vision AI** | Google Gemini Vision API |
| **Live Agent / Voice** | Google Gemini Live API |
| **Frontend** | React / Next.js |
| **Styling** | Tailwind CSS |
| **Mortgage Engine** | Custom financial logic |

---

## 👥 Team

**Team Mortgage AI**

| Name | Role |
|---|---|
| **Jae Wha Yang** | Co-Creator |
| **Nishad Kolhe** | Co-Creator |

---

## 📄 License

This project was built for hackathon purposes. All rights reserved by Team Mortgage AI.

---

*Built with ❤️ by Team Mortgage AI — Powered by Gemini Live API*
