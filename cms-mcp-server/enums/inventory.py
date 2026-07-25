from enum import Enum


class GstType(str, Enum):
    GST = "gst"
    NON_GST = "non-gst"
