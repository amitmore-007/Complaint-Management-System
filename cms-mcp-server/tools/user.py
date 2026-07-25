from typing import Dict, Optional

from api import user

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="whoami")
    def whoami() -> Dict:
        """
        get the currently authenticated user's profile.

        returns: { id, phoneNumber, name, role, isActive, lastLogin }
        """
        return user.whoami(get_auth())

    @mcp.tool(name="list_clients")
    def list_clients(search: Optional[str] = None, page: int = 1, limit: int = 50) -> Dict:
        """
        admin only — list clients.

        args:
            search (str, optional): matches name or phone number (case-insensitive).
            page (int): page number, defaults to 1.
            limit (int): page size, defaults to 50.

        returns: { clients: [{_id, name, phoneNumber, isActive, createdAt, complaintCount}], pagination: {total, page, pages} }
        """
        return user.list_clients({"search": search, "page": page, "limit": limit}, get_auth())

    @mcp.tool(name="list_technicians")
    def list_technicians(search: Optional[str] = None, page: int = 1, limit: int = 50) -> Dict:
        """
        admin only — list technicians.

        args:
            search (str, optional): matches name or phone number (case-insensitive).
            page (int): page number, defaults to 1.
            limit (int): page size, defaults to 50.

        returns: { technicians: [{_id, name, phoneNumber, isActive, createdAt,
            hasAttendanceToken, activeAssignments, completedAssignments, totalAssignments}],
            pagination: {total, page, pages} }
        """
        return user.list_technicians({"search": search, "page": page, "limit": limit}, get_auth())

    @mcp.tool(name="create_client")
    def create_client(name: str, phoneNumber: str) -> Dict:
        """
        admin only — provision a new client account. clients can only log in (via OTP)
        to accounts an admin has created for them.

        args:
            name (str): client's display name.
            phoneNumber (str): client's phone number (with country code, e.g. "+919876543210").

        returns: the created client { id, name, phoneNumber, isActive, createdAt }.
        """
        return user.create_client({"name": name, "phoneNumber": phoneNumber}, get_auth())

    @mcp.tool(name="create_technician")
    def create_technician(name: str, phoneNumber: str) -> Dict:
        """
        admin only — provision a new technician account.

        args:
            name (str): technician's display name.
            phoneNumber (str): technician's phone number (with country code).

        returns: the created technician { id, name, phoneNumber, isActive, createdAt }.
        """
        return user.create_technician({"name": name, "phoneNumber": phoneNumber}, get_auth())

    @mcp.tool(name="update_client")
    def update_client(userId: str, name: Optional[str] = None, phoneNumber: Optional[str] = None) -> Dict:
        """admin only — update a client's name and/or phone number."""
        return user.update_client({"userId": userId, "name": name, "phoneNumber": phoneNumber}, get_auth())

    @mcp.tool(name="update_technician")
    def update_technician(userId: str, name: Optional[str] = None, phoneNumber: Optional[str] = None) -> Dict:
        """admin only — update a technician's name and/or phone number."""
        return user.update_technician({"userId": userId, "name": name, "phoneNumber": phoneNumber}, get_auth())

    @mcp.tool(name="toggle_user_status")
    def toggle_user_status(userId: str, isActive: bool) -> Dict:
        """
        admin only — activate or deactivate a client or technician account.
        deactivated users can no longer log in.

        args:
            userId (str): id of the client or technician.
            isActive (bool): true to activate, false to deactivate.
        """
        return user.toggle_user_status({"userId": userId, "isActive": isActive}, get_auth())

    @mcp.tool(name="delete_user")
    def delete_user(userId: str) -> Dict:
        """
        admin only — permanently delete a client or technician account.
        fails if the client has active complaints or the technician has active assignments.
        """
        return user.delete_user({"userId": userId}, get_auth())

    @mcp.tool(name="get_dashboard_stats")
    def get_dashboard_stats() -> Dict:
        """
        admin only — high-level dashboard counters.

        returns: { totalComplaints, pendingComplaints, inProgressComplaints,
            resolvedComplaints, totalClients, totalTechnicians, activeTechnicians,
            recentComplaints: [...5 most recent complaints...] }
        """
        return user.get_dashboard_stats(get_auth())
