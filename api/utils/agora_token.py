import time
import os
from rest_framework.exceptions import APIException
try:
    from agora_token_builder import RtcTokenBuilder
except ImportError:
    RtcTokenBuilder = None

def generate_agora_token(channel_name, uid=0, role=1, expire_time_in_seconds=3600):
    """
    Generate an Agora RTC Token.
    
    Args:
        channel_name (str): Unique channel name
        uid (int): User ID (0 for auto-assign)
        role (int): 1 = Host, 2 = Audience
        expire_time_in_seconds (int): Token validity duration
        
    Returns:
        str: The generated token
    """
    app_id = os.environ.get('AGORA_APP_ID')
    app_certificate = os.environ.get('AGORA_APP_CERTIFICATE')
    
    if not app_id or not app_certificate:
        raise APIException("Agora credentials not configured on server")
        
    if not RtcTokenBuilder:
        raise APIException("Agora library not installed")

    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expire_time_in_seconds
    
    token = RtcTokenBuilder.buildTokenWithUid(
        app_id, 
        app_certificate, 
        channel_name, 
        uid, 
        role, 
        privilege_expired_ts
    )
    return token
