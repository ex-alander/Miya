from __future__ import annotations

import re
from typing import Annotated, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.deck import Deck
from app.models.user import User
from app.schemas.import_export import (
    ImportApplyRequest,
    ImportApplyResponse,
    ImportExportHistoryResponse,
    ImportPreviewResponse,
)
from app.services.deck_import_export import (
    apply_import,
    build_import_preview_for_payload,
    build_preview_response,
    export_deck_as_apkg,
    export_deck_as_markdown,
    export_deck_as_miya_json,
    export_deck_as_pdf,
    get_history,
    parse_miya_apkg_bytes,
    parse_miya_json_bytes,
)


router = APIRouter()


@router.post("/import/preview", response_model=ImportPreviewResponse)
async def import_preview(
    files: List[UploadFile] = File(default=[]),
    json_text: str | None = Form(default=None),
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """Build preview of decks/cards to be imported from uploaded files and/or raw JSON."""
    previews = []

    if json_text:
        try:
            payload = parse_miya_json_bytes(json_text.encode("utf-8"))
        except Exception as e:  # pragma: no cover - defensive
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")
        previews.append(build_import_preview_for_payload(db, current_user, payload, "inline-json"))

    for upload in files:
        data = await upload.read()
        name = upload.filename or "upload"
        try:
            lower = name.lower()
            if lower.endswith(".json"):
                payload = parse_miya_json_bytes(data)
            elif lower.endswith(".apkg"):
                payload = parse_miya_apkg_bytes(data)
            else:
                raise ValueError("Unsupported file type. Only .json and .apkg are supported.")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:  # pragma: no cover - defensive
            raise HTTPException(status_code=400, detail=f"Failed to parse file {name}: {e}")

        previews.append(build_import_preview_for_payload(db, current_user, payload, name))

    if not previews:
        raise HTTPException(status_code=400, detail="No files or JSON provided.")

    return build_preview_response(previews)


@router.post("/import/apply", response_model=ImportApplyResponse)
def import_apply(
    request: ImportApplyRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Apply import based on preview selection."""
    try:
        return apply_import(db, current_user, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/export/{deck_id}")
def export_deck(
    deck_id: int,
    format: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Export a deck in one of supported formats: json, md, pdf, apkg."""
    deck = db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck.user_id != current_user.id and not deck.is_public:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    format_lower = format.lower()
    # Header values must be encodable in latin-1. Use only ASCII for Content-Disposition.
    raw_title = (deck.title or "").strip() or f"deck_{deck.id}"
    filename_base = "".join(
        c if ord(c) < 128 and c not in '\\/"\'*?<>|' else "_"
        for c in raw_title
    )
    filename_base = re.sub(r"_+", "_", filename_base).strip("_") or f"deck_{deck.id}"

    if format_lower == "json":
        content = export_deck_as_miya_json(db, deck)
        media_type = "application/json"
        ext = "json"
    elif format_lower == "md" or format_lower == "markdown":
        text = export_deck_as_markdown(db, deck)
        content = text.encode("utf-8")
        media_type = "text/markdown; charset=utf-8"
        ext = "md"
    elif format_lower == "pdf":
        content = export_deck_as_pdf(db, deck)
        media_type = "application/pdf"
        ext = "pdf"
    elif format_lower == "apkg":
        content = export_deck_as_apkg(db, deck)
        media_type = "application/vnd.anki.package"
        ext = "apkg"
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    # Log export (count cards explicitly to avoid lazy loading issues)
    from app.models.import_export_log import ImportExportLog
    from sqlalchemy import select, func
    from app.models.card import Card

    card_count = db.scalar(select(func.count(Card.id)).where(Card.deck_id == deck.id)) or 0

    log = ImportExportLog(
        user_id=current_user.id,
        deck_id=deck.id,
        action="export",
        format=format_lower,
        total_cards=card_count,
        details=f"Exported deck in format {format_lower}",
    )
    db.add(log)
    db.commit()

    # Content-Disposition must be latin-1 encodable: use ASCII-only filename
    disposition = f'attachment; filename="{filename_base}.{ext}"'
    headers = {"Content-Disposition": disposition}
    return Response(content=content, media_type=media_type, headers=headers)


@router.get("/history", response_model=ImportExportHistoryResponse)
def import_export_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get history of import/export actions for current user."""
    return get_history(db, current_user)

