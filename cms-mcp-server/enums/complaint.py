from enum import Enum


class ComplaintPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ComplaintStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in-progress"
    RESOLVED = "resolved"


class ComplaintCreatorType(str, Enum):
    CLIENT = "client"
    TECHNICIAN = "technician"
    ADMIN = "admin"
