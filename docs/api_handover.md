# SneakyToS API handover

This contract reflects `src/sneakytos/api.py` and `src/sneakytos/analysis_pipeline.py`.

## Run locally

From the repository root, install `requirements-api.txt`, then start the app:

```powershell
$env:PYTHONPATH = "src"
uvicorn sneakytos.api:app --reload --host 127.0.0.1 --port 8000
```

Interactive API docs are at `http://127.0.0.1:8000/docs`.

## `GET /health`

Returns HTTP 200 when the process responds:

```json
{"status":"healthy","service":"SneakyToS API"}
```

This is a process health check. It does not independently verify model readiness.

## `POST /api/v1/compare`

Send `multipart/form-data` with two required file parts:

| Field | Accepted file extensions | Limit |
|---|---|---|
| `old_policy` | `.txt`, `.pdf` | 20 MiB |
| `new_policy` | `.txt`, `.pdf` | 20 MiB |

Example:

```javascript
const form = new FormData();
form.append("old_policy", oldFile);
form.append("new_policy", newFile);
const response = await fetch("http://127.0.0.1:8000/api/v1/compare", {
  method: "POST",
  body: form,
});
const result = await response.json();
```

Do not set the multipart `Content-Type` header manually; the browser supplies its boundary.

### Success response

HTTP 200 JSON structure:

```json
{
  "old_policy": {
    "filename": "old.txt",
    "file_type": "txt",
    "version": "old",
    "character_count": 1200,
    "word_count": 210,
    "clause_count": 8
  },
  "new_policy": {
    "filename": "new.txt",
    "file_type": "txt",
    "version": "new",
    "character_count": 1280,
    "word_count": 225,
    "clause_count": 9
  },
  "summary": {
    "total_changes": 1,
    "valid_changes": 1,
    "invalid_changes": 0,
    "privacy_impact_counts": {
      "PRIVACY_WORSE": 1,
      "PRIVACY_BETTER": 0,
      "NO_PRIVACY_EFFECT": 0,
      "UNCLEAR": 0
    }
  },
  "changes": [
    {
      "change_id": "change_00001",
      "change_type": "MODIFIED",
      "event_validity": "VALID",
      "is_valid": true,
      "validation_reason": "No local event-quality issue detected.",
      "before": {
        "change_id": "change_00001",
        "change_type": "MODIFIED",
        "old_clause": {"text": "..."},
        "new_clause": {"text": "..."},
        "old_clauses": [{"text": "..."}],
        "new_clauses": [{"text": "..."}],
        "semantic_similarity": 0.91
      },
      "nli": {
        "change_id": "change_00001",
        "change_type": "MODIFIED",
        "old_to_new": {
          "entailment": 0.01,
          "contradiction": 0.02,
          "neutral": 0.97
        },
        "new_to_old": {
          "entailment": 0.97,
          "contradiction": 0.01,
          "neutral": 0.02
        },
        "model_name": "cross-encoder/nli-deberta-v3-base"
      },
      "privacy_features": {
        "change_id": "change_00001",
        "comparisons": {
          "collection": {
            "dimension": "collection",
            "old_values": ["identity"],
            "new_values": ["identity", "location"],
            "added": ["location"],
            "removed": [],
            "status": "ADDED",
            "evidence": [
              {
                "dimension": "collection",
                "feature": "location",
                "side": "new",
                "matched_text": "precise location"
              }
            ]
          }
        },
        "modality": {"old": ["collect"], "new": ["collect"]},
        "quantifiers": {"old": [], "new": []}
      },
      "privacy_interpretation": {
        "change_id": "change_00001",
        "signals": {
          "sharing_permission": {
            "old_value": "NOT_STATED",
            "new_value": "NOT_STATED",
            "direction": "NO_DETECTED_CHANGE",
            "evidence": {"old": [], "new": []},
            "explanation": "The sharing-language status is unchanged."
          }
        }
      },
      "classification": {
        "privacy_impact": "PRIVACY_WORSE",
        "confidence": 0.9,
        "confidence_level": "HIGH",
        "severity": "MEDIUM",
        "rationale": "...",
        "evidence": ["..."],
        "facets": ["collection"],
        "rules_fired": ["ADDED_DATA_CATEGORY"],
        "mixed": false,
        "event_validity": "VALID"
      },
      "privacy_impact": "PRIVACY_WORSE"
    }
  ]
}
```

`before` is the serialized alignment event, including clause objects and similarity/change metrics. Each clause includes `clause_id`, `section`, `text`, `position`, and `word_count`. NLI scores contain `entailment`, `contradiction`, and `neutral` probabilities for each direction. Feature comparisons include old/new values, additions/removals, status, and matched evidence. Interpretation signals carry old/new values, direction, evidence, and a short explanation. These objects are serialized dataclasses, so a comparison may contain more feature dimensions and signals than the abbreviated example. NLI is `null` for ADDED/DELETED events, and analysis fields may be `null` where they do not apply. Invalid events remain in `changes`, carry their `event_validity` and `validation_reason`, and have no classification or impact label. Identical aligned clauses are omitted from the change list.

Impact labels are `PRIVACY_WORSE`, `PRIVACY_BETTER`, `NO_PRIVACY_EFFECT`, and `UNCLEAR`. Frontend totals should use `summary.privacy_impact_counts`; do not infer certainty from a valid event or convert `UNCLEAR` into a directional result.

### Errors

Errors use FastAPI's JSON shape `{ "detail": "..." }`.

| HTTP | Meaning |
|---|---|
| 400 | Unsupported extension, empty upload, encrypted PDF, no extractable PDF text, or other `ValueError` input failure |
| 413 | Either upload exceeds 20 MiB |
| 422 | Required multipart field is missing or malformed |
| 500 | Unexpected PDF parsing, comparison, or model failure |

Show the returned `detail` as an actionable error, and allow retry. Comparisons run model inference and can take time; the frontend should keep a pending state and avoid duplicate submits.

## Browser integration

CORS allows `http://localhost:5173` and `http://127.0.0.1:5173` by default. Set `SNEAKYTOS_CORS_ORIGINS` to a comma separated allowlist of origins to override those defaults (for example, `https://app.example.com,https://staging.example.com`). There is no authentication, upload/history endpoint, report export, or production deployment contract in this implementation. The current service is suitable for local frontend integration; production readiness still requires deployment, load, security, and representative PDF validation.
