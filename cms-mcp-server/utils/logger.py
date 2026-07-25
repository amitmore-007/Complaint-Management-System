import logging
import os
from logging.handlers import RotatingFileHandler

_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
os.makedirs(_LOG_DIR, exist_ok=True)
_LOG_FILE = os.path.join(_LOG_DIR, "mcp.log")

logger = logging.getLogger("cms-mcp")
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    _formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    _file_handler = RotatingFileHandler(_LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
    _file_handler.setLevel(logging.DEBUG)
    _file_handler.setFormatter(_formatter)

    _stderr_handler = logging.StreamHandler()
    _stderr_handler.setLevel(logging.DEBUG)
    _stderr_handler.setFormatter(_formatter)

    logger.addHandler(_file_handler)
    logger.addHandler(_stderr_handler)
