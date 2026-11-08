# SneakyToS

SneakyToS compares two versions of a privacy policy and explains detected changes that may affect a user's privacy. It combines clause segmentation and semantic alignment with event validation, privacy feature extraction, natural language inference (NLI), and a rules based impact classifier.

The repository contains the policy analysis research work and a FastAPI backend that a frontend can integrate with. The frontend is a separate deliverable; the backend contract and local integration steps are documented below and in [`docs/api_handover.md`](docs/api_handover.md).

## What the engine does

Given an old and new TXT or text based PDF policy, the engine:

1. Extracts and normalizes policy text.
2. Segments each policy into clauses.
3. Semantically aligns corresponding clauses and detects additions, deletions, modifications, and restructures.
4. Validates detected events and skips privacy classification for invalid events.
5. Extracts privacy related features and interprets changes in sharing, recipients, retention, and modality.
6. Runs NLI for paired clause changes.
7. Produces a privacy impact, explanation, evidence, facets, and confidence where the event is valid.

Privacy impact labels are:

| Label | Meaning |
|---|---|
| `PRIVACY_WORSE` | The new text appears to expand data use or weaken a stated protection. |
| `PRIVACY_BETTER` | The new text appears to narrow data use or strengthen a stated protection. |
| `NO_PRIVACY_EFFECT` | No material privacy effect was identified. |
| `UNCLEAR` | Available text does not support a reliable direction. |

These are analysis results, not legal advice or a guarantee that every policy change has been found. Keep `UNCLEAR` visible in the frontend. A `VALID` event means the text passed local quality checks; it does not mean the classification is certain.

## Backend quick start

### Requirements

- Python 3.10 or newer.
- Internet access the first time the service loads its Hugging Face models.
- Enough memory and disk space for PyTorch and both language models. CPU inference works but can take time; a CUDA enabled PyTorch installation can use a compatible GPU.

### Install and start

From the repository root, create and activate a virtual environment, then install the API dependencies:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-api.txt
$env:PYTHONPATH = "src"
uvicorn sneakytos.api:app --host 127.0.0.1 --port 8000
```

On macOS or Linux, activate `.venv` with `source .venv/bin/activate`, set `PYTHONPATH=src`, then run the same `uvicorn` command. Model weights are loaded once during application startup and cached by Hugging Face. The first launch can take a while; the API begins serving after model initialization completes.

Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for FastAPI's interactive documentation. Stop the server with Ctrl+C.

### Run the tests

Install `requirements-dev.txt` instead of `requirements-api.txt` if you also want pytest. From the repository root:

```powershell
$env:PYTHONPATH = "src"
python -m pytest -v
```

The regression suite is designed to run without downloading model weights; alignment tests replace the encoder with a deterministic test double. Starting the API loads the real models and needs the model cache or network access.

The default models are `sentence-transformers/all-MiniLM-L6-v2` for clause alignment and `cross-encoder/nli-deberta-v3-base` for NLI on paired changes.

## Frontend integration

The frontend development server can run on `http://localhost:5173` or `http://127.0.0.1:5173`; both are allowed by the backend CORS policy.

For another frontend origin, set `SNEAKYTOS_CORS_ORIGINS` to a comma separated allowlist before starting Uvicorn. For example, `$env:SNEAKYTOS_CORS_ORIGINS = "http://localhost:3000"` in PowerShell. Avoid `*` when credentials are enabled.

### Available endpoints

| Method and route | Purpose |
|---|---|
| `GET /health` | Process health response. It does not independently confirm model readiness. |
| `POST /api/v1/compare` | Compare two uploaded policy files and return the analysis JSON. |
| `GET /docs` | Interactive API docs provided by FastAPI. |

`POST /api/v1/compare` accepts `multipart/form-data` with two required file parts:

| Field | Accepted extensions | Maximum size |
|---|---|---|
| `old_policy` | `.txt`, `.pdf` | 20 MiB |
| `new_policy` | `.txt`, `.pdf` | 20 MiB |

Browser example:

```javascript
const form = new FormData();
form.append("old_policy", oldFile);
form.append("new_policy", newFile);

const response = await fetch("http://127.0.0.1:8000/api/v1/compare", {
  method: "POST",
  body: form,
});

const result = await response.json();
if (!response.ok) {
  throw new Error(result.detail ?? "Policy comparison failed.");
}
```

Do not set the multipart `Content-Type` header manually; the browser adds the required boundary. Keep a loading state during comparison because model inference can take time, prevent accidental duplicate submits, and show retryable errors.

The response has `old_policy` and `new_policy` metadata, a `summary`, and a `changes` array. Each change provides:

- `change_id`, `change_type`, `event_validity`, `is_valid`, and `validation_reason`.
- `before`: the aligned event, including old/new clause text and similarity/change metrics.
- `nli`, `privacy_features`, and `privacy_interpretation` supporting details (nullable when not applicable).
- `classification`: impact label, confidence, rationale, evidence, facets, and rules used (nullable for invalid events).
- `privacy_impact`: a convenient top level copy of the classification label.

Use `summary.privacy_impact_counts` for the overview counts. Invalid events remain in `changes` so the frontend can explain why classification was skipped. Identical aligned clauses are omitted. The detailed contract and a complete example are in [`docs/api_handover.md`](docs/api_handover.md).

### Current API boundaries

The backend currently has no authentication, policy history, database persistence, separate upload endpoint, report export, or production deployment configuration. It accepts text based PDFs; scanned PDFs that require OCR are rejected as having no extractable text. CORS defaults to the two local frontend origins above and can be overridden with `SNEAKYTOS_CORS_ORIGINS`. There is no published production base URL.

## Repository map

```text
src/sneakytos/
  api.py                  FastAPI application and upload endpoint
  analysis_pipeline.py    End to end validation and analysis orchestration
  pipeline.py             Policy ingestion and segmentation workflow
  ingestion/parser.py     TXT/PDF extraction and text normalization
  segmentation/           Clause segmentation
  alignment/              Semantic clause matching and change detection
  validation/             Event quality checks
  features/               Privacy feature extraction and interpretation
  nli/                    NLI model wrapper
  classification/          Rules based impact labels and explanations
docs/
  api_handover.md         Request, response, errors, and integration details
data/
  annotations/            Research annotation and alignment audit materials
  processed/              Policy version and comparison research outputs
notebooks/                Dataset exploration and baseline research
scripts/                  Research data preparation and quality scripts
test_data/                Small policy examples and regression fixtures
```

## Research context

The research component investigates privacy policy evolution as a temporal semantic permission delta. The initial scope includes data collection, use, sharing, transfer, retention, user control, consent, security, and selected sensitive data categories. Notebooks, processed policy version data, annotations, and scripts support exploration and evaluation; they are not required to run the API.

## Validation status and next work

The local regression suite currently passes 21 tests. TXT upload and a generated text based PDF were also exercised through the API locally. This does not establish production readiness, OCR support, broad real world PDF reliability, load capacity, or security readiness. Before deployment, configure origins and secrets for the target environment, add operational monitoring and request limits, run representative adversarial policy pairs, and evaluate the service under expected load.

For frontend work, start with the compare upload flow, summary counts, change explorer, and a detail view that displays before/after text, evidence, confidence, validation status, and `UNCLEAR` faithfully.
