from typing import Dict, List, Optional

from api import billing

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="create_billing_record")
    def create_billing_record(complaintId: str, isComplaintResolved: Optional[bool] = None) -> Dict:
        """
        technician only — submit a billing record for a complaint. materials/pricing
        are pulled automatically from the complaint's own recorded materials —
        this tool does not accept a materials list or bill-photo uploads.

        args:
            complaintId (str): id of the complaint being billed.
            isComplaintResolved (bool, optional): whether the underlying complaint is resolved.

        returns: the created billing record.
        """
        return billing.create_billing_record(
            {"complaintId": complaintId, "isComplaintResolved": isComplaintResolved}, get_auth()
        )

    @mcp.tool(name="get_my_billing_records")
    def get_my_billing_records(page: int = 1, limit: int = 20) -> Dict:
        """technician only — list billing records the current technician has submitted."""
        return billing.list_my_billing_records({"page": page, "limit": limit}, get_auth())

    @mcp.tool(name="list_billing_records")
    def list_billing_records(page: int = 1, limit: int = 30) -> Dict:
        """admin only — list all billing records across all technicians."""
        return billing.list_billing_records({"page": page, "limit": limit}, get_auth())

    @mcp.tool(name="get_billing_record")
    def get_billing_record(recordId: str) -> Dict:
        """admin only — fetch a single billing record by id."""
        return billing.get_billing_record({"recordId": recordId}, get_auth())

    @mcp.tool(name="update_billing_record")
    def update_billing_record(
        recordId: str,
        materialsUsed: Optional[bool] = None,
        isComplaintResolved: Optional[bool] = None,
        materials: Optional[List[Dict]] = None,
    ) -> Dict:
        """
        admin only — correct a billing record's materials/pricing or resolved flag.

        args:
            recordId (str): id of the billing record.
            materialsUsed (bool, optional): whether materials were used.
            isComplaintResolved (bool, optional): whether the underlying complaint is resolved.
            materials (list[dict], optional): replacement materials list, each item:
                { name, quantity, price } (gst fields are computed server-side if omitted).
        """
        return billing.update_billing_record(
            {
                "recordId": recordId,
                "materialsUsed": materialsUsed,
                "isComplaintResolved": isComplaintResolved,
                "materials": materials,
            },
            get_auth(),
        )
