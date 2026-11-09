# SneakyToS 🛡️⚖️

**SneakyToS** is an automated, forensic privacy-policy change detection and impact analysis platform. It analyzes two chronological versions of a privacy policy (Baseline vs. Revised) to detect subtle, undisclosed, or expansive modifications to privacy terms.

Combining dense clause embeddings, semantic alignment, event-quality validation, natural language inference (NLI), and a rules-based privacy impact classifier, SneakyToS translates raw legal diffs into actionable, forensic privacy risk assessments.

The project pairs an end-to-end **NLP/ML backend pipeline** built with FastAPI and Hugging Face Transformers with a modern, high-fidelity **interactive frontend** designed with Google Stitch and built using React, TypeScript, and Tailwind CSS.

---

## 📑 Table of Contents

- [What SneakyToS Does](#-what-sneakytos-does)
- [System Architecture & Pipeline](#-system-architecture--pipeline)
- [Prerequisites](#-prerequisites)
- [Running the Project](#-running-the-project)
  - [1. Running Backend & Frontend Together](#1-running-backend--frontend-together-recommended)
  - [2. Running the Backend Separately](#2-running-the-backend-separately)
  - [3. Running the Frontend Separately](#3-running-the-frontend-separately)
- [Core Application Screens](#-core-application-screens)
- [API Contract & Integration](#-api-contract--integration)
- [Repository Structure](#-repository-structure)
- [Authors & Credits](#-authors--credits)
- [Collaboration & Inquiries](#-collaboration--inquiries)
- [License & Disclaimer](#-license--disclaimer)

---

## 🎯 What SneakyToS Does

When companies update their Terms of Service or Privacy Policies, changes are often silent, opaque, or bury expansive permissions inside complex legalese. SneakyToS solves this by automating policy comparison:

1. **Ingests Documents:** Parses plain text (`.txt`) and PDF (`.pdf`) documents, cleaning headers, footers, and page furniture.
2. **Clause Segmentation:** Normalizes text into sentence- and clause-level boundaries while tracking document position.
3. **Semantic Alignment:** Uses dense neural embeddings to align corresponding clauses between Baseline and Revised versions, identifying `MODIFIED`, `ADDED`, `DELETED`, and `RESTRUCTURED` clauses.
4. **Event Quality Validation:** Filters out boilerplate changes (e.g. corporate address updates, typo fixes, renumbering) to focus strictly on genuine legal and permission modifications.
5. **Feature Extraction & Interpretation:** Detects changes in data sharing, third-party disclosures, retention limits, tracking, and user consent mechanisms.
6. **Natural Language Inference (NLI):** Applies a cross-encoder NLI model to evaluate directional entailment, contradiction, and semantic shift between clause pairs.
7. **Privacy Impact Classification:** Categorizes changes into standardized audit labels:

| Privacy Impact Label | Meaning |
|---|---|
| `PRIVACY_WORSE` | The revision expands data collection, broadens sharing, extends retention, or weakens user control. |
| `PRIVACY_BETTER` | The revision narrows data use, introduces user opt-outs, shortens retention, or strengthens safeguards. |
| `NO_PRIVACY_EFFECT` | The modification represents cosmetic rephrasing or procedural updates with no material privacy delta. |
| `UNCLEAR` | Text modification is ambiguous or insufficient to assign a definitive directional impact. |

---

## ⚙️ System Architecture & Pipeline

```
[Baseline Policy] ───┐
                      ├──> Ingestion & Segmentation ──> Dense Embedding Alignment
[Revised Policy]  ───┘       (PyMuPDF & Parser)           (MiniLM-L6-v2)
                                                                 │
                                                                 ▼
[Forensic Audit Report] <── Rules-Based Impact <── NLI Model <── Event Validator
 (Interactive UI / PDF)       Classifier       (DeBERTa-v3)    (Filters Noise)
```

- **Sentence Transformers (`sentence-transformers/all-MiniLM-L6-v2`):** Computes dense semantic representations for clause matching across versions.
- **Cross-Encoder NLI (`cross-encoder/nli-deberta-v3-base`):** Evaluates semantic shift and directional entailment for paired modifications.
- **Rules-Based Forensic Classifier:** Synthesizes lexical features, semantic similarity, and NLI signals into human-readable explanations, evidence quotes, and confidence scores.

---

## 💻 Prerequisites

Ensure you have the following installed on your system:

- **Python 3.10 or newer** (with `pip` and `venv`)
- **Node.js 18.x or newer** (with `npm`)
- **Git**
- Adequate RAM (minimum 8 GB recommended) for running local NLP transformer models.

---

## 🚀 Running the Project

### 1. Running Backend & Frontend Together (Recommended)

To run the complete system locally, launch the backend and frontend servers in two separate terminal windows:

#### Terminal 1 — Backend API Server:

**On Windows (PowerShell):**
```powershell
# 1. Create and activate Python virtual environment
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Upgrade pip and install API dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements-api.txt

# 3. Set Python path and start the FastAPI server
$env:PYTHONPATH = "src"
uvicorn sneakytos.api:app --host 127.0.0.1 --port 8000 --reload
```

**On macOS / Linux:**
```bash
# 1. Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Upgrade pip and install API dependencies
pip install --upgrade pip
pip install -r requirements-api.txt

# 3. Set Python path and start the FastAPI server
export PYTHONPATH="src"
uvicorn sneakytos.api:app --host 127.0.0.1 --port 8000 --reload
```

> **Note:** On first startup, Hugging Face will download the required transformer models (`all-MiniLM-L6-v2` and `nli-deberta-v3-base`). Once loaded, the API will log that it is listening on `http://127.0.0.1:8000`.

#### Terminal 2 — Frontend Application:

```bash
# 1. Navigate to the frontend directory
cd web

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

The frontend application will start and be accessible at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

### 2. Running the Backend Separately

You can test and interact with the FastAPI backend independently without the frontend.

1. Activate your virtual environment and install dependencies:
   ```bash
   pip install -r requirements-api.txt
   ```
2. Start the Uvicorn server:
   ```powershell
   # Windows PowerShell
   $env:PYTHONPATH = "src"
   uvicorn sneakytos.api:app --host 127.0.0.1 --port 8000 --reload
   ```
   ```bash
   # macOS / Linux
   export PYTHONPATH="src"
   uvicorn sneakytos.api:app --host 127.0.0.1 --port 8000 --reload
   ```
3. **Interactive Swagger Documentation:** Open **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)** to test the `/api/v1/compare` endpoint interactively with file uploads.
4. **Health Check:** Confirm the service is active at **[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)**.

#### Running Backend Automated Tests:
```powershell
$env:PYTHONPATH = "src"
python -m pytest -v
```
The test suite validates clause segmentation, similarity scoring, event validation, and API request handling.

---

### 3. Running the Frontend Separately

The frontend can be built and run standalone using mock or real backend data:

1. Navigate to the `web/` directory:
   ```bash
   cd web
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (optional, defaults to `http://127.0.0.1:8000`):
   Create a `.env` file inside `web/`:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```
   This performs a full TypeScript check (`tsc -b`) and bundles assets using Vite.

---

## 🖥️ Core Application Screens

- **New Comparison / Upload:** Drag-and-drop dual document uploader supporting `.txt` and `.pdf` files up to 20 MB each.
- **Comparison Workspace:** Synchronized, side-by-side clause reading pane with color-coded diff highlights, section hierarchy resolution, and instant search filtering.
- **Forensic Discrepancy Ledger (`/changes`):** Drill-down analysis cards detailing every detected change, semantic similarity percentage, NLI entailment distribution, matched lexical evidence, and explanation rationales.
- **Privacy Impact Audit Report (`/report`):** Executive-level summary with visual risk distributions, facet breakdowns (data sharing, retention, user consent), and a print-ready export format.

---

## 🔌 API Contract & Integration

### `POST /api/v1/compare`
Compares two policy documents via `multipart/form-data`:

- `old_policy`: Baseline document (`.txt` or `.pdf`, max 20 MB)
- `new_policy`: Revised document (`.txt` or `.pdf`, max 20 MB)

#### Example Request (cURL):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/compare" \
  -F "old_policy=@baseline_policy.txt" \
  -F "new_policy=@revised_policy.txt"
```

#### Response Summary:
```json
{
  "old_policy": { "filename": "baseline_policy.txt", "clause_count": 42 },
  "new_policy": { "filename": "revised_policy.txt", "clause_count": 48 },
  "summary": {
    "total_changes": 12,
    "valid_changes": 9,
    "invalid_changes": 3,
    "privacy_impact_counts": {
      "PRIVACY_WORSE": 4,
      "PRIVACY_BETTER": 2,
      "NO_PRIVACY_EFFECT": 2,
      "UNCLEAR": 1
    }
  },
  "changes": [
    {
      "change_id": "chg_00001",
      "change_type": "MODIFIED",
      "event_validity": "GENUINE_CHANGE",
      "privacy_impact": "PRIVACY_WORSE",
      "classification": {
        "rationale": "Expanded third-party syndication without opt-out consent.",
        "evidence": ["share telemetry with marketing partners"],
        "confidence": 0.89
      }
    }
  ]
}
```

---

## 📂 Repository Structure

```text
SneakyToS/
├── src/sneakytos/             # Core Backend NLP & API Engine
│   ├── api.py                 # FastAPI application, CORS, and upload endpoints
│   ├── analysis_pipeline.py   # Multi-stage comparison & classification orchestrator
│   ├── pipeline.py            # Text extraction, normalization, and clause segmentation
│   ├── ingestion/             # PyMuPDF parser and text sanitizers
│   ├── segmentation/          # Clause-level boundary segmenter
│   ├── alignment/             # Dense embedding clause aligner
│   ├── validation/            # Event-authenticity and boilerplate filter
│   ├── features/              # Privacy facet extraction (retention, sharing, tracking)
│   ├── nli/                   # DeBERTa-v3 cross-encoder NLI wrapper
│   └── classification/         # Rules-based privacy impact engine
├── web/                       # Modern Frontend Web Application
│   ├── src/
│   │   ├── components/        # Reusable UI components, badges, layout
│   │   ├── context/           # React Comparison Context & state management
│   │   ├── pages/             # Workspace, Discrepancy Ledger, Audit Report
│   │   ├── services/          # Axios API service layer and fallbacks
│   │   └── utils/             # Section heading resolver & text utilities
│   ├── package.json           # Frontend dependencies & build scripts
│   └── vite.config.ts         # Vite build configuration
├── docs/                      # Technical API handover & integration documents
├── requirements-api.txt       # Production API dependencies
├── requirements-dev.txt       # Development & PyTest dependencies
└── README.md                  # Project overview and run guide
```

---

## 👥 Authors & Credits

SneakyToS was designed, engineered, and developed by:

- **Arjun Haridas**
- **Dany Binu Luke**

---

## 🤝 Collaboration & Inquiries

We welcome feedback, suggestions, and research collaboration! Whether you are interested in:
- Legal-tech applications and NLP research on automated contract analysis
- Improving heuristic heading extraction for unstructured PDFs
- Expanding multilingual and cross-jurisdictional privacy policy benchmarks
- Contributing to the UI or fine-tuning specialized domain models

Please feel free to connect, open an issue, or reach out to us:
- **Arjun Haridas & Dany Binu Luke**
- Contact directly via GitHub Issues or connect for future research and technical collaboration!

---

## ⚖️ Disclaimer

*SneakyToS is an automated forensic analysis tool intended for research, informational, and transparency purposes. The classifications and explanations generated do not constitute formal legal advice.*
