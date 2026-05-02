from __future__ import annotations

import io
import json
import logging
import os
import zipfile
from typing import Iterable

import genanki
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.deck import Deck
from app.models.import_export_log import ImportExportLog
from app.schemas.import_export import (
    ImportApplyDeck,
    ImportApplyRequest,
    ImportApplyResponse,
    ImportApplyResult,
    ImportDeckPreview,
    ImportPreviewResponse,
    ImportExportHistoryItem,
    ImportExportHistoryResponse,
    MiyaDeckPayload,
)
from app.models.user import User


logger = logging.getLogger(__name__)

# Cached font names for PDF (Cyrillic/Unicode support)
_PDF_FONT_NORMAL: str | None = None
_PDF_FONT_BOLD: str | None = None


def _register_pdf_fonts() -> tuple[str, str]:
    """Register Source Serif Pro fonts for Cyrillic/Unicode PDF output. Fallback to DejaVu/Helvetica if not found."""
    global _PDF_FONT_NORMAL, _PDF_FONT_BOLD
    if _PDF_FONT_NORMAL is not None:
        return _PDF_FONT_NORMAL, _PDF_FONT_BOLD

    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fonts_dir = os.path.join(app_dir, "fonts")
    candidates = [
        # ПРИОРИТЕТ 1: Новые фирменные шрифты Miya-Uni (Source Serif Pro)
        (os.path.join(fonts_dir, "SourceSerifPro-Regular.ttf"), os.path.join(fonts_dir, "SourceSerifPro-Bold.ttf")),
        # ПРИОРИТЕТ 2: Стандартные резервные шрифты (если Source Serif Pro не найден)
        (os.path.join(fonts_dir, "DejaVuSans.ttf"), os.path.join(fonts_dir, "DejaVuSans-Bold.ttf")),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/usr/share/fonts/TTF/DejaVuSans.ttf", "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"),
    ]
    
    for path_regular, path_bold in candidates:
        if os.path.isfile(path_regular):
            try:
                # Определяем имя шрифта на основе пути
                if "SourceSerifPro" in path_regular:
                    font_name = "SourceSerifPro"
                    bold_name = "SourceSerifPro-Bold"
                else:
                    font_name = "DejaVuSans"
                    bold_name = "DejaVuSans-Bold"
                
                pdfmetrics.registerFont(TTFont(font_name, path_regular))
                if os.path.isfile(path_bold):
                    pdfmetrics.registerFont(TTFont(bold_name, path_bold))
                else:
                    pdfmetrics.registerFont(TTFont(bold_name, path_regular))
                
                _PDF_FONT_NORMAL = font_name
                _PDF_FONT_BOLD = bold_name
                return _PDF_FONT_NORMAL, _PDF_FONT_BOLD
            except Exception as e:
                logger.warning("Failed to register fonts from %s: %s", path_regular, e)
    
    # Финальный запасной вариант (системный Helvetica)
    _PDF_FONT_NORMAL = "Helvetica"
    _PDF_FONT_BOLD = "Helvetica-Bold"
    return _PDF_FONT_NORMAL, _PDF_FONT_BOLD


