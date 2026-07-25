import requests
from typing import Dict, List

from models.auth import AuthPayload
from models.equipment import (
    CreateEquipmentPayload,
    UpdateEquipmentPayload,
    SubmitAssetRecordPayload,
    ListAssetRecordsPayload,
    GetAssetRecordPayload,
    UpdateAssetRecordPayload,
    DeleteAssetRecordPayload,
)

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers

_BASE = f"{SERVER_URL}/api/equipment"


def get_equipment_list(auth: AuthPayload) -> List[Dict]:
    try:
        token = auth["token"]
        response = requests.get(f"{_BASE}/list", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[equipment.get_equipment_list] failed ({response.status_code}) | {response.text}")
            return []

        return response.json().get("equipment", [])
    except Exception as e:
        logger.error(f"[equipment.get_equipment_list] exception: {e}")
        return []


def create_equipment(payload: CreateEquipmentPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.post(f"{_BASE}/create", headers=_headers(token), json=payload)

        if response.status_code not in (200, 201):
            logger.error(f"[equipment.create_equipment] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("equipment", {})
    except Exception as e:
        logger.error(f"[equipment.create_equipment] exception: {e}")
        return {}


def update_equipment(payload: UpdateEquipmentPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        equipment_id = payload.get("equipmentId")

        if not equipment_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "equipmentId" and v is not None}

        response = requests.put(f"{_BASE}/{equipment_id}", headers=_headers(token), json=body)

        if response.status_code != 200:
            logger.error(f"[equipment.update_equipment] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("equipment", {})
    except Exception as e:
        logger.error(f"[equipment.update_equipment] exception: {e}")
        return {}


def delete_equipment(equipment_id: str, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.delete(f"{_BASE}/{equipment_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[equipment.delete_equipment] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json()
    except Exception as e:
        logger.error(f"[equipment.delete_equipment] exception: {e}")
        return {}


def submit_asset_record(payload: SubmitAssetRecordPayload, auth: AuthPayload) -> Dict:
    # technician only
    try:
        token = auth["token"]
        response = requests.post(f"{_BASE}/records", headers=_headers(token), json=payload)

        if response.status_code not in (200, 201):
            logger.error(f"[equipment.submit_asset_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("record", {})
    except Exception as e:
        logger.error(f"[equipment.submit_asset_record] exception: {e}")
        return {}


def get_asset_records(payload: ListAssetRecordsPayload, auth: AuthPayload) -> Dict:
    # admin only — all asset records
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{_BASE}/records", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[equipment.get_asset_records] failed ({response.status_code}) | {response.text}")
            return {"records": [], "pagination": {}}

        body = response.json()
        return {"records": body.get("records", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[equipment.get_asset_records] exception: {e}")
        return {"records": [], "pagination": {}}


def get_my_asset_records(auth: AuthPayload, page: int = 1, limit: int = 10) -> Dict:
    # technician (paginated) or client (all, no pagination)
    try:
        token = auth["token"]
        role = auth["role"]

        if role == "technician":
            response = requests.get(
                f"{_BASE}/records/technician", headers=_headers(token), params={"page": page, "limit": limit}
            )
        elif role == "client":
            response = requests.get(f"{_BASE}/records/client", headers=_headers(token))
        else:
            return {"records": [], "pagination": {}}

        if response.status_code != 200:
            logger.error(f"[equipment.get_my_asset_records] failed ({response.status_code}) | {response.text}")
            return {"records": [], "pagination": {}}

        body = response.json()
        return {"records": body.get("records", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[equipment.get_my_asset_records] exception: {e}")
        return {"records": [], "pagination": {}}


def get_asset_record(payload: GetAssetRecordPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        record_id = payload.get("recordId")

        response = requests.get(f"{_BASE}/records/{record_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[equipment.get_asset_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("record", {})
    except Exception as e:
        logger.error(f"[equipment.get_asset_record] exception: {e}")
        return {}


def update_asset_record(payload: UpdateAssetRecordPayload, auth: AuthPayload) -> Dict:
    # admin only
    try:
        token = auth["token"]
        record_id = payload.get("recordId")

        if not record_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "recordId" and v is not None}

        response = requests.put(f"{_BASE}/records/{record_id}", headers=_headers(token), json=body)

        if response.status_code != 200:
            logger.error(f"[equipment.update_asset_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("record", {})
    except Exception as e:
        logger.error(f"[equipment.update_asset_record] exception: {e}")
        return {}


def delete_asset_record(payload: DeleteAssetRecordPayload, auth: AuthPayload) -> Dict:
    # admin only
    try:
        token = auth["token"]
        record_id = payload.get("recordId")

        response = requests.delete(f"{_BASE}/records/{record_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[equipment.delete_asset_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json()
    except Exception as e:
        logger.error(f"[equipment.delete_asset_record] exception: {e}")
        return {}
