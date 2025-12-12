from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, resolve_username, me_view, 
    ProfileDetailView, UserPhotoListCreateView, UserPhotoDetailView,
    toggle_like, PhotoCommentListView, PhotoCommentDetailView,
    google_auth, ChatListCreateView, ChatDetailView, UserSearchView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api-register'),
    path('resolve-username/', resolve_username, name='resolve-username'),
    path('me/', me_view, name='api-me'),
    
    # Profile & Gallery
    path('profile/', ProfileDetailView.as_view(), name='api-profile'),
    path('photos/', UserPhotoListCreateView.as_view(), name='api-photos-list'),
    path('photos/<int:pk>/', UserPhotoDetailView.as_view(), name='api-photos-detail'),

    # JWT Login + Token Refresh
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Likes & Comments
    path('photos/<int:photo_id>/like/', toggle_like, name='api-photo-like'),
    path('photos/<int:photo_id>/comments/', PhotoCommentListView.as_view(), name='api-photo-comments'),
    path('comments/<int:pk>/', PhotoCommentDetailView.as_view(), name='api-comment-delete'),

    # Google Auth
    path('auth/google/', google_auth, name='google-auth'),

    # Community Chat
    path('chat/', ChatListCreateView.as_view(), name='api-chat-list'),
    path('chat/<int:pk>/', ChatDetailView.as_view(), name='api-chat-detail'),

    # User Search
    path('search/users/', UserSearchView.as_view(), name='api-user-search'),
]
