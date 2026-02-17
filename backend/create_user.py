from app.database import SessionLocal
from app.models.user import User
from app.utils import get_password_hash
import sys

def create_user(email, password, full_name, role="employee"):
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User {email} already exists.")
            return

        hashed_password = get_password_hash(password)
        user = User(
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"User {email} created successfully.")
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_user("test@example.com", "password", "Test User")
