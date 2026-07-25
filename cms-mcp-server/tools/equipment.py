from typing import Dict, List, Optional

from api import equipment

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="get_equipment_list")
    def get_equipment_list() -> List[Dict]:
        """
        list all equipment checklist templates (any authenticated role).

        returns: list of { _id, name, isActive, fields: [{key, value, subFields}] }.
        use equipmentId values from here when submitting an asset check record.
        """
        return equipment.get_equipment_list(get_auth())

    @mcp.tool(name="create_equipment")
    def create_equipment(name: str) -> Dict:
        """admin only — create a new equipment checklist template."""
        return equipment.create_equipment({"name": name}, get_auth())

    @mcp.tool(name="update_equipment")
    def update_equipment(equipmentId: str, name: Optional[str] = None, isActive: Optional[bool] = None) -> Dict:
        """admin only — rename or activate/deactivate an equipment template."""
        return equipment.update_equipment({"equipmentId": equipmentId, "name": name, "isActive": isActive}, get_auth())

    @mcp.tool(name="delete_equipment")
    def delete_equipment(equipmentId: str) -> Dict:
        """admin only — deactivate an equipment template (soft delete)."""
        return equipment.delete_equipment(equipmentId, get_auth())

    @mcp.tool(name="submit_asset_check_record")
    def submit_asset_check_record(storeName: str, equipmentChecklist: List[Dict], notes: Optional[str] = None) -> Dict:
        """
        technician only — submit an asset/equipment check for a store.

        args:
            storeName (str): name of the store checked.
            equipmentChecklist (list[dict]): each item: { equipmentId, name, isPresent: bool, count: int }.
                use get_equipment_list to find valid equipmentId/name values.
            notes (str, optional): free-text notes about the check.

        returns: the created asset record.
        """
        return equipment.submit_asset_record(
            {"storeName": storeName, "equipment": equipmentChecklist, "notes": notes}, get_auth()
        )

    @mcp.tool(name="list_asset_records")
    def list_asset_records(
        page: int = 1, limit: int = 10, storeName: Optional[str] = None, technicianId: Optional[str] = None
    ) -> Dict:
        """
        admin only — list all submitted asset check records, with filters.

        returns: { records: [...], pagination: {currentPage, totalPages, totalRecords} }
        """
        return equipment.get_asset_records(
            {"page": page, "limit": limit, "storeName": storeName, "technicianId": technicianId}, get_auth()
        )

    @mcp.tool(name="get_my_asset_records")
    def get_my_asset_records(page: int = 1, limit: int = 10) -> Dict:
        """
        technician or client — list the caller's own asset check records
        (technician: records they submitted, paginated. client: records for their stores, all at once).
        """
        return equipment.get_my_asset_records(get_auth(), page=page, limit=limit)

    @mcp.tool(name="get_asset_record")
    def get_asset_record(recordId: str) -> Dict:
        """get a single asset check record by id (any authenticated role)."""
        return equipment.get_asset_record({"recordId": recordId}, get_auth())

    @mcp.tool(name="update_asset_record")
    def update_asset_record(
        recordId: str,
        storeName: Optional[str] = None,
        equipmentChecklist: Optional[List[Dict]] = None,
        notes: Optional[str] = None,
    ) -> Dict:
        """admin only — correct a submitted asset check record."""
        return equipment.update_asset_record(
            {"recordId": recordId, "storeName": storeName, "equipment": equipmentChecklist, "notes": notes},
            get_auth(),
        )

    @mcp.tool(name="delete_asset_record")
    def delete_asset_record(recordId: str) -> Dict:
        """admin only — permanently delete an asset check record."""
        return equipment.delete_asset_record({"recordId": recordId}, get_auth())
