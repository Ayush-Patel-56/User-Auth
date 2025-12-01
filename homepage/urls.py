from django.urls import path
from .views import landing_page, public_profile, dashboard

urlpatterns = [
    path('', landing_page, name='landing'),   # root URL
    path('dashboard/', dashboard, name='dashboard'),
    path('u/<str:username>/', public_profile, name='public-profile'),
]