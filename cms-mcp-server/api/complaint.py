import requests
from typing import List, Dict

from models.auth import AuthPayload
from models.complaint import (
    GetComplaintPayload,
    ListComplaintsPayload,
    CreateComplaintPayload,
    CreateBulkComplaintsPayload,
    UpdateComplaintPayload,
    DeleteComplaintPayload,
    DuplicateComplaintPayload,
    AssignComplaintPayload,
    ReassignComplaintPayload,
    UpdateComplaintStatusPayload,
    UpdateAutoAssignSettingPayload,
)

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers


def _role_base(role: str) -> str:
    return f"{SERVER_URL}/api/{role}"


def get_complaint(payload: GetComplaintPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        role = auth["role"]
        complaint_id = payload.get("complaintId")

        if not complaint_id:
            return {}

        # admin bypasses ownership filtering; client/technician share the generic,
        # role-filtered lookup route
        url = (
            f"{_role_base('admin')}/complaints/{complaint_id}"
            if role == "admin"
            else f"{SERVER_URL}/api/complaints/{complaint_id}"
        )

        response = requests.get(url, headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[complaint.get_complaint] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.get_complaint] exception: {e}")
        return {}


def list_complaints(payload: ListComplaintsPayload, auth: AuthPayload) -> Dict:
    # admin only — full complaint list across the CMS
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{_role_base('admin')}/complaints", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[complaint.list_complaints] failed ({response.status_code}) | {response.text}")
            return {"complaints": [], "pagination": {}}

        body = response.json()
        return {"complaints": body.get("complaints", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[complaint.list_complaints] exception: {e}")
        return {"complaints": [], "pagination": {}}


def get_my_complaints(payload: ListComplaintsPayload, auth: AuthPayload) -> Dict:
    # client only — complaints they submitted
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{_role_base('client')}/complaints", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[complaint.get_my_complaints] failed ({response.status_code}) | {response.text}")
            return {"complaints": [], "pagination": {}}

        body = response.json()
        return {"complaints": body.get("complaints", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[complaint.get_my_complaints] exception: {e}")
        return {"complaints": [], "pagination": {}}


def get_my_created_complaints(payload: ListComplaintsPayload, auth: AuthPayload) -> Dict:
    # technician only — complaints they personally created (not necessarily assigned to them)
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{_role_base('technician')}/complaints/my", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[complaint.get_my_created_complaints] failed ({response.status_code}) | {response.text}")
            return {"complaints": [], "pagination": {}}

        body = response.json()
        return {"complaints": body.get("complaints", []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[complaint.get_my_created_complaints] exception: {e}")
        return {"complaints": [], "pagination": {}}


def get_my_assignments(auth: AuthPayload) -> Dict:
    # technician only — complaints currently assigned to them (assigned/in-progress)
    try:
        token = auth["token"]

        response = requests.get(f"{_role_base('technician')}/assignments", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[complaint.get_my_assignments] failed ({response.status_code}) | {response.text}")
            return {"complaints": [], "stats": {}}

        data = response.json().get("data", {})
        return {"complaints": data.get("complaints", []), "stats": data.get("stats", {})}
    except Exception as e:
        logger.error(f"[complaint.get_my_assignments] exception: {e}")
        return {"complaints": [], "stats": {}}


def get_my_resolved_assignments(auth: AuthPayload) -> List[Dict]:
    # technician only — their resolved complaints
    try:
        token = auth["token"]

        response = requests.get(f"{_role_base('technician')}/resolved-assignments", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[complaint.get_my_resolved_assignments] failed ({response.status_code}) | {response.text}")
            return []

        return response.json().get("data", {}).get("complaints", [])
    except Exception as e:
        logger.error(f"[complaint.get_my_resolved_assignments] exception: {e}")
        return []


def create_complaint(payload: CreateComplaintPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        role = auth["role"]

        body = {k: v for k, v in payload.items() if v is not None}

        response = requests.post(f"{_role_base(role)}/complaints", headers=_headers(token), json=body)

        if response.status_code not in (200, 201):
            logger.error(f"[complaint.create_complaint] failed ({response.status_code}) | params={payload} | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.create_complaint] exception: {e}")
        return {}


def create_bulk_complaints(payload: CreateBulkComplaintsPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        role = auth["role"]

        response = requests.post(f"{_role_base(role)}/complaints/bulk", headers=_headers(token), json=payload)

        if response.status_code not in (200, 201):
            logger.error(f"[complaint.create_bulk_complaints] failed ({response.status_code}) | {response.text}")
            return {"summary": {}, "results": []}

        body = response.json()
        return {"summary": body.get("summary", {}), "results": body.get("results", [])}
    except Exception as e:
        logger.error(f"[complaint.create_bulk_complaints] exception: {e}")
        return {"summary": {}, "results": []}


def update_complaint(payload: UpdateComplaintPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        role = auth["role"]
        complaint_id = payload.get("complaintId")

        if not complaint_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "complaintId" and v is not None}

        response = requests.put(f"{_role_base(role)}/complaints/{complaint_id}", headers=_headers(token), json=body)

        if response.status_code != 200:
            logger.error(f"[complaint.update_complaint] failed ({response.status_code}) | params={payload} | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.update_complaint] exception: {e}")
        return {}


def delete_complaint(payload: DeleteComplaintPayload, auth: AuthPayload) -> Dict:
    # client (only while pending) or admin (no restriction)
    try:
        token = auth["token"]
        role = auth["role"]
        complaint_id = payload.get("complaintId")

        if not complaint_id or role not in ("client", "admin"):
            return {}

        response = requests.delete(f"{_role_base(role)}/complaints/{complaint_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[complaint.delete_complaint] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json()
    except Exception as e:
        logger.error(f"[complaint.delete_complaint] exception: {e}")
        return {}


def duplicate_complaint(payload: DuplicateComplaintPayload, auth: AuthPayload) -> Dict:
    # admin or technician only
    try:
        token = auth["token"]
        role = auth["role"]
        complaint_id = payload.get("complaintId")

        if not complaint_id or role not in ("admin", "technician"):
            return {}

        body = {k: v for k, v in payload.items() if k != "complaintId" and v is not None}

        response = requests.post(
            f"{_role_base(role)}/complaints/{complaint_id}/duplicate", headers=_headers(token), json=body
        )

        if response.status_code not in (200, 201):
            logger.error(f"[complaint.duplicate_complaint] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.duplicate_complaint] exception: {e}")
        return {}


def assign_complaint(payload: AssignComplaintPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]

        response = requests.post(f"{_role_base('admin')}/complaints/assign", headers=_headers(token), json=payload)

        if response.status_code != 200:
            logger.error(f"[complaint.assign_complaint] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.assign_complaint] exception: {e}")
        return {}


def reassign_complaint(payload: ReassignComplaintPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        complaint_id = payload.get("complaintId")

        response = requests.patch(
            f"{_role_base('admin')}/complaints/{complaint_id}/reassign",
            headers=_headers(token),
            json={"technicianId": payload.get("technicianId")},
        )

        if response.status_code != 200:
            logger.error(f"[complaint.reassign_complaint] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.reassign_complaint] exception: {e}")
        return {}


def update_complaint_status(payload: UpdateComplaintStatusPayload, auth: AuthPayload) -> Dict:
    # technician only
    try:
        token = auth["token"]
        complaint_id = payload.get("complaintId")

        if not complaint_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "complaintId" and v is not None}

        response = requests.patch(
            f"{_role_base('technician')}/assignments/{complaint_id}/status",
            headers=_headers(token),
            json=body,
        )

        if response.status_code != 200:
            logger.error(f"[complaint.update_complaint_status] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("complaint", {})
    except Exception as e:
        logger.error(f"[complaint.update_complaint_status] exception: {e}")
        return {}


def get_auto_assign_setting(auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.get(f"{_role_base('admin')}/complaints/auto-assign", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[complaint.get_auto_assign_setting] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("setting", {})
    except Exception as e:
        logger.error(f"[complaint.get_auto_assign_setting] exception: {e}")
        return {}


def update_auto_assign_setting(payload: UpdateAutoAssignSettingPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.patch(
            f"{_role_base('admin')}/complaints/auto-assign", headers=_headers(token), json=payload
        )

        if response.status_code != 200:
            logger.error(f"[complaint.update_auto_assign_setting] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("setting", {})
    except Exception as e:
        logger.error(f"[complaint.update_auto_assign_setting] exception: {e}")
        return {}
