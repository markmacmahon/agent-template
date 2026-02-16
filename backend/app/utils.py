"""Shared backend utilities."""

from __future__ import annotations

import base64
import json
from datetime import datetime
from typing import Any, Callable, Mapping, Sequence
from uuid import UUID

from fastapi import HTTPException
from fastapi.routing import APIRoute
from sqlalchemy import and_, or_
from sqlalchemy.sql import ColumnElement


ERROR_INVALID_CURSOR = "ERROR_INVALID_CURSOR"


def simple_generate_unique_route_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


def encode_cursor(payload: Mapping[str, Any]) -> str:
    """Serialize cursor payload to a URL-safe base64 string."""
    serializable: dict[str, Any] = {}
    for key, value in payload.items():
        if isinstance(value, datetime):
            serializable[key] = value.isoformat()
        elif isinstance(value, UUID):
            serializable[key] = str(value)
        else:
            serializable[key] = value
    raw = json.dumps(serializable)
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")


def decode_cursor(
    value: str, schema: Mapping[str, Callable[[Any], Any]]
) -> dict[str, Any]:
    """Decode cursor payload and coerce values via schema mapping."""
    try:
        raw = base64.urlsafe_b64decode(value.encode("utf-8")).decode("utf-8")
        data = json.loads(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail=ERROR_INVALID_CURSOR) from exc

    parsed: dict[str, Any] = {}
    try:
        for key, caster in schema.items():
            parsed[key] = caster(data[key])
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=ERROR_INVALID_CURSOR) from exc

    return parsed


def parse_datetime(value: str) -> datetime:
    """Parse ISO8601 string into datetime."""
    return datetime.fromisoformat(value)


def parse_uuid(value: str) -> UUID:
    """Parse string into UUID."""
    return UUID(value)


def build_desc_pagination_filter(
    columns: Sequence[ColumnElement], values: Sequence[Any]
) -> ColumnElement:
    """Build (OR-of-ANDs) clause for tuple DESC pagination."""
    if len(columns) != len(values):
        raise ValueError("columns and values must align for pagination")

    clauses = []
    for idx, column in enumerate(columns):
        prefix = [columns[j] == values[j] for j in range(idx)]
        clause = and_(*prefix, column < values[idx])
        clauses.append(clause)

    return or_(*clauses)
