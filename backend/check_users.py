import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users = User.objects.all()
print(f"Total users: {users.count()}")
for user in users:
    print(f"User: {user.email}, Is Active: {user.is_active}, Is Staff: {user.is_staff}, Role: {user.role}")
