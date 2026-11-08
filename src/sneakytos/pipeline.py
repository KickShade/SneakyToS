
from dataclasses import dataclass
from pathlib import Path
from typing import List

from sneakytos.ingestion.parser import extract_policy
from sneakytos.segmentation import Clause, segment_text


@dataclass
class ProcessedPolicy:
    filename: str
    file_type: str
    version: str
    character_count: int
    word_count: int
    clauses: List[Clause]


def process_policy(
    file_path: str,
    version: str = "policy",
) -> ProcessedPolicy:
    """
    Complete policy processing workflow.

    1. Extract policy text from TXT/PDF.
    2. Normalize extracted text.
    3. Segment policy into structured clauses.
    4. Return document metadata and clauses.
    """

    path = Path(file_path)

    # Extract and normalize document text.
    policy_text = extract_policy(str(path))

    # Segment the extracted text.
    clauses = segment_text(
        policy_text,
        version=version,
    )

    return ProcessedPolicy(
        filename=path.name,
        file_type=path.suffix.lower().replace(".", ""),
        version=version,
        character_count=len(policy_text),
        word_count=len(policy_text.split()),
        clauses=clauses,
    )