def _split_tags(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    return ",".join(t.strip() for t in tags if t.strip())


def _join_tags(tags_str: str | None) -> list[str] | None:
    if not tags_str:
        return None
    return [t.strip() for t in tags_str.split(",") if t.strip()]


def _detect_duplicates(db: Session, user: User, deck_meta, cards) -> ImportDeckPreview:
    # Duplicate check: same front_content within any of user's decks
    fronts = [c.front_content for c in cards]
    if not fronts:
        from app.schemas.import_export import ImportCardPreview  # local import to avoid cycle

        return ImportDeckPreview(
            source_name=deck_meta.title,
            deck=deck_meta,
            cards=[],
            total_cards=0,
            duplicate_cards=0,
        )

    q = (
        select(Card.front_content)
        .join(Deck, Card.deck_id == Deck.id)
        .where(Deck.user_id == user.id, Card.front_content.in_(fronts))
    )
    existing_fronts = {row[0] for row in db.execute(q)}

    from app.schemas.import_export import ImportCardPreview

    preview_cards = []
    duplicates = 0
    for idx, card in enumerate(cards):
        is_dup = card.front_content in existing_fronts
        if is_dup:
            duplicates += 1
        preview_cards.append(
            ImportCardPreview(
                temp_id=idx,
                front_content=card.front_content,
                back_content=card.back_content,
                tags=card.tags,
                hint=card.hint,
                is_duplicate=is_dup,
                selected=False,  # Duplicates excluded by default, but can be enabled
            )
        )

    return ImportDeckPreview(
        source_name=deck_meta.title,
        deck=deck_meta,
        cards=preview_cards,
        total_cards=len(preview_cards),
        duplicate_cards=duplicates,
    )


def parse_miya_json_bytes(data: bytes) -> MiyaDeckPayload:
    raw = json.loads(data.decode("utf-8"))
    return MiyaDeckPayload.model_validate(raw)


def parse_miya_apkg_bytes(data: bytes) -> MiyaDeckPayload:
    with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
        try:
            with zf.open("miya.json") as f:
                payload = f.read()
        except KeyError:
            raise ValueError("Unsupported .apkg: missing miya.json manifest")
    return parse_miya_json_bytes(payload)


def build_import_preview_for_payload(
    db: Session,
    user: User,
    payload: MiyaDeckPayload,
    source_name: str,
) -> ImportDeckPreview:
    deck_meta = payload.deck
    preview = _detect_duplicates(db, user, deck_meta, payload.cards)
    preview.source_name = source_name
    return preview


def build_preview_response(items: Iterable[ImportDeckPreview]) -> ImportPreviewResponse:
    items_list = list(items)
    total_decks = len(items_list)
    total_cards = sum(i.total_cards for i in items_list)
    total_duplicates = sum(i.duplicate_cards for i in items_list)
    return ImportPreviewResponse(
        items=items_list,
        total_decks=total_decks,
        total_cards=total_cards,
        total_duplicates=total_duplicates,
    )


def apply_import(
    db: Session,
    user: User,
    req: ImportApplyRequest,
) -> ImportApplyResponse:
    results: list[ImportApplyResult] = []

    for deck_req in req.decks:
        deck_meta = deck_req.deck
        selected_cards = [c for c in deck_req.cards if c.selected]
        if not selected_cards:
            continue

        if deck_req.conflict_mode == "merge_into_existing" and deck_req.existing_deck_id:
            deck_obj = db.get(Deck, deck_req.existing_deck_id)
            if not deck_obj or deck_obj.user_id != user.id:
                raise ValueError("Existing deck not found or not owned by user")
        else:
            deck_obj = Deck(
                title=deck_meta.title,
                description=deck_meta.description,
                is_public=deck_meta.is_public,
                user_id=user.id,
                tags=_split_tags(deck_meta.tags),
            )
            db.add(deck_obj)
            db.flush()

        # Determine current max order_index
        q = select(Card.order_index).where(Card.deck_id == deck_obj.id).order_by(Card.order_index.desc())
        row = db.execute(q).first()
        base_index = row[0] + 1 if row and row[0] is not None else 0

        imported = 0
        skipped = 0
        for offset, card_prev in enumerate(selected_cards):
            # Extra duplicate safety inside deck
            exists_q = select(Card.id).where(
                Card.deck_id == deck_obj.id,
                Card.front_content == card_prev.front_content,
            )
            if db.execute(exists_q).first():
                skipped += 1
                continue
            card_obj = Card(
                deck_id=deck_obj.id,
                front_content=card_prev.front_content,
                back_content=card_prev.back_content,
                hint=card_prev.hint,
                order_index=base_index + offset,
                tags=_split_tags(card_prev.tags),
            )
            db.add(card_obj)
            imported += 1

        db.add(
            ImportExportLog(
                user_id=user.id,
                deck_id=deck_obj.id,
                action="import",
                format="json",
                total_cards=imported,
                details=f"Imported {imported} cards, skipped {skipped}",
            )
        )

        results.append(
            ImportApplyResult(
                deck_id=deck_obj.id,
                imported_cards=imported,
                skipped_duplicates=skipped,
            )
        )

    db.commit()
    return ImportApplyResponse(results=results)


def export_deck_as_miya_json(db: Session, deck: Deck) -> bytes:
    cards = db.scalars(select(Card).where(Card.deck_id == deck.id).order_by(Card.order_index, Card.id)).all()
    payload = {
        "deck": {
            "title": deck.title,
            "description": deck.description,
            "is_public": deck.is_public,
            "tags": _join_tags(deck.tags),
        },
        "cards": [
            {
                "front_content": c.front_content,
                "back_content": c.back_content,
                "tags": _join_tags(c.tags),
                "hint": c.hint,
            }
            for c in cards
        ],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def export_deck_as_markdown(db: Session, deck: Deck) -> str:
    cards = db.scalars(select(Card).where(Card.deck_id == deck.id).order_by(Card.order_index, Card.id)).all()
    lines: list[str] = []
    lines.append(f"# {deck.title}")
    if deck.description:
        lines.append("")
        lines.append(deck.description)
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Cards")
    lines.append("")

    for idx, c in enumerate(cards, start=1):
        lines.append(f"### Card {idx}")
        if c.tags:
            tags = ", ".join(_join_tags(c.tags) or [])
            if tags:
                lines.append(f"_Tags_: {tags}")
        if c.hint:
            lines.append(f"_Hint_: {c.hint}")
        lines.append("")
        lines.append("**Front**")
        lines.append("")
        lines.append(c.front_content)
        lines.append("")
        lines.append("**Back**")
        lines.append("")
        lines.append(c.back_content)
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def export_deck_as_pdf(db: Session, deck: Deck) -> bytes:
    font_normal, font_bold = _register_pdf_fonts()
    # Для Source Serif Pro используем обычный шрифт для наклонного текста
    font_oblique = font_normal

    cards = db.scalars(select(Card).where(Card.deck_id == deck.id).order_by(Card.order_index, Card.id)).all()
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def new_page():
        c.showPage()

    y = height - 72
    c.setFont(font_bold, 18)
    c.drawString(72, y, deck.title or "")
    y -= 24
    c.setFont(font_normal, 12)
    if deck.description:
        c.drawString(72, y, deck.description[:120])
        y -= 24

    for idx, card in enumerate(cards, start=1):
        if y < 144:
            new_page()
            y = height - 72
        c.setFont(font_bold, 14)
        c.drawString(72, y, f"Card {idx}")
        y -= 18
        if card.tags:
            tags = ", ".join(_join_tags(card.tags) or [])
            c.setFont(font_oblique, 10)
            c.drawString(72, y, f"Tags: {tags}")
            y -= 14
        if card.hint:
            c.setFont(font_oblique, 10)
            c.drawString(72, y, (card.hint or "")[:80])
            y -= 14
        c.setFont(font_bold, 12)
        c.drawString(72, y, "Front:")
        y -= 14
        c.setFont(font_normal, 11)  # Увеличил с 10 до 11 для лучшей читаемости
        for line in card.front_content.splitlines()[:8]:
            c.drawString(90, y, line[:100])
            y -= 13  # Увеличил межстрочный интервал
            if y < 144:
                new_page()
                y = height - 72
        c.setFont(font_bold, 12)
        c.drawString(72, y, "Back:")
        y -= 14
        c.setFont(font_normal, 11)  # Увеличил с 10 до 11 для лучшей читаемости
        for line in card.back_content.splitlines()[:8]:
            c.drawString(90, y, line[:100])
            y -= 13  # Увеличил межстрочный интервал
            if y < 144:
                new_page()
                y = height - 72
        y -= 20  # Увеличил отступ между карточками

    c.save()
    buffer.seek(0)
    return buffer.read()


def export_deck_as_apkg(db: Session, deck: Deck) -> bytes:
    cards = db.scalars(select(Card).where(Card.deck_id == deck.id).order_by(Card.order_index, Card.id)).all()
    # Basic model: front / back
    model_id = 1607392319
    deck_id = int(deck.id) if deck.id is not None else 1

    model = genanki.Model(
        model_id,
        "Miya Basic",
        fields=[{"name": "Front"}, {"name": "Back"}],
        templates=[
            {
                "name": "Card 1",
                "qfmt": "{{Front}}",
                "afmt": "{{Front}}<hr id=\"answer\">{{Back}}",
            }
        ],
    )

    anki_deck = genanki.Deck(deck_id, deck.title or f"Miya Deck {deck.id}")
    for c in cards:
        note = genanki.Note(
            model=model,
            fields=[c.front_content, c.back_content],
        )
        anki_deck.add_note(note)

    pkg = genanki.Package(anki_deck)

    # First, build standard .apkg into memory
    buffer = io.BytesIO()
    pkg.write_to_file(buffer)
    buffer.seek(0)

    # Then, reopen as zip and inject miya.json manifest
    miya_json = export_deck_as_miya_json(db, deck)
    in_bytes = buffer.getvalue()
    out_buffer = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(in_bytes), "r") as zin, zipfile.ZipFile(
        out_buffer, "w", zipfile.ZIP_DEFLATED
    ) as zout:
        for item in zin.infolist():
            with zin.open(item.filename) as src:
                zout.writestr(item, src.read())
        zout.writestr("miya.json", miya_json)

    out_buffer.seek(0)
    return out_buffer.read()


def get_history(db: Session, user: User) -> ImportExportHistoryResponse:
    rows = db.scalars(
        select(ImportExportLog).where(ImportExportLog.user_id == user.id).order_by(
            ImportExportLog.created_at.desc()
        )
    ).all()
    items = [
        ImportExportHistoryItem(
            id=row.id,
            deck_id=row.deck_id,
            action=row.action,  # type: ignore[arg-type]
            format=row.format,
            total_cards=row.total_cards,
            details=row.details,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return ImportExportHistoryResponse(items=items)