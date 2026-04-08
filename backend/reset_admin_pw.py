"""Reset admin password using same bcrypt the app uses."""
import sqlite3
import bcrypt

NEW_PASSWORD = "Admin@1234"
password_bytes = NEW_PASSWORD.encode('utf-8')[:72]
salt = bcrypt.gensalt()
new_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

con = sqlite3.connect('timesheet.db')
cur = con.cursor()

cur.execute("SELECT email, role FROM users WHERE role IN ('admin','system_admin','org_admin')")
admins = cur.fetchall()
print("Resetting password for admin users:")
for a in admins:
    print(f"  {a[0]} ({a[1]})")

cur.execute(
    "UPDATE users SET password_hash=? WHERE role IN ('admin','system_admin','org_admin')",
    (new_hash,)
)
print(f"\nUpdated {cur.rowcount} user(s)")
con.commit()
con.close()

print(f"\nNew password: {NEW_PASSWORD}")
print("\nLogin credentials:")
for a in admins:
    print(f"  Email: {a[0]}  Password: {NEW_PASSWORD}")
