from django.shortcuts import render
from django.contrib.auth.models import User

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer


# -------------------------------------------------------------
# REGISTER NEW USER (SIGN-UP)
# -------------------------------------------------------------
class RegisterView(generics.CreateAPIView):
    """
    POST /api/register/
    Accepts: username, email, password, password2
    Creates a new user + returns JWT tokens immediately.
    """
    queryset = User.objects.all()
    
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  # Anyone can register

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create the user
        user = serializer.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        # JSON Response to frontend
        return Response({
            "username": user.username,
            "email": user.email,
            "access": str(access),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)


# -------------------------------------------------------------
# RESOLVE USERNAME USING EMAIL  (FOR LOGIN POPUP)
# -------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def resolve_username(request):
    """
    GET /api/resolve-username/?email=someone@gmail.com
    Used when user types an email in login popup.
    Returns: { "username": "their_username" }
    """
    email = request.query_params.get('email')

    if not email:
        return Response({"detail": "Email required"}, status=400)

    try:
        user = User.objects.get(email__iexact=email)
        return Response({"username": user.username})
    except User.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)


# -------------------------------------------------------------
# RETURN LOGGED-IN USER (Using JWT Access Token)
# -------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/me/
    Requires:
        Authorization: Bearer <access_token>

    Returns the logged-in user's info.
    """
    user = request.user

    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "profile": {
            "title": user.profile.title,
            "description": user.profile.description,
            "avatar": user.profile.avatar.url if user.profile.avatar else None
        }
    })


# -------------------------------------------------------------
# PROFILE MANAGEMENT (GET / UPDATE)
# -------------------------------------------------------------
from homepage.models import Profile, UserPhoto
from .serializers import ProfileSerializer, UserPhotoSerializer

class ProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Return the profile of the currently logged-in user
        return self.request.user.profile

# -------------------------------------------------------------
# GALLERY MANAGEMENT (UPLOAD / LIST / DELETE)
# -------------------------------------------------------------
class UserPhotoListCreateView(generics.ListCreateAPIView):
    serializer_class = UserPhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserPhoto.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserPhotoDetailView(generics.DestroyAPIView):
    queryset = UserPhoto.objects.all()
    serializer_class = UserPhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user can only delete their own photos
        return UserPhoto.objects.filter(user=self.request.user)

# -------------------------------------------------------------
# LIKE FEATURE
# -------------------------------------------------------------
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly

# ... (Previous imports remain, ensuring IsAuthenticatedOrReadOnly is available)

# -------------------------------------------------------------
# LIKE FEATURE
# -------------------------------------------------------------
from homepage.models import PhotoLike, PhotoComment
from .serializers import CommentSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def toggle_like(request, photo_id):
    """
    GET /api/photos/<id>/like/  -> Check status (Public)
    POST /api/photos/<id>/like/ -> Toggle status (Auth only)
    Returns: { "is_liked": bool, "like_count": int }
    """
    try:
        photo = UserPhoto.objects.get(id=photo_id)
    except UserPhoto.DoesNotExist:
        return Response({"detail": "Photo not found"}, status=404)

    # For GET requests (Public read)
    if request.method == 'GET':
        # If user is anonymous, they can't have "liked" it, but we return count
        is_liked = False
        if request.user.is_authenticated:
            is_liked = PhotoLike.objects.filter(user=request.user, photo=photo).exists()
            
        return Response({
            "is_liked": is_liked,
            "like_count": photo.likes.count()
        })

    # POST logic (Auth required - enforced by permission class)
    user = request.user
    existing_like = PhotoLike.objects.filter(user=user, photo=photo).first()
    
    if existing_like:
        # UNLIKE
        existing_like.delete()
        is_liked = False
    else:
        # LIKE
        PhotoLike.objects.create(user=user, photo=photo)
        is_liked = True
    
    return Response({
        "is_liked": is_liked,
        "like_count": photo.likes.count()
    })

# -------------------------------------------------------------
# COMMENT FEATURE
# -------------------------------------------------------------
class PhotoCommentListView(generics.ListCreateAPIView):
    """
    GET /api/photos/<id>/comments/  -> List comments (Public)
    POST /api/photos/<id>/comments/ -> Add comment (Auth only)
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        photo_id = self.kwargs['photo_id']
        # Return only top-level comments (parent=None)
        return PhotoComment.objects.filter(photo_id=photo_id, parent=None).order_by('created_at')

    def perform_create(self, serializer):
        photo_id = self.kwargs['photo_id']
        parent_id = self.request.data.get('parent_id')
        parent = None
        
        try:
            photo = UserPhoto.objects.get(id=photo_id)
            if parent_id:
                try:
                    parent = PhotoComment.objects.get(id=parent_id, photo=photo)
                except PhotoComment.DoesNotExist:
                    raise serializers.ValidationError("Parent comment not found")
            
            serializer.save(user=self.request.user, photo=photo, parent=parent)
        except UserPhoto.DoesNotExist:
            raise serializers.ValidationError("Photo not found")

