from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, resolve_username, me_view, 
    ProfileDetailView, UserPhotoListCreateView, UserPhotoDetailView,
    EducationListCreateView, EducationDetailView,
    ExperienceListCreateView, ExperienceDetailView,
    SkillListCreateView, SkillDetailView,
    toggle_like, PhotoCommentListView, PhotoCommentDetailView,
    google_auth,
    ChatListCreateView,
    ChatDetailView,
    UserSearchView,
    CommunityListCreateView,
    CommunityMembersView,
    CommunityChatListCreateView,
    CommunityChatDetailView,
    DirectThreadListCreateView,
    DirectMessageListCreateView,
    DirectMessageDetailView,
    message_reaction_view,
    chat_reaction_view,
    community_chat_reaction_view,
    verify_otp,
    debug_s3_connection,
)
from .views_call import get_call_token

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api-register'),
    path('verify-otp/', verify_otp, name='api-verify-otp'),
    path('resolve-username/', resolve_username, name='resolve-username'),
    path('me/', me_view, name='api-me'),
    
    # Profile & Gallery
    path('profile/', ProfileDetailView.as_view(), name='api-profile'),
    path('photos/', UserPhotoListCreateView.as_view(), name='api-photos-list'),
    path('photos/<int:pk>/', UserPhotoDetailView.as_view(), name='api-photos-detail'),

    # Education
    path('education/', EducationListCreateView.as_view(), name='api-education-list'),
    path('education/<int:pk>/', EducationDetailView.as_view(), name='api-education-detail'),

    # Experience
    path('experience/', ExperienceListCreateView.as_view(), name='api-experience-list'),
    path('experience/<int:pk>/', ExperienceDetailView.as_view(), name='api-experience-detail'),

    # Skills
    path('skills/', SkillListCreateView.as_view(), name='api-skills-list'),
    path('skills/<int:pk>/', SkillDetailView.as_view(), name='api-skills-detail'),

    # JWT Login + Token Refresh
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Likes & Comments
    path('photos/<int:photo_id>/like/', toggle_like, name='api-photo-like'),
    path('photos/<int:photo_id>/comments/', PhotoCommentListView.as_view(), name='api-photo-comments'),
    path('comments/<int:pk>/', PhotoCommentDetailView.as_view(), name='api-comment-delete'),

    # Google Auth
    path('auth/google/', google_auth, name='google-auth'),

    # Global Chat
    path('chat/', ChatListCreateView.as_view(), name='api-chat-list'),
    path('chat/<int:pk>/', ChatDetailView.as_view(), name='api-chat-detail'),
    path('chat/<int:message_id>/react/', chat_reaction_view, name='api-chat-react'),

    # Private Communities
    path('communities/', CommunityListCreateView.as_view(), name='api-community-list'),
    path('communities/<int:community_id>/members/', CommunityMembersView.as_view(), name='api-community-members'),
    path('communities/<int:community_id>/chat/', CommunityChatListCreateView.as_view(), name='api-community-chat-list'),
    path('communities/<int:community_id>/chat/<int:pk>/', CommunityChatDetailView.as_view(), name='api-community-chat-detail'),
    path('communities/<int:community_id>/chat/<int:message_id>/react/', community_chat_reaction_view, name='api-community-chat-react'),

    # Direct Messages (1:1)
    path('dm/threads/', DirectThreadListCreateView.as_view(), name='api-dm-threads'),
    path('dm/threads/<int:thread_id>/messages/', DirectMessageListCreateView.as_view(), name='api-dm-thread-messages'),
    path('dm/messages/<int:pk>/', DirectMessageDetailView.as_view(), name='api-dm-message-delete'),
    path('dm/messages/<int:message_id>/react/', message_reaction_view, name='api-dm-message-react'), # Added message reaction URL

    # User Search
    path('search/users/', UserSearchView.as_view(), name='api-user-search'),

    # Calling
    path('call/token/<int:thread_id>/', get_call_token, name='api-call-token'),
    
    # Debug
    path('debug-s3/', debug_s3_connection, name='api-debug-s3'),
]
