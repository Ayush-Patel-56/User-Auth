from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from homepage.models import Conversation
from .utils.agora_token import generate_agora_token
import os

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_call_token(request, thread_id):
    """
    Generate a secure Agora token for a specific 1-on-1 thread.
    Validates that the requesting user is actually part of the thread.
    """
    # 1. Validate thread ownership
    thread = get_object_or_404(Conversation, pk=thread_id)
    if not thread.participants.filter(pk=request.user.pk).exists():
        return Response(
            {"detail": "You are not a participant in this conversation."}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # 2. Generate unique channel name
    # Using 'dm_{thread_id}' ensures both users join the same room
    channel_name = f"dm_{thread.id}"
    
    # 3. Generate Token
    try:
        # UID=0 allows Agora to auto-assign a user ID
        token = generate_agora_token(channel_name, uid=0)
        
        return Response({
            'token': token,
            'appId': os.environ.get('AGORA_APP_ID'),
            'channelName': channel_name,
            'uid': 0
        })
    except Exception as e:
        return Response(
            {"detail": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
