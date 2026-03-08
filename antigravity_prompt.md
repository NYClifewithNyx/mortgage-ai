# Mortgage AI Agent — Antigravity Build Prompt

> Paste everything below this line directly into Antigravity as the build prompt.

---

Build a real-time multimodal AI web app called **Mortgage AI Agent**.

The app is a voice-driven mortgage qualification assistant powered by the Gemini Live API. The user speaks to the AI through their microphone. The AI responds in real-time audio. The conversation is interruptible and bidirectional.

---

## TECH STACK

- Frontend: React
- Backend: FastAPI (Python)
- AI: Gemini Live API (`gemini-2.5-flash-native-audio-preview`)
- Audio: WebSocket streaming, 16-bit PCM, 16kHz input / 24kHz output
- Deployment: Google Cloud Run

---

## CORE FEATURES

### 1. Real-Time Voice Conversation

Use Gemini Live API with bidirectional WebSocket streaming.

- Microphone voice input
- Real-time voice output from Gemini
- Interruptible conversation (user can speak while AI is talking)
- Continuous streaming — not request/response

### 2. House Image Upload

The user can upload a photo of a house at the start.

The agent should:
- Analyze the image using Gemini Vision
- Estimate the property value
- Assume the location is in New York City internally (never tell the user this)

#### Image Identification Fallback

If the system cannot confidently identify the property from the image, do not block the flow.

Fall back immediately to a hardcoded demo estimate of **$21,950,000** and continue normally.

Display in UI: `Estimated home value: $21,950,000 (demo estimate)`

### 3. Voice Confirmation for Numeric Inputs

For all numeric inputs (income, debts, loans), the AI must confirm before proceeding.

Example:
> AI: What is your annual income?
> User: Ninety thousand dollars.
> AI: I heard ninety thousand dollars. Is that correct?
> User: Yes.

If the user says no, the AI asks the question again.

---

## CONVERSATION FLOW

The agent conducts a voice interview in this order:

1. Ask user to upload a house photo or describe the property
2. Confirm estimated property value
3. Explain financing assumptions (80% LTV, 20% down, 4% closing cost)
4. Ask for interest rate — default to 5.25% if unknown
5. Calculate and state monthly mortgage payment
6. Ask for last year W-2 gross annual income
7. Ask about business ownership — if yes, ask for monthly NOI
8. Ask about debts: number of credit cards, student loans, auto loans
9. Ask for monthly payment on each — use defaults if unknown
10. Ask for credit score — ignore if user says "don't know"
11. Calculate DTI and classify result
12. If user asks why they didn't qualify, explain the specific reason in plain language
13. Deliver qualification result with dramatic countdown (see below)
14. Show recommendation: Path A (affordable home) or Path B (income gap)

---

## MORTGAGE CALCULATION LOGIC

### Financing Assumptions (Fixed)

```
loan_amount        = home_price * 0.80
down_payment       = home_price * 0.20
closing_cost       = loan_amount * 0.04
cash_at_closing    = down_payment + closing_cost
```

### Monthly Payment Formula

```
monthly_rate    = annual_rate / 12
n               = 360
monthly_payment = P * (r * (1+r)^n) / ((1+r)^n - 1)
where P = loan_amount
Default rate: 5.25%
```

### DTI Calculation

```
monthly_income     = annual_income / 12
total_monthly_debt = mortgage_payment + all other monthly debts
DTI                = total_monthly_debt / monthly_income
```

### Default Debt Assumptions (if user does not know)

```
Credit card: $40 per card per month
Student loan: $300 per loan per month
Auto loan: $500 per loan per month
```

### Qualification Rules (apply in this order)

```
1. DTI >= 43%                          → NOT QUALIFIED (no override)
2. DTI 38% to 42%                      → RISKY
3. DTI < 38%                           → QUALIFIED
4. Credit score <= 700 + was Qualified → downgrade to RISKY
5. Credit score unknown                → ignore
```

---

## DRAMATIC COUNTDOWN — NOT QUALIFIED

When the result is NOT QUALIFIED, trigger a countdown sequence.

### Voice behavior

The AI says:
> "You are NOT qualified for this home."

Then counts down slowly:
> "5... 4... 3... 2... 1..."

### Visual behavior

At the same time, the UI displays a large animated countdown:

```
5 → 4 → 3 → 2 → 1
```

After the countdown, the UI transitions to the explanation screen.

### Explanation Screen (after countdown)

Display:
- Estimated home price
- Estimated loan amount
- Required income to qualify
- Required down payment
- Estimated monthly payment
- Required mortgage documents list

Voice output:
> "You are not qualified for this home with your current income. However, here is what you would need."

---

## RECOMMENDATION OUTPUT

### Path A — Affordable Home Recommendation

Triggered when result is NOT QUALIFIED or RISKY.

Show:
- Recommended max home price based on current income
- Estimated down payment and monthly payment
- Why the original home is out of range

End with a humorous suggestion:
> "And if all else fails — we found a lovely kennel in Astoria well within your budget."

### Path B — Income Gap

If the user wants to qualify for the specific target house:

```
required_monthly_income  = total_monthly_debt / 0.38
required_annual_income   = required_monthly_income * 12
income_gap               = max(0, required_annual_income - current_annual_income)
```

Show:
- Exact dollar amount of income gap
- Optional debt reduction target to qualify

---

## WHY AM I NOT QUALIFIED — EXPLANATION ENGINE

If the user asks why they didn't qualify, the agent explains the specific cause.

### Case 1 — DTI >= 43% (High Debt Load)
> "Your total monthly debt obligations exceed 43% of your gross monthly income. Most lenders will not approve a loan at this ratio. Path B shows exactly how much more income you would need."

### Case 2 — DTI 38–42% (Borderline)
> "Your debt-to-income ratio is in a gray zone. Some lenders may approve this, but you are considered higher-risk. Paying down existing debts to get under 38% DTI would move you to Qualified."

### Case 3 — Credit Score <= 700
> "Your credit score is at or below 700. Even if your income supports the payment, lenders see this as elevated risk. Improving your credit score above 700 and keeping DTI under 38% would result in a Qualified status."

---

## UI SECTIONS

Build in this order if time is limited:

1. House photo upload + estimated value display
2. Microphone button + real-time transcript area
3. Qualification result card (Qualified / Risky / Not Qualified)
4. Countdown animation (triggers on Not Qualified)
5. Explanation screen (after countdown)
6. Affordable alternative or income gap recommendation

---

## DEMO PRIORITY

If time is limited, complete in this order:

1. Image upload → estimated property value
2. Voice interview → income and debt collection
3. DTI engine → qualification result
4. Countdown animation
5. Recommendation card

---

## STYLE

- Clean, modern UI with dark background for dramatic effect
- Large bold result display (QUALIFIED / RISKY / NOT QUALIFIED) in color
  - Green for Qualified
  - Amber for Risky
  - Red for Not Qualified
- Countdown numbers should be large, centered, and animated
- Slightly humorous tone at the kennel recommendation
- Professional and warm tone throughout the interview
