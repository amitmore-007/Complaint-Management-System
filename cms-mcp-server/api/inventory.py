import requests
from typing import Dict, List

from models.auth import AuthPayload
from models.inventory import (
    ListInventoryItemsPayload,
    CreateInventoryItemPayload,
    UpdateInventoryItemPayload,
    DeleteInventoryItemPayload,
)

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers

_BASE = f"{SERVER_URL}/api/admin/inventory"


def list_inventory_items(payload: ListInventoryItemsPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(_BASE, headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[inventory.list_inventory_items] failed ({response.status_code}) | {response.text}")
            return {"records": [], "pagination": {}, "summary": {}}

        body = response.json()
        return {
            "records": body.get("records", []),
            "pagination": body.get("pagination", {}),
            "summary": body.get("summary", {}),
        }
    except Exception as e:
        logger.error(f"[inventory.list_inventory_items] exception: {e}")
        return {"records": [], "pagination": {}, "summary": {}}


def get_stock_balance(auth: AuthPayload) -> List[Dict]:
    try:
        token = auth["token"]
        response = requests.get(f"{_BASE}/stock-balance", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[inventory.get_stock_balance] failed ({response.status_code}) | {response.text}")
            return []

        return response.json().get("balances", [])
    except Exception as e:
        logger.error(f"[inventory.get_stock_balance] exception: {e}")
        return []


def create_inventory_item(payload: CreateInventoryItemPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        body = {k: v for k, v in payload.items() if v is not None}

        response = requests.post(_BASE, headers=_headers(token), json=body)

        if response.status_code not in (200, 201):
            logger.error(f"[inventory.create_inventory_item] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("item", {})
    except Exception as e:
        logger.error(f"[inventory.create_inventory_item] exception: {e}")
        return {}


def update_inventory_item(payload: UpdateInventoryItemPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        item_id = payload.get("itemId")

        if not item_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "itemId" and v is not None}

        response = requests.put(f"{_BASE}/{item_id}", headers=_headers(token), json=body)

        if response.status_code != 200:
            logger.error(f"[inventory.update_inventory_item] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("item", {})
    except Exception as e:
        logger.error(f"[inventory.update_inventory_item] exception: {e}")
        return {}


def delete_inventory_item(payload: DeleteInventoryItemPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        item_id = payload.get("itemId")

        response = requests.delete(f"{_BASE}/{item_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[inventory.delete_inventory_item] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json()
    except Exception as e:
        logger.error(f"[inventory.delete_inventory_item] exception: {e}")
        return {}


def list_inventory_item_names(auth: AuthPayload) -> List[Dict]:
    # technician only — used to look up itemId values for billing/material picking
    try:
        token = auth["token"]
        response = requests.get(f"{SERVER_URL}/api/technician/inventory/items", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[inventory.list_inventory_item_names] failed ({response.status_code}) | {response.text}")
            return []

        return response.json().get("items", [])
    except Exception as e:
        logger.error(f"[inventory.list_inventory_item_names] exception: {e}")
        return []
