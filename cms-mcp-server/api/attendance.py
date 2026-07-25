import requests
from typing import Dict, List

from models.auth import AuthPayload
from models.attendance import GetHistoryPayload, GetSummaryPayload, ListAttendancePayload

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers


def _post_action(action: str, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.post(f"{SERVER_URL}/api/attendance/{action}", headers=_headers(token))

        if response.status_code not in (200, 201):
            logger.error(f"[attendance.{action}] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("attendance", {})
    except Exception as e:
        logger.error(f"[attendance.{action}] exception: {e}")
        return {}


def check_in(auth: AuthPayload) -> Dict:
    return _post_action("check-in", auth)


def start_break(auth: AuthPayload) -> Dict:
    return _post_action("break/start", auth)


def end_break(auth: AuthPayload) -> Dict:
    return _post_action("break/end", auth)


def check_out(auth: AuthPayload) -> Dict:
    return _post_action("check-out", auth)


def get_today(auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.get(f"{SERVER_URL}/api/attendance/today", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[attendance.get_today] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("attendance") or {}
    except Exception as e:
        logger.error(f"[attendance.get_today] exception: {e}")
        return {}


def get_history(payload: GetHistoryPayload, auth: AuthPayload) -> List[Dict]:
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{SERVER_URL}/api/attendance/history", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[attendance.get_history] failed ({response.status_code}) | {response.text}")
            return []

        return response.json().get("records", [])
    except Exception as e:
        logger.error(f"[attendance.get_history] exception: {e}")
        return []


def get_summary(payload: GetSummaryPayload, auth: AuthPayload) -> Dict:
    # admin only
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{SERVER_URL}/api/attendance/summary", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[attendance.get_summary] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("summary", {})
    except Exception as e:
        logger.error(f"[attendance.get_summary] exception: {e}")
        return {}


def list_attendance(payload: ListAttendancePayload, auth: AuthPayload) -> List[Dict]:
    # admin only
    try:
        token = auth["token"]

        params = {}
        if payload.get("date"):
            params["date"] = payload["date"]
        if payload.get("userRole"):
            params["userRole"] = payload["userRole"]
        if payload.get("userId"):
            params["userId"] = payload["userId"]
        if payload.get("fromDate"):
            params["from"] = payload["fromDate"]
        if payload.get("toDate"):
            params["to"] = payload["toDate"]

        response = requests.get(f"{SERVER_URL}/api/attendance", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[attendance.list_attendance] failed ({response.status_code}) | {response.text}")
            return []

        return response.json().get("records", [])
    except Exception as e:
        logger.error(f"[attendance.list_attendance] exception: {e}")
        return []
