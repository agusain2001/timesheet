"""Fix seed users: mark all existing users as email_verified and approved."""
import sqlite3

con = sqlite3.connect('timesheet.db')
cur = con.cursor()

cur.execute('SELECT email, email_verified, user_status FROM users')
print('BEFORE:')
for row in cur.fetchall():
    print(f'  {row}')

cur.execute("UPDATE users SET email_verified=1, user_status='approved' WHERE email_verified=0 OR user_status='pending'")
print(f'\nUpdated {cur.rowcount} users')

cur.execute('SELECT email, email_verified, user_status FROM users')
print('\nAFTER:')
for row in cur.fetchall():
    print(f'  {row}')

con.commit()
con.close()
print('\nDone!')
