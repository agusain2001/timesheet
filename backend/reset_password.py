import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    user = User.objects.get(email='admin@lightidea.com')
    user.set_password('password123')
    user.save()
    print("Password for admin@lightidea.com set to 'password123'")
except User.DoesNotExist:
    print("User admin@lightidea.com does not exist")
except Exception as e:
    print(f"Error: {e}")
