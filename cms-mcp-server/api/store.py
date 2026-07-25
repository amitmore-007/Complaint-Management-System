import requests
from typing import Dict, List, Optional

from models.auth import AuthPayload
from models.store import UpsertStorePayload, UpdateStoreManagersPayload

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers

_BASE = f"{SERVER_URL}/api/stores"


def list_stores(name: Optional[str], auth: AuthPayload) -> List[Dict]:
    try:
        token = auth["token"]
        params = {"name": name} if name else {}

        response = requests.get(_BASE, headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[store.list_stores] failed ({response.status_code}) | {response.text}")
            return []

        body = response.json()
        if name:
            store = body.get("store")
            return [store] if store else []

        return body.get("stores", [])
    except Exception as e:
        logger.error(f"[store.list_stores] exception: {e}")
        return []


def upsert_store(payload: UpsertStorePayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.post(f"{_BASE}/upsert", headers=_headers(token), json=payload)

        if response.status_code not in (200, 201):
            logger.error(f"[store.upsert_store] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("store", {})
    except Exception as e:
        logger.error(f"[store.upsert_store] exception: {e}")
        return {}


def update_store_managers(payload: UpdateStoreManagersPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        store_id = payload.get("storeId")

        response = requests.put(
            f"{_BASE}/{store_id}/managers", headers=_headers(token), json={"managers": payload.get("managers")}
        )

        if response.status_code != 200:
            logger.error(f"[store.update_store_managers] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("store", {})
    except Exception as e:
        logger.error(f"[store.update_store_managers] exception: {e}")
        return {}
