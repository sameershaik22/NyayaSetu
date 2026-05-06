# ⚖️ NyayaSetu — From Court Judgments to Verified Action Plans

> **"NyayaSetu"** (meaning *Bridge of Justice* in Sanskrit) is a government-grade AI decision support system that transforms raw court judgment documents into structured, human-verified action plans — helping government officers act on court orders faster, accurately, and with full accountability.

---

## ⚡ Quick Demo (30 seconds)

> **No setup needed for the demo — just run the app and follow these 4 steps:**

1. Click **"🔍 Load Demo"** on the upload page
2. Click **"Proceed to Verification →"**
3. Click **"✓ Approve Plan"**
4. Click **"View Dashboard →"**

✔ Full system demonstrated in under 1 minute.

---

## 🧠 What Is NyayaSetu?

Every day, hundreds of court judgments are issued across India. These judgments often contain critical directives — ordering government departments to pay compensation, provide information under RTI, implement policies, or comply with environmental regulations.

**The problem:** These judgments are long, written in complex legal language, and buried in PDFs. Government officers — who are not lawyers — struggle to quickly understand:

- What is this case about?
- What must my department do?
- By when?

**NyayaSetu solves this** by:

1. Accepting court judgment documents (PDF, DOCX, TXT, scanned images)
2. Automatically extracting and summarising the judgment in plain English
3. Generating a structured action plan (what to do, who does it, deadline)
4. Requiring a human officer to **approve or reject** the AI output before anything is saved
5. Displaying only **verified, approved** records on a clean compliance dashboard

This is **not** an automated system that blindly acts on AI suggestions. It is an **Explainable AI + Human-in-the-Loop** decision support tool.

---

## 🎯 Core Problem Statement

| Challenge | NyayaSetu Solution |
|---|---|
| Judgments are long PDFs with complex legal language | AI extracts and summarises in 5-6 plain English lines |
| Officers don't know what actions are needed | AI identifies directive sentences ("directed to", "shall", "must") |
| AI can hallucinate or make mistakes | Human verification step — nothing saves without officer approval |
| No tracking of compliance status | Dashboard shows Pending / Completed / Overdue per department |
| Scanned documents can't be parsed | OCR fallback using pytesseract |
| Only PDFs in government offices | Supports PDF, DOCX, TXT, JPG, PNG |

---

## 🔄 How It Works — The Full Pipeline

```
📄 Upload Document
       ↓
🔍 Text Extraction  (PyMuPDF / python-docx / OCR)
       ↓
📋 AI Case Summary  (Plain English Story: What → Problem → Decision)
       ↓
⚙️  Data Extraction  (Case title, date, parties, directions, timeline)
       ↓
🎯 Action Plan Generation  (Type, Department, Deadline, Priority)
       ↓
👤 Human Verification  (Officer reviews → Approve / Edit / Reject)
       ↓
📊 Dashboard  (Only approved records are shown — verified data only)
```

### Step-by-Step Walkthrough

**Step 1 — Upload**  
Officer uploads a court judgment. Supported formats: `.pdf`, `.docx`, `.txt`, `.jpg`, `.jpeg`, `.png`. Scanned images go through pytesseract OCR automatically.

**Step 2 — AI Summary (Plain English)**  
The system reads the full text and produces a 5–6 sentence human story:
- *"This case is about…"*
- *"The main issue was…"*
- *"The court examined and concluded…"*
- *Court Directions list — only real "directed to / shall / must" sentences*

**Step 3 — Data Extraction**  
Rule-based extraction pulls:
- Case title and case number
- Date of order
- Parties (petitioner vs respondent)
- Key court directions
- Timeline / compliance deadline

**Step 4 — Action Plan**  
Based on the case type detected:
- **Compliance** → creates a task with department, deadline, priority
- **Appeal Outcome** → suggests consulting legal counsel
- **Informational** → flags as "No administrative action required"

**Step 5 — Human Verification**  
The officer sees the full AI output with:
- AI warning banner ("Requires Human Verification")
- Case summary panel
- Editable extracted data
- Action plan with Confidence Score (0–95%) + explanation
- AI Reasoning (Explainable AI)
- Source text highlight (traceable to original PDF)
- **Approve / Edit & Approve / Reject** buttons

**Step 6 — Dashboard**  
Only approved records appear. Officers can:
- Filter by department, priority, status
- Update completion status (Pending → Completed / Overdue)
- View in Table View or Department View
- Delete records

---

## 🏗️ Architecture

