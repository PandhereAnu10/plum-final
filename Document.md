# Plum AI OPD Claim Adjudicator

An intelligent, full-stack automation tool designed to streamline Outpatient Department (OPD) insurance claim processing. This system uses **OCR** and **Llama 3.3 Reasoning** to adjudicate claims against policy terms in seconds.

## Live Links
- **Live Application (Frontend):** https://plum-final.vercel.app/
- **GitHub Repository:** [https://github.com/PandhereAnu10/plum-final](https://github.com/PandhereAnu10/plum-final)

---

## 1. System Documentation

###  Architecture Diagram
The system follows a modern AI pipeline. You can view the full technical diagram here:
**[View Architecture Diagram](./backend/architecture.svg)**

### Decision Logic Flowchart
The Adjudication Engine follows a strict 5-step hierarchical logic to ensure compliance:
1.  **Eligibility Check:** Validates treatment date against the policy start (2024-01-01) and satisfies waiting periods.
2.  **Document Validation:** Uses OCR to verify the presence of a valid Doctor Registration Number and matching patient names.
3.  **Coverage Check:** Cross-references extracted diagnosis against "Exclusions" and "Covered Services."
4.  **Limit Validation:** Applies the Per-Claim Limit (₹5,000) and specific category sub-limits.
5.  **Audit & Necessity:** Performs a mathematical sum-check of line items to detect fraud/inconsistencies.

## 2. List of Assumptions Made
- **OCR Language:** Assumed all medical documents are in English for optimal Tesseract extraction.
- **Currency:** All financial calculations and policy limits are assumed to be in INR (₹).
- **Manual Review Trigger:** Implemented a safety threshold where any claim with a confidence score below 70% or a detected math error is automatically escalated to a human.
- **Policy Scope:** Assumed the 'Plum OPD Advantage' policy rules apply to all 2024 submissions.

---

## 3. Key Features
- **AI-Powered Adjudication:** Leverages **Groq (Llama 3.3 70B)** for human-like clinical reasoning.
- **Fraud Detection:** Automated line-item math audit to catch over-billing.
- **Human-in-the-Loop:** A dedicated Admin Dashboard for manual overrides and claim tracking.
- **Pro Deliverables:** One-click branded PDF report generation for patients.
- **Theme Engine:** Midnight Dark Mode and Plum-branded Light Mode.

---

## 4. Setup Instructions

### Prerequisites
- **Tesseract OCR:** [Download here](https://github.com/UB-Mannheim/tesseract/wiki). Ensure it's installed at `C:\Program Files\Tesseract-OCR\tesseract.exe` (for Windows users).

### Backend Setup (FastAPI + Docker)
1.  Navigate to `/backend`.
2.  Install dependencies: `pip install -r requirements.txt`.
3.  Set environment variables for `GROQ_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.
4.  Run: `python -m uvicorn main:app --reload`.

### Frontend Setup (Next.js)
1.  Navigate to `/frontend`.
2.  Install dependencies: `npm install`.
3.  Run: `npm run dev`.

---

## 5. Potential Improvements
- **Vision-Language Models (VLM):** Transitioning from Tesseract to GPT-4o-Vision or Gemini Flash for better handling of handwritten prescriptions.
- **RAG Integration:** Implementing Retrieval-Augmented Generation to allow admins to query historical claims and fraud patterns using natural language.
- **Batch Processing:** Enabling HR managers to upload bulk claim CSVs for instant group adjudication.
