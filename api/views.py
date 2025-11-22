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
    })
