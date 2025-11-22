from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, resolve_username, me_view

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api-register'),
    path('resolve-username/', resolve_username, name='resolve-username'),
    path('me/', me_view, name='api-me'),

    # JWT Login + Token Refresh
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
