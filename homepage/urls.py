from django.urls import path
from .views import landing_page, public_profile, dashboard, community_view

urlpatterns = [
    path('', landing_page, name='landing'),   # root URL
    path('dashboard/', dashboard, name='dashboard'),
    path('community/', community_view, name='community'),
    path('u/<str:username>/', public_profile, name='public-profile'),
]