```
NyayaSetu/
├── backend/                     ← FastAPI Python backend
│   ├── main.py                  ← App entry point, router registration, CORS
│   ├── database.py              ← SQLite schema + init
│   ├── requirements.txt
│   └── routers/
│       ├── pdf_router.py        ← Multi-format upload + text extraction
│       ├── summarize_router.py  ← AI case summary + direction extraction
│       ├── extract_router.py    ← Structured data extraction (title, date, parties…)
│       ├── action_router.py     ← Action plan generation + case type logic
│       ├── verify_router.py     ← Human verification endpoint
│       └── dashboard_router.py ← Dashboard data + status updates
│
└── frontend/                    ← Next.js React frontend
    ├── app/
    │   ├── page.tsx             ← Upload page (Step 1–4)
    │   ├── verify/page.tsx      ← Verification page (Step 5)
    │   ├── dashboard/page.tsx   ← Compliance dashboard (Step 6)
    │   ├── layout.tsx           ← Root layout + Navbar + Footer
    │   └── globals.css          ← Government design system tokens
    ├── components/
    │   └── Navbar.tsx           ← Government-style navigation bar
    └── lib/
        └── api.ts               ← All frontend → backend API calls
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | FastAPI (Python) | Fast, async, auto-docs at `/docs` |
| **Frontend** | Next.js 16 (App Router) | SSR + React components |
| **Database** | SQLite | Zero-setup, local, portable |
| **PDF Parsing** | PyMuPDF (fitz) | Fast, accurate text extraction |
| **DOCX Parsing** | python-docx | Read Word documents |
| **OCR** | pytesseract + Pillow | Scanned images / image PDFs |
| **AI Logic** | Rule-based NLP (regex) | No ML training needed, explainable |
| **Styling** | Tailwind CSS | Government light theme |
| **State** | React useState + sessionStorage | Pass data between pages |

### Why Rule-Based AI Instead of an LLM?

- **No API keys needed** — works offline, no cost
- **Explainable** — every decision traceable to a regex pattern
- **No hallucination risk** — only returns what is actually in the text
- **Government-safe** — documents never leave the local machine

---

## 🔒 No External AI Dependency

**NyayaSetu does NOT rely on any external AI APIs.**

All processing is performed locally using:
- Rule-based NLP (regex pattern matching)
- Deterministic keyword extraction
- Confidence scoring based on field completeness

This ensures:
- ✅ No sensitive court data ever leaves the system
- ✅ Full data privacy — compliant with government data handling norms
- ✅ No API keys, no internet dependency, no subscription cost
- ✅ Works completely offline on a government intranet
- ✅ Every AI decision is fully auditable and explainable

> Judges and evaluators: there is **no OpenAI, Gemini, or any LLM** involved.
> Every output is derived directly from the text of the uploaded judgment.

---

## 🎨 Design Philosophy

The UI follows **NIC / e-Governance portal standards**:

| Rule | Implementation |
|---|---|
| Light theme only | Background `#f8fafc`, cards white |
| Deep blue primary | `#1e3a8a` — official government blue |
| No neon / glassmorphism | Clean borders, subtle shadows |
| High readability | Inter font, 14–16px body text |
| Clear status signals | Green = Approved, Red = Rejected, Yellow = Pending |
| Trustworthy | AI disclaimer banners, confidence scores |

---

## 🗄️ Database Schema

```sql
CREATE TABLE verified_records (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    case_title         TEXT,
    date_of_order      TEXT,
    parties            TEXT,
    directions         TEXT,     -- JSON array
    timeline           TEXT,
    action_type        TEXT,     -- Compliance / Appeal / Informational
    action             TEXT,
    department         TEXT,
    deadline           TEXT,
    priority           TEXT,     -- High / Medium / Low
    confidence         INTEGER,
    status             TEXT,     -- approved / rejected / edited
    completion_status  TEXT,     -- pending / completed / overdue
    reviewer_notes     TEXT,
    source_text        TEXT,
    justification      TEXT,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 How to Run

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Tesseract OCR (optional, for images) | 5.x |

> **Tesseract** must be installed separately for image/scanned PDF support.  
> Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki  
> After install, add to PATH.

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/NyayaSetu.git
cd NyayaSetu
```

---

### 2️⃣ Start the Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend starts at: **http://localhost:8000**  
API docs available at: **http://localhost:8000/docs**

> The SQLite database (`nyayasetu.db`) is created automatically on first startup.

---

### 3️⃣ Start the Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app opens at: **http://localhost:3000**

---

### 4️⃣ Test the System

**Option A — Use the Demo (Recommended)**
1. Go to **http://localhost:3000**
2. Click **"🔍 Load Demo"** — loads a pre-built judgment
3. Watch the pipeline: Upload → Summary → Extract → Plan
4. Click **"Proceed to Verification →"**
5. Review the AI output, then click **"✓ Approve Plan"**
6. Go to **Dashboard** to see the verified record

**Option B — Upload Your Own PDF**
1. Click the upload area or drag a `.pdf` / `.docx` / `.txt` file
2. Click **"📤 Process Document"**
3. Verify and approve the output

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/upload-pdf` | Upload document (PDF/DOCX/TXT/Image) |
| `GET` | `/demo-judgment` | Load pre-built demo judgment |
| `POST` | `/summarize` | Generate plain-English summary |
| `POST` | `/extract-data` | Extract structured metadata |
| `POST` | `/generate-action-plan` | Generate action plan |
| `POST` | `/verify` | Submit human verification decision |
| `GET` | `/dashboard` | Get all approved records + stats |
| `PUT` | `/records/{id}/status` | Update completion status |
| `DELETE` | `/records/{id}` | Delete a record |

---

## 🔮 Future Roadmap

| Feature | Status |
|---|---|
| Multi-language support (Hindi, Telugu…) | Planned |
| LLM integration (Gemini / GPT) for better summaries | Optional |
| User authentication (NextAuth.js) | Planned |
| Docker + docker-compose deployment | Planned |
| Email notifications for deadlines | Planned |
| Export to PDF / Excel | Planned |
| Bulk judgment upload | Planned |

---

## 👨‍⚖️ Use Cases

1. **RTI Compliance** — Track information requests ordered by courts
2. **Environmental Enforcement** — Monitor pollution control orders
3. **Land Acquisition** — Track compensation payment orders
4. **Service Matters** — Monitor reinstatement / salary orders
5. **Consumer Cases** — Track refund / penalty payment orders

---

## ⚠️ Important Notes

- This system is a **decision support tool**, not an automated execution system
- All AI outputs require **human approval** before being saved
- No judgment text is sent to any external server — everything is **processed locally**
- The AI confidence score indicates extraction quality, not legal correctness
- Always verify the AI summary against the original judgment before acting

---

## 📄 License

MIT License — Free to use, modify, and deploy for government and educational purposes.

---

*Built for India's legal-tech ecosystem — making court compliance accessible to every government officer.*
