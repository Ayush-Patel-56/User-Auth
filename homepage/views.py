from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User

# -------------------------------------------------------------
# LANDING PAGE — ROOT URL "/"
# -------------------------------------------------------------
def landing_page(request):
    return render(request, "homepage/index.html")

# -------------------------------------------------------------
# PUBLIC PROFILE PAGE — "/u/<username>/"
# -------------------------------------------------------------
def public_profile(request, username):
    user = get_object_or_404(User, username=username)
    return render(request, "homepage/public_profile.html", {
        "user_obj": user
    })

# -------------------------------------------------------------
# DASHBOARD (EDIT PAGE)
# -------------------------------------------------------------
def dashboard(request):
    return render(request, "homepage/dashboard.html")

