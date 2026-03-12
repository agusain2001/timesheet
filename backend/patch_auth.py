"""Patch auth.py to make email_verified check admin-friendly."""
import re

with open('app/routers/auth.py', 'r') as f:
    content = f.read()

OLD_EMAIL_CHECK = '''    # Check email verification
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in",
        )

    # Check user approval status
    if user.user_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by your organization admin",
        )
    if user.user_status in ("rejected", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been {user.user_status}. Please contact your organization admin",
        )'''

NEW_EMAIL_CHECK = '''    # Check email verification (admins seeded directly in DB bypass this)
    _admin_roles = {"admin", "system_admin", "org_admin"}
    if not user.email_verified and user.role not in _admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in",
        )

    # Check user approval status (None treated as approved for legacy accounts)
    _status = user.user_status or "approved"
    if _status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by your organization admin",
        )
    if _status in ("rejected", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been {_status}. Please contact your organization admin",
        )'''

# Normalize line endings for comparison
content_norm = content.replace('\r\n', '\n')
old_norm = OLD_EMAIL_CHECK.replace('\r\n', '\n')
new_norm = NEW_EMAIL_CHECK.replace('\r\n', '\n')

count = content_norm.count(old_norm)
print(f"Found {count} occurrence(s) of the pattern to replace")

if count == 0:
    print("ERROR: Pattern not found! Showing relevant section:")
    idx = content_norm.find("# Check email verification")
    print(repr(content_norm[idx:idx+500]))
else:
    updated = content_norm.replace(old_norm, new_norm)
    # Restore CRLF
    updated = updated.replace('\n', '\r\n')
    with open('app/routers/auth.py', 'w') as f:
        f.write(updated)
    print(f"Successfully replaced {count} occurrence(s)")
    print("auth.py patched!")
