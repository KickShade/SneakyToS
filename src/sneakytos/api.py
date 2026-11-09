
from contextlib import asynccontextmanager
import os
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sneakytos.alignment import ClauseAligner
from sneakytos.analysis_pipeline import analyze_policy_pair
from sneakytos.nli import NLIAnalyzer


MAX_FILE_SIZE = 20 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".txt", ".pdf"}

nli_analyzer = None
clause_aligner = None


def _cors_origins() -> list[str]:
    configured = os.getenv("SNEAKYTOS_CORS_ORIGINS", "")
    if configured.strip():
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global nli_analyzer, clause_aligner

    # Load the NLI model once, not on every request.
    nli_analyzer = NLIAnalyzer()
    clause_aligner = ClauseAligner()

    yield

    nli_analyzer = None
    clause_aligner = None


app = FastAPI(
    title="SneakyToS API",
    description="Privacy policy change detection and impact analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "SneakyToS API",
    }


async def save_upload(upload: UploadFile, destination: Path):
    filename = upload.filename or "policy.txt"
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {extension}. Use TXT or PDF.",
        )

    content = await upload.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail=f"{filename} is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"{filename} exceeds the 20 MB limit.",
        )

    destination.write_bytes(content)


@app.post("/api/v1/compare")
async def compare_policies(
    old_policy: UploadFile = File(...),
    new_policy: UploadFile = File(...),
):
    try:
        with TemporaryDirectory(prefix="sneakytos_") as temp_dir:
            temp_path = Path(temp_dir)

            old_path = temp_path / (
                "old_policy" + Path(old_policy.filename or "old.txt").suffix.lower()
            )
            new_path = temp_path / (
                "new_policy" + Path(new_policy.filename or "new.txt").suffix.lower()
            )

            await save_upload(old_policy, old_path)
            await save_upload(new_policy, new_path)

            from anyio import to_thread

            def _run_comparison():
                return analyze_policy_pair(
                    str(old_path),
                    str(new_path),
                    nli_analyzer=nli_analyzer,
                    aligner=clause_aligner,
                )

            result = await to_thread.run_sync(_run_comparison)

            return result.to_dict()

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Policy comparison failed: {str(exc)}",
        )
