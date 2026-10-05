"""Lite Marketplace AI service (Flask).

Private service: only the Java API calls it, with the X-Internal-Key header. Endpoints:
    GET  /health
    POST /v1/product-writer   product title, description, caption, hashtags (photo optional)
    POST /v1/reply-drafts     three WhatsApp reply drafts for a customer message
    POST /v1/shop-chat        shopping assistant on the public shop page
    POST /v1/coach            sales insights and next steps
    POST /v1/broadcast        WhatsApp broadcast + Status text
"""
from __future__ import annotations

import hmac
import logging
from typing import Callable, Type

from flask import Blueprint, Flask, current_app, jsonify, request
from pydantic import BaseModel, ValidationError

from .config import Settings
from .features import Features
from .llm import LLM
from .schemas import BroadcastIn, CoachIn, ProductWriterIn, ReplyDraftsIn, ShopChatIn

bp = Blueprint("ai", __name__)


def features() -> Features:
    return current_app.extensions["features"]


@bp.before_request
def check_internal_key():
    if request.path == "/health":
        return None
    expected = current_app.config["SETTINGS"].internal_key
    if expected and not hmac.compare_digest(request.headers.get("X-Internal-Key", ""), expected):
        return jsonify(error="UNAUTHORIZED", message="Missing or wrong X-Internal-Key"), 401
    return None


@bp.get("/health")
def health():
    llm: LLM = features().llm
    return jsonify(status="ok", engine=llm.engine, model=llm.model())


def _endpoint(schema: Type[BaseModel], run: Callable[[Features, BaseModel], BaseModel]):
    def handler():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="BAD_REQUEST", message="Send a JSON object"), 400
        try:
            inp = schema.model_validate(payload)
        except ValidationError as e:
            first = e.errors()[0]
            where = ".".join(str(x) for x in first.get("loc", ()))
            return jsonify(error="VALIDATION", message=f"{where}: {first.get('msg')}"), 422
        return jsonify(run(features(), inp).model_dump())
    return handler


bp.add_url_rule("/v1/product-writer", "product_writer", _endpoint(ProductWriterIn, lambda f, i: f.product_writer(i)),
                methods=["POST"])
bp.add_url_rule("/v1/reply-drafts", "reply_drafts", _endpoint(ReplyDraftsIn, lambda f, i: f.reply_drafts(i)),
                methods=["POST"])
bp.add_url_rule("/v1/shop-chat", "shop_chat", _endpoint(ShopChatIn, lambda f, i: f.shop_chat(i)), methods=["POST"])
bp.add_url_rule("/v1/coach", "coach", _endpoint(CoachIn, lambda f, i: f.coach(i)), methods=["POST"])
bp.add_url_rule("/v1/broadcast", "broadcast", _endpoint(BroadcastIn, lambda f, i: f.broadcast(i)), methods=["POST"])


def create_app(settings: Settings | None = None) -> Flask:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = settings or Settings.from_env()
    app = Flask(__name__)
    app.config["SETTINGS"] = settings
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
    app.config["JSON_SORT_KEYS"] = False
    app.json.ensure_ascii = False
    app.json.sort_keys = False
    llm = LLM(settings)
    app.extensions["features"] = Features(llm)
    app.register_blueprint(bp)

    @app.errorhandler(413)
    def too_large(_):
        return jsonify(error="TOO_LARGE", message="Request is too large"), 413

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="NOT_FOUND", message="Not found"), 404

    @app.errorhandler(500)
    def server_error(_):
        return jsonify(error="SERVER_ERROR", message="Something went wrong"), 500

    logging.getLogger("ai").info("AI engine: %s (model: %s)", llm.engine, llm.model())
    return app
