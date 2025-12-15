"""Test Agora Token Generation."""
import os
import django

# Setup Django only to load settings/env (though util is mostly standalone)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.utils.agora_token import generate_agora_token

print("Testing Agora Token Generation...")

app_id = os.environ.get('AGORA_APP_ID')
print(f"App ID found: {app_id[:5]}...")

try:
    token = generate_agora_token("test_channel", uid=0)
    print(f"✅ Token Generated Successfully!")
    print(f"Token length: {len(token)}")
    print(f"Token preview: {token[:20]}...")
except Exception as e:
    print(f"❌ Failed to generate token: {e}")
