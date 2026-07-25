import requests
from typing import Dict

from models.auth import AuthPayload
from models.billing import (
    CreateBillingRecordPayload,
    ListBillingRecordsPayload,
    GetBillingRecordPayload,
    UpdateBillingRecordPayload,
)

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers


def create_billing_record(payload: CreateBillingRecordPayload, auth: AuthPayload) -> Dict:
    # technician only — materials are derived server-side from the complaint's
    # own materials list, not submitted here. bill-photo uploads are not supported.
    try:
        token = auth["token"]
        body = {k: v for k, v in payload.items() if v is not None}

        response = requests.post(f"{SERVER_URL}/api/technician/billing", headers=_headers(token), json=body)

        if response.status_code not in (200, 201):
            logger.error(f"[billing.create_billing_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("record", {})
    except Exception as e:
        logger.error(f"[billing.create_billing_record] exception: {e}")
        return {}


def list_my_billing_records(payload: ListBillingRecordsPayload, auth: AuthPayload) -> Dict:
    # technician only — their own submitted billing records
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{SERVER_URL}/api/technician/billing", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[billing.list_my_billing_records] failed ({response.status_code}) | {response.text}")
            return {"records": [], "pagination": {}}

        body = response.json()
        return {"records": body.get("records", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[billing.list_my_billing_records] exception: {e}")
        return {"records": [], "pagination": {}}


def list_billing_records(payload: ListBillingRecordsPayload, auth: AuthPayload) -> Dict:
    # admin only — all billing records
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{SERVER_URL}/api/admin/billing", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[billing.list_billing_records] failed ({response.status_code}) | {response.text}")
            return {"records": [], "pagination": {}}

        body = response.json()
        return {"records": body.get("records", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[billing.list_billing_records] exception: {e}")
        return {"records": [], "pagination": {}}


def get_billing_record(payload: GetBillingRecordPayload, auth: AuthPayload) -> Dict:
    # admin only
    try:
        token = auth["token"]
        record_id = payload.get("recordId")

        response = requests.get(f"{SERVER_URL}/api/admin/billing/{record_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[billing.get_billing_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("record", {})
    except Exception as e:
        logger.error(f"[billing.get_billing_record] exception: {e}")
        return {}


def update_billing_record(payload: UpdateBillingRecordPayload, auth: AuthPayload) -> Dict:
    # admin only
    try:
        token = auth["token"]
        record_id = payload.get("recordId")

        if not record_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "recordId" and v is not None}

        response = requests.put(f"{SERVER_URL}/api/admin/billing/{record_id}", headers=_headers(token), json=body)

        if response.status_code != 200:
            logger.error(f"[billing.update_billing_record] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("record", {})
    except Exception as e:
        logger.error(f"[billing.update_billing_record] exception: {e}")
        return {}
