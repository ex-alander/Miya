from fastapi import APIRouter

from app.api.routes import achievements, ai, auth, cards, decks, import_export, mental_map, shop, study, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(decks.router, prefix="/decks", tags=["decks"])
api_router.include_router(mental_map.router, prefix="/mental-maps", tags=["mental-maps"])
api_router.include_router(cards.router, prefix="/cards", tags=["cards"])
api_router.include_router(study.router, prefix="/study", tags=["study"])
api_router.include_router(shop.router, prefix="/shop", tags=["shop"])
api_router.include_router(achievements.router, prefix="/achievements", tags=["achievements"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(import_export.router, prefix="/decks/import-export", tags=["import-export"])

