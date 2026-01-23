from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
import random
from homepage.models import EmailOTP

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied

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

        # Create the user BUT set as inactive until OTP verification
        user = serializer.save()
        user.is_active = False
        user.save()

        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        print(f"------------------------------------")
        print(f"DEBUG OTP for {user.email}: {otp_code}")
        print(f"------------------------------------")
        
        # Save OTP
        EmailOTP.objects.update_or_create(
            user=user,
            defaults={'otp': otp_code}
        )

        # Send Email
        try:
            send_mail(
                'Verify your account',
                f'Your OTP is: {otp_code}',
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            # If email fails, delete the user so they can try again
            user.delete()
            print(f"Error sending email: {e}")
            return Response({"detail": f"Error sending verification email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Return success (Do NOT return tokens yet)
        return Response({
            "detail": "OTP sent to email.",
            "email": user.email
        }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    POST /api/verify-otp/
    Body: { "email": "...", "otp": "..." }
    """
    email = request.data.get('email')
    otp = request.data.get('otp')

    if not email or not otp:
        return Response({"detail": "Email and OTP are required"}, status=400)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # Check database OTP
    try:
        email_otp = user.otp
    except EmailOTP.DoesNotExist:
        return Response({"detail": "No OTP generated for this user"}, status=400)

    if email_otp.otp == otp and email_otp.is_valid():
        # Success!
        user.is_active = True
        user.save()
        
        # Cleanup
        email_otp.delete()

        # Generate Tokens
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response({
            "message": "Account verified successfully",
            "access": str(access),
            "refresh": str(refresh),
            "username": user.username,
        })
    else:
        return Response({"detail": "Invalid or expired OTP"}, status=400)


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
from homepage.models import Profile, UserPhoto, Education, Experience, Skill
from .serializers import ProfileSerializer, UserPhotoSerializer, EducationSerializer, ExperienceSerializer, SkillSerializer

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

    def create(self, request, *args, **kwargs):
        # 1. Validation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Extract Data
        # Base64ImageField converts data to ContentFile, so validated_data['image'] is a file
        image_file = serializer.validated_data['image']
        caption = serializer.validated_data.get('caption', '')
        
        # 3. Manual Boto3 Upload (Bypass Storage Backend)
        import boto3
        from botocore.config import Config
        from django.conf import settings
        
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        file_path = f"gallery/{image_file.name}" # Define path manually
        
        upload_success = False
        last_error = ""

        # S3 Client Configuration
        # We try multiple region configurations to account for Supabase quirks
        regions_to_try = ['ap-southeast-1', 'us-east-1']
        
        for region in regions_to_try:
            try:
                print(f"DEBUG: Attempting upload to region {region}...")
                s3_client = boto3.client(
                    's3',
                    endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                    region_name=region,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID.strip() if settings.AWS_ACCESS_KEY_ID else None,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY.strip() if settings.AWS_SECRET_ACCESS_KEY else None,
                    config=Config(signature_version='s3v4')
                )
                
                # Reset file pointer just in case
                image_file.seek(0)
                
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=file_path,
                    Body=image_file.read()
                    # Removed ACL and ContentType to avoid Signature Mismatches if Supabase strips them
                )
                upload_success = True
                print(f"DEBUG: Upload SUCCESS with region {region}")
                break # Stop if success
            except Exception as e:
                print(f"DEBUG: Upload failed with region {region}: {e}")
                last_error = str(e)

        if not upload_success:
             return Response({"detail": f"Upload Failed (S3): {last_error}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Save to Database (Image path string only)
        # We manually create the object to avoid Model.save() triggering another upload
        photo = UserPhoto(
            user=request.user,
            caption=caption
        )
        # Manually set the name field (avoids storage backend upload)
        photo.image.name = file_path 
        photo.save()
        
        # Return standard response
        return Response(UserPhotoSerializer(photo, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        pass # Not used anymore since we override create()

class UserPhotoDetailView(generics.DestroyAPIView):
    queryset = UserPhoto.objects.all()
    serializer_class = UserPhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user can only delete their own photos
        return UserPhoto.objects.filter(user=self.request.user)

# -------------------------------------------------------------
# DEBUG S3 CONNECTION
# -------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def debug_s3_connection(request):
    import boto3
    from django.conf import settings
    
    try:
        # Check keys presence
        key_id = settings.AWS_ACCESS_KEY_ID
        secret = settings.AWS_SECRET_ACCESS_KEY
        
        if not key_id or not secret:
            return Response({"status": "error", "detail": "AWS Keys are MISSING in settings."}, status=500)

        # Try connection
        session = boto3.session.Session()
        s3 = session.client(
            's3',
            region_name=settings.AWS_S3_REGION_NAME,
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=key_id,
            aws_secret_access_key=secret,
        )
        
        # List buckets or just check object
        s3.list_buckets()
        
        return Response({
            "status": "success", 
            "detail": "S3 Connection Successful!",
            "key_prefix": key_id[:4] + "***",
            "bucket": settings.AWS_STORAGE_BUCKET_NAME
        })
    except Exception as e:
        return Response({
            "status": "error", 
            "detail": str(e),
            "type": type(e).__name__
        }, status=500)


# -------------------------------------------------------------
# EDUCATION MANAGEMENT (LIST / CREATE / UPDATE / DELETE)
# -------------------------------------------------------------
class EducationListCreateView(generics.ListCreateAPIView):
    """
    GET /api/education/ -> List user's education entries (or ?username=xyz)
    POST /api/education/ -> Add new education entry
    """
    serializer_class = EducationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        username = self.request.query_params.get('username')
        if username:
            return Education.objects.filter(user__username=username).order_by('-start_year')
        
        if self.request.user.is_authenticated:
            return Education.objects.filter(user=self.request.user).order_by('-start_year')
        return Education.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Authentication required.")
        serializer.save(user=self.request.user)

class EducationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/education/<id>/ -> Get education entry
    PUT /api/education/<id>/ -> Update education entry
    DELETE /api/education/<id>/ -> Delete education entry
    """
    serializer_class = EducationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user can only modify their own education entries
        return Education.objects.filter(user=self.request.user)

# -------------------------------------------------------------
# EXPERIENCE MANAGEMENT (LIST / CREATE / UPDATE / DELETE)
# -------------------------------------------------------------
class ExperienceListCreateView(generics.ListCreateAPIView):
    """
    GET /api/experience/ -> List user's experience entries (or ?username=xyz)
    POST /api/experience/ -> Add new experience entry
    """
    serializer_class = ExperienceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        username = self.request.query_params.get('username')
        if username:
            return Experience.objects.filter(user__username=username).order_by('-start_date')
        
        if self.request.user.is_authenticated:
            return Experience.objects.filter(user=self.request.user).order_by('-start_date')
        return Experience.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Authentication required.")
        serializer.save(user=self.request.user)

class ExperienceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/experience/<id>/ -> Get experience entry
    PUT /api/experience/<id>/ -> Update experience entry
    DELETE /api/experience/<id>/ -> Delete experience entry
    """
    serializer_class = ExperienceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user can only modify their own experience entries
        return Experience.objects.filter(user=self.request.user)

# -------------------------------------------------------------
# SKILL MANAGEMENT (LIST / CREATE / DELETE)
# -------------------------------------------------------------
class SkillListCreateView(generics.ListCreateAPIView):
    """
    GET /api/skills/ -> List user's skills (or ?username=xyz)
    POST /api/skills/ -> Add new skill
    """
    serializer_class = SkillSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        username = self.request.query_params.get('username')
        if username:
            return Skill.objects.filter(user__username=username).order_by('name')
        
        if self.request.user.is_authenticated:
            return Skill.objects.filter(user=self.request.user).order_by('name')
        return Skill.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Authentication required.")
        serializer.save(user=self.request.user)

class SkillDetailView(generics.DestroyAPIView):
    """
    DELETE /api/skills/<id>/ -> Delete skill
    """
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user can only delete their own skills
        return Skill.objects.filter(user=self.request.user)

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
# COMMUNITY CHAT (GLOBAL)
# -------------------------------------------------------------
from django.db.models import Count, Q

from homepage.models import (
    ChatMessage,
    Community, CommunityMembership, Conversation, DirectMessage, MessageReaction, CommunityMessageReaction
)
from .serializers import (
    ChatMessageSerializer,
    CommunitySerializer,
    CommunityMemberSerializer,
    DirectThreadSerializer,
    DirectMessageSerializer,
)

class ChatListCreateView(generics.ListCreateAPIView):
    """
    GET /api/chat/ -> List last 50 messages
    POST /api/chat/ -> Post new message
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Global chat = messages with no community
        return ChatMessage.objects.filter(community__isnull=True).order_by('-created_at')[:50]

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
        # Only allow deleting own *global* messages
        return ChatMessage.objects.filter(user=self.request.user, community__isnull=True)


# -------------------------------------------------------------
# PRIVATE COMMUNITIES
# -------------------------------------------------------------
class CommunityListCreateView(generics.ListCreateAPIView):
    serializer_class = CommunitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Community.objects.filter(memberships__user=self.request.user)
            .distinct()
            .order_by('name')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        community = serializer.save(created_by=self.request.user)
        CommunityMembership.objects.create(
            community=community,
            user=self.request.user,
            role=CommunityMembership.ROLE_ADMIN,
            added_by=self.request.user,
        )


class CommunityMembersView(generics.ListCreateAPIView):
    serializer_class = CommunityMemberSerializer
    permission_classes = [IsAuthenticated]

    def _get_community(self):
        return get_object_or_404(Community, pk=self.kwargs['community_id'])

    def _require_member(self, community):
        if not CommunityMembership.objects.filter(community=community, user=self.request.user).exists():
            raise PermissionDenied('You are not a member of this community.')

    def _require_admin(self, community):
        if not CommunityMembership.objects.filter(
            community=community,
            user=self.request.user,
            role=CommunityMembership.ROLE_ADMIN,
        ).exists():
            raise PermissionDenied('Only community admins can add members.')

    def get_queryset(self):
        community = self._get_community()
        self._require_member(community)
        return CommunityMembership.objects.filter(community=community).select_related('user', 'user__profile').order_by('user__username')

    def create(self, request, *args, **kwargs):
        community = self._get_community()
        self._require_admin(community)

        username = (request.data.get('username') or '').strip()
        if not username:
            return Response({'detail': 'username is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        membership, created = CommunityMembership.objects.get_or_create(
            community=community,
            user=user,
            defaults={'added_by': request.user, 'role': CommunityMembership.ROLE_MEMBER},
        )

        if not created:
            return Response({'detail': 'User is already a member'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommunityChatListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def _get_community(self):
        return get_object_or_404(Community, pk=self.kwargs['community_id'])

    def _require_member(self, community):
        if not CommunityMembership.objects.filter(community=community, user=self.request.user).exists():
            raise PermissionDenied('You are not a member of this community.')

    def get_queryset(self):
        community = self._get_community()
        self._require_member(community)
        return ChatMessage.objects.filter(community=community).order_by('-created_at')[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(reversed(queryset), many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        community = self._get_community()
        self._require_member(community)
        serializer.save(user=self.request.user, community=community)


class CommunityChatDetailView(generics.DestroyAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def _get_community(self):
        return get_object_or_404(Community, pk=self.kwargs['community_id'])

    def _require_member(self, community):
        if not CommunityMembership.objects.filter(community=community, user=self.request.user).exists():
            raise PermissionDenied('You are not a member of this community.')

    def get_queryset(self):
        community = self._get_community()
        self._require_member(community)
        # Only allow deleting your own messages within this community
        return ChatMessage.objects.filter(community=community, user=self.request.user)

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


# -------------------------------------------------------------
# DIRECT MESSAGES (1:1)
# -------------------------------------------------------------
class DirectThreadListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/dm/threads/            -> list user's threads (1:1 conversations)
    POST /api/dm/threads/ {username} -> create/get 1:1 thread with username

    Notes:
    - We use the existing Conversation model/table.
    - A DM thread is a Conversation with exactly 2 participants.
    """

    serializer_class = DirectThreadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Important: we must count *all* participants, not only the join rows filtered by the current user.
        # We do this via conditional aggregates.
        return (
            Conversation.objects
            .annotate(
                pcount=Count('participants', distinct=True),
                me_count=Count('participants', filter=Q(participants=self.request.user), distinct=True),
            )
            .filter(me_count=1, pcount=2)
            .prefetch_related('participants', 'participants__profile', 'messages')
            .order_by('-updated_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        username = (request.data.get('username') or '').strip()
        if not username:
            return Response({'detail': 'username is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if other == request.user:
            return Response({'detail': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Find existing 1:1 conversation (exactly two participants).
        existing = (
            Conversation.objects
            .annotate(
                pcount=Count('participants', distinct=True),
                me_count=Count('participants', filter=Q(participants=request.user), distinct=True),
                other_count=Count('participants', filter=Q(participants=other), distinct=True),
            )
            .filter(me_count=1, other_count=1, pcount=2)
            .order_by('-updated_at')
            .first()
        )

        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        convo = Conversation.objects.create()
        convo.participants.add(request.user, other)
        serializer = self.get_serializer(convo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DirectMessageListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/dm/threads/<id>/messages/ -> list last 50 messages (oldest first)
    POST /api/dm/threads/<id>/messages/ -> send message
    """

    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]

    def _get_thread(self):
        thread = get_object_or_404(Conversation, pk=self.kwargs['thread_id'])
        if not thread.participants.filter(pk=self.request.user.pk).exists():
            raise PermissionDenied('You are not a participant in this thread.')
        return thread

    def get_queryset(self):
        thread = self._get_thread()
        return DirectMessage.objects.filter(conversation=thread).order_by('-created_at')[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Mark all unread messages from other users as read
        thread = self._get_thread()
        thread.messages.filter(
            is_read=False
        ).exclude(
            sender=request.user
        ).update(is_read=True)
        
        serializer = self.get_serializer(reversed(queryset), many=True)
        return Response(serializer.data)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        thread = self._get_thread()
        serializer.save(conversation=thread, sender=self.request.user)


class DirectMessageDetailView(generics.DestroyAPIView):
    """
    DELETE /api/dm/messages/<id>/ -> delete your own DM message
    """

    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DirectMessage.objects.filter(sender=self.request.user)


# -------------------------------------------------------------
# MESSAGE REACTIONS
# -------------------------------------------------------------
@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def message_reaction_view(request, message_id):
    """
    POST   /api/dm/messages/<id>/react/ -> Add/update reaction
    DELETE /api/dm/messages/<id>/react/ -> Remove reaction
    """
    message = get_object_or_404(DirectMessage, pk=message_id)
    
    # Check if user is a participant in this conversation
    if not message.conversation.participants.filter(pk=request.user.pk).exists():
        raise PermissionDenied('You are not a participant in this conversation.')
    
    if request.method == 'POST':
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete any existing reaction from this user on this message (to enforce one reaction per user)
        MessageReaction.objects.filter(
            message=message,
            user=request.user
        ).delete()
        
        # Create the new reaction
        reaction = MessageReaction.objects.create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        return Response({
            'emoji': emoji,
            'created': True
        }, status=status.HTTP_201_CREATED)
    
    elif request.method == 'DELETE':
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted = MessageReaction.objects.filter(
            message=message,
            user=request.user,
            emoji=emoji
        ).delete()[0]
        
        return Response({
            'deleted': deleted > 0
        }, status=status.HTTP_200_OK)
# Add these two functions to the end of api/views.py

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def chat_reaction_view(request, message_id):
    """Handle reactions on global chat messages"""
    message = get_object_or_404(ChatMessage, pk=message_id)
    
    # Global chat is open to all authenticated users
    if message.community:
        raise PermissionDenied('This endpoint is for global chat only.')
    
    if request.method == 'POST':
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete any existing reaction to enforce one reaction per user
        CommunityMessageReaction.objects.filter(
            message=message,
            user=request.user
        ).delete()
        
        # Create new reaction
        CommunityMessageReaction.objects.create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        return Response({'emoji': emoji, 'created': True}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'DELETE':
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted = CommunityMessageReaction.objects.filter(
            message=message,
            user=request.user,
            emoji=emoji
        ).delete()[0]
        
        return Response({'deleted': deleted > 0}, status=status.HTTP_200_OK)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def community_chat_reaction_view(request, community_id, message_id):
    """Handle reactions on community chat messages"""
    community = get_object_or_404(Community, pk=community_id)
    message = get_object_or_404(ChatMessage, pk=message_id, community=community)
    
    # Check if user is a member
    if not CommunityMembership.objects.filter(community=community, user=request.user).exists():
        raise PermissionDenied('You are not a member of this community.')
    
    if request.method == 'POST':
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete any existing reaction to enforce one reaction per user
        CommunityMessageReaction.objects.filter(
            message=message,
            user=request.user
        ).delete()
        
        # Create new reaction
        CommunityMessageReaction.objects.create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        return Response({'emoji': emoji, 'created': True}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'DELETE':
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted = CommunityMessageReaction.objects.filter(
            message=message,
            user=request.user,
            emoji=emoji
        ).delete()[0]
        
        return Response({'deleted': deleted > 0}, status=status.HTTP_200_OK)
