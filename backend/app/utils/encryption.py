"""
Utility module for at-rest encryption of sensitive database fields.
Uses Fernet symmetric encryption with a key from ENCRYPTION_KEY env variable.
"""
import os
import base64
from typing import Optional

try:
    from cryptography.fernet import Fernet
    _has_crypto = True
except ImportError:
    _has_crypto = False


def _get_fernet() -> Optional["Fernet"]:
    """Get Fernet instance from ENCRYPTION_KEY env variable."""
    if not _has_crypto:
        return None
    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        return None
    # Ensure key is valid Fernet key (32 url-safe base64 bytes)
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt_field(value: str) -> str:
    """
    Encrypt a string value for database storage.
    Returns the encrypted ciphertext as a base64 string.
    Falls back to returning the value as-is if encryption is not configured.
    """
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value  # Graceful degradation
    try:
        return f.encrypt(value.encode()).decode()
    except Exception:
        return value


def decrypt_field(value: str) -> str:
    """
    Decrypt a previously encrypted database field.
    Returns the plaintext string.
    Falls back to returning the value as-is if decryption fails.
    """
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value  # Value wasn't encrypted or key changed


def generate_encryption_key() -> str:
    """Generate a new Fernet encryption key. Save this as ENCRYPTION_KEY env var."""
    if not _has_crypto:
        raise RuntimeError("cryptography package not installed")
    return Fernet.generate_key().decode()
