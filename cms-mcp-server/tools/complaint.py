from typing import List, Dict, Optional

from api import complaint

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="get_complaint")
    def get_complaint(complaintId: str) -> Dict:
        """
        fetch a single complaint by its id.

        works for any role — clients and technicians only see complaints they're
        allowed to (own complaint / assigned complaint), admins see any complaint.

        returns: complaint object with fields like _id, complaintId, title, description,
        location, store, priority, status, client, assignedTechnician, technicianNotes,
        resolutionNotes, materials, createdAt, resolvedAt, etc.
        """
        return complaint.get_complaint({"complaintId": complaintId}, get_auth())

    @mcp.tool(name="list_all_complaints")
    def list_all_complaints(
        status: Optional[str] = None,
        priority: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict:
        """
        admin only — list every complaint in the system.

        args:
            status (str, optional): filter by "pending" | "assigned" | "in-progress" | "resolved".
            priority (str, optional): filter by "low" | "medium" | "high" | "urgent".
            page (int): page number, defaults to 1.
            limit (int): page size, defaults to 10.

        returns: { complaints: [...], pagination: {total, page, pages} }
        """
        return complaint.list_complaints({"status": status, "priority": priority, "page": page, "limit": limit}, get_auth())

    @mcp.tool(name="get_my_submitted_complaints")
    def get_my_submitted_complaints(status: Optional[str] = None, page: int = 1, limit: int = 10) -> Dict:
        """
        client only — list complaints the current client submitted.

        args:
            status (str, optional): filter by "pending" | "assigned" | "in-progress" | "resolved".
            page (int): page number, defaults to 1.
            limit (int): page size, defaults to 10.

        returns: { complaints: [...], pagination: {total, page, pages} }
        """
        return complaint.get_my_complaints({"status": status, "page": page, "limit": limit}, get_auth())

    @mcp.tool(name="get_my_created_complaints")
    def get_my_created_complaints(status: Optional[str] = None, page: int = 1, limit: int = 10) -> Dict:
        """
        technician only — list complaints the current technician personally created
        (on behalf of a client), as opposed to complaints assigned to them.

        returns: { complaints: [...], pagination: {total, page, pages} }
        """
        return complaint.get_my_created_complaints({"status": status, "page": page, "limit": limit}, get_auth())

    @mcp.tool(name="get_my_assignments")
    def get_my_assignments() -> Dict:
        """
        technician only — list complaints currently assigned to the current technician
        (status "assigned" or "in-progress").

        returns: { complaints: [...], stats: {total, assigned, inProgress, completed} }
        """
        return complaint.get_my_assignments(get_auth())

    @mcp.tool(name="get_my_resolved_assignments")
    def get_my_resolved_assignments() -> List[Dict]:
        """
        technician only — list complaints the current technician has resolved.

        returns: list of resolved complaint objects.
        """
        return complaint.get_my_resolved_assignments(get_auth())

    @mcp.tool(name="create_complaint")
    def create_complaint(
        title: str,
        description: str,
        location: Optional[str] = None,
        storeId: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> Dict:
        """
        create a new complaint. works for client, technician, and admin — each creates
        it "as" their own role (creatorType is set automatically from the caller's token).

        args:
            title (str): short complaint title.
            description (str): what's wrong / what needs fixing.
            location (str, optional): free-text location. required unless storeId is given.
            storeId (str, optional): id of the store this complaint is for — use store
                tools to look up the id. overrides location if both given.
            priority (str, optional): "low" | "medium" | "high" | "urgent". defaults to "medium".

        returns: the created complaint object.
        """
        return complaint.create_complaint(
            {"title": title, "description": description, "location": location, "storeId": storeId, "priority": priority},
            get_auth(),
        )

    @mcp.tool(name="create_bulk_complaints")
    def create_bulk_complaints(complaints: List[Dict]) -> Dict:
        """
        create several complaints in one call. each item works for the caller's own role.

        args:
            complaints (list[dict]): each item: { title, description, location?, priority? }.

        returns: { summary: {total, created, failed}, results: [{index, success, complaint?|error}] }
        """
        return complaint.create_bulk_complaints({"complaints": complaints}, get_auth())

    @mcp.tool(name="update_complaint")
    def update_complaint(
        complaintId: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        priority: Optional[str] = None,
        store: Optional[str] = None,
    ) -> Dict:
        """
        update fields on an existing complaint.

        clients can only edit their own complaint while it's still "pending".
        technicians can only edit complaints they created while still "pending".
        admins can edit any complaint at any time.

        args:
            complaintId (str): id of the complaint to update.
            title, description, location, priority: same meaning as create_complaint.
            store (str, optional): store id to (re)associate with this complaint.

        returns: the updated complaint object.
        """
        return complaint.update_complaint(
            {
                "complaintId": complaintId,
                "title": title,
                "description": description,
                "location": location,
                "priority": priority,
                "store": store,
            },
            get_auth(),
        )

    @mcp.tool(name="delete_complaint")
    def delete_complaint(complaintId: str) -> Dict:
        """
        delete a complaint. client can only delete their own while still "pending";
        admin can delete any complaint.

        args:
            complaintId (str): id of the complaint to delete.
        """
        return complaint.delete_complaint({"complaintId": complaintId}, get_auth())

    @mcp.tool(name="duplicate_complaint")
    def duplicate_complaint(
        complaintId: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> Dict:
        """
        admin or technician only — create a copy of an existing complaint, optionally
        overriding some fields on the copy. technicians can only duplicate complaints
        they created.

        returns: the newly created complaint object.
        """
        return complaint.duplicate_complaint(
            {
                "complaintId": complaintId,
                "title": title,
                "description": description,
                "location": location,
                "priority": priority,
            },
            get_auth(),
        )

    @mcp.tool(name="assign_complaint")
    def assign_complaint(complaintId: str, technicianId: str) -> Dict:
        """
        admin only — assign a pending complaint to a technician.

        args:
            complaintId (str): id of the complaint (must currently be "pending").
            technicianId (str): id of the technician to assign.

        returns: the updated complaint object (status becomes "assigned").
        """
        return complaint.assign_complaint({"complaintId": complaintId, "technicianId": technicianId}, get_auth())

    @mcp.tool(name="reassign_complaint")
    def reassign_complaint(complaintId: str, technicianId: str) -> Dict:
        """
        admin only — reassign an already-assigned or in-progress complaint to a
        different technician.

        returns: the updated complaint object.
        """
        return complaint.reassign_complaint({"complaintId": complaintId, "technicianId": technicianId}, get_auth())

    @mcp.tool(name="update_complaint_status")
    def update_complaint_status(
        complaintId: str,
        status: str,
        notes: Optional[str] = None,
        resolutionNotes: Optional[str] = None,
        materialsUsed: Optional[bool] = None,
        materials: Optional[List[Dict]] = None,
    ) -> Dict:
        """
        technician only — move an assigned complaint through its lifecycle.

        valid transitions: "assigned" -> "in-progress" -> "resolved".

        args:
            complaintId (str): id of the complaint (must be assigned to the caller).
            status (str): "assigned" | "in-progress" | "resolved".
            notes (str, optional): general technician notes, stored as technicianNotes.
            resolutionNotes (str, optional): required when status="resolved" — what was done.
            materialsUsed (bool, optional): whether inventory materials were used to resolve it.
            materials (list[dict], optional): required non-empty when materialsUsed is true.
                each item: { item: <inventoryItemId>, quantity: <number> }. use inventory
                tools to look up item ids.

        note: photo/video proof-of-resolution uploads are not supported through this tool.

        returns: the updated complaint object.
        """
        return complaint.update_complaint_status(
            {
                "complaintId": complaintId,
                "status": status,
                "notes": notes,
                "resolutionNotes": resolutionNotes,
                "materialsUsed": materialsUsed,
                "materials": materials,
            },
            get_auth(),
        )

    @mcp.tool(name="get_complaint_auto_assign_setting")
    def get_complaint_auto_assign_setting() -> Dict:
        """admin only — check whether new complaints are auto-assigned to a technician."""
        return complaint.get_auto_assign_setting(get_auth())

    @mcp.tool(name="update_complaint_auto_assign_setting")
    def update_complaint_auto_assign_setting(enabled: bool) -> Dict:
        """admin only — turn complaint auto-assignment on or off."""
        return complaint.update_auto_assign_setting({"enabled": enabled}, get_auth())
