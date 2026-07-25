import requests
from typing import Dict

from models.auth import AuthPayload

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers

_BASE = f"{SERVER_URL}/api/stats"


def _get(path: str, params: dict, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        clean_params = {k: v for k, v in params.items() if v is not None}

        response = requests.get(f"{_BASE}/{path}", headers=_headers(token), params=clean_params)

        if response.status_code != 200:
            logger.error(f"[stats.{path}] failed ({response.status_code}) | {response.text}")
            return {}

        body = response.json()
        return {"range": body.get("range"), "data": body.get("data", {})}
    except Exception as e:
        logger.error(f"[stats.{path}] exception: {e}")
        return {}


def created_vs_resolved(interval, from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/created-vs-resolved", {"interval": interval, "from": from_date, "to": to_date, "tz": tz}, auth)


def created_vs_resolved_drilldown(interval, period, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/created-vs-resolved/drilldown", {"interval": interval, "period": period, "tz": tz}, auth)


def status_funnel(from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/status-funnel", {"from": from_date, "to": to_date, "tz": tz}, auth)


def status_funnel_drilldown(status, from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/status-funnel/drilldown", {"status": status, "from": from_date, "to": to_date, "tz": tz}, auth)


def store_leaderboard(from_date, to_date, tz, limit, auth: AuthPayload) -> Dict:
    return _get("complaints/store-leaderboard", {"from": from_date, "to": to_date, "tz": tz, "limit": limit}, auth)


def store_leaderboard_drilldown(store_name, from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get(
        "complaints/store-leaderboard/drilldown",
        {"storeName": store_name, "from": from_date, "to": to_date, "tz": tz},
        auth,
    )


def time_to_resolve(interval, from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/time-to-resolve", {"interval": interval, "from": from_date, "to": to_date, "tz": tz}, auth)


def time_to_resolve_drilldown(interval, period, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/time-to-resolve/drilldown", {"interval": interval, "period": period, "tz": tz}, auth)


def aging(from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/aging", {"from": from_date, "to": to_date, "tz": tz}, auth)


def aging_drilldown(bucket, from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("complaints/aging/drilldown", {"bucket": bucket, "from": from_date, "to": to_date, "tz": tz}, auth)


def technician_assigned_vs_resolved(from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get("technicians/assigned-vs-resolved", {"from": from_date, "to": to_date, "tz": tz}, auth)


def technician_drilldown(technician_id, from_date, to_date, tz, auth: AuthPayload) -> Dict:
    return _get(
        "technicians/drilldown",
        {"technicianId": technician_id, "from": from_date, "to": to_date, "tz": tz},
        auth,
    )