class PhotoCommentDetailView(generics.DestroyAPIView):
    """
    DELETE /api/comments/<id>/
    """
    queryset = PhotoComment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check permissions: Author OR Photo Owner
        is_author = instance.user == request.user
        is_photo_owner = instance.photo.user == request.user
        
        if is_author or is_photo_owner:
            return self.destroy(request, *args, **kwargs)
        else:
            return Response(
                {"detail": "You do not have permission to delete this comment."},
                status=status.HTTP_403_FORBIDDEN
            )

# -------------------------------------------------------------
# GOOGLE AUTH LOGIN
# -------------------------------------------------------------
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from django.contrib.auth import login

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    POST /api/auth/google/
    Body: { "token": "..." }
    """
    token = request.data.get('token')
    if not token:
        return Response({"detail": "Token required"}, status=400)

    try:
        # Verify Token
        CLIENT_ID = settings.GOOGLE_CLIENT_ID
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)

        # Get User Info
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        # Check if user exists
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Create new user
            username = email.split('@')[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User.objects.create_user(username=username, email=email)
            user.set_unusable_password() # No password needed for OAuth users
            user.save()
            
            # Create Profile
            display_name = name if name else username
            Profile.objects.create(
                user=user,
                title=f"{display_name}'s Profile",
                description=f"Hello this is {display_name}."
            )

        # Generate JWT
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response({
            "access": str(access),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email
        })

    except ValueError:
        return Response({"detail": "Invalid Google Token"}, status=400)
    except Exception as e:
        return Response({"detail": "Google Auth Failed"}, status=500)

# -------------------------------------------------------------
# COMMUNITY CHAT
# -------------------------------------------------------------
from homepage.models import ChatMessage
from .serializers import ChatMessageSerializer

class ChatListCreateView(generics.ListCreateAPIView):
    """
    GET /api/chat/ -> List last 50 messages
    POST /api/chat/ -> Post new message
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Return last 50 messages (ordered by creation)
        # Note: We slice in python or use logic to get last N
        return ChatMessage.objects.all().order_by('-created_at')[:50]

    def list(self, request, *args, **kwargs):
        # We want oldest first for chat flow, so fetch recent desc -> reverse
        queryset = self.get_queryset()
        serializer = self.get_serializer(reversed(queryset), many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ChatDetailView(generics.DestroyAPIView):
    """
    DELETE /api/chat/<id>/
    """
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only allow deleting own messages
        return ChatMessage.objects.filter(user=self.request.user)

# -------------------------------------------------------------
# USER SEARCH
# -------------------------------------------------------------
from .serializers import UserSearchSerializer

class UserSearchView(generics.ListAPIView):
    """
    GET /api/search/users/?q=<query>
    Search for users by username (partial, case-insensitive)
    """
    serializer_class = UserSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        
        if not query or len(query) < 2:
            return User.objects.none()
        
        # Search by username (case-insensitive, partial match)
        # Exclude current user from results
        return User.objects.filter(
            username__icontains=query
        ).exclude(
            id=self.request.user.id
        ).select_related('profile')[:10]  # Limit to 10 results

