from django.utils import timezone
from .models import Profile

class ActiveUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated:
            # Update last_activity with minimal overhead
            # We use update() to avoid triggering signals/other saves if possible, 
            # but auto_now=True needs save().
            # Let's just retrieve and save profile efficiently.
            
            try:
                # Get or create profile to be safe
                profile, created = Profile.objects.get_or_create(user=request.user)
                
                # Only update if more than 1 minute has passed to reduce DB writes
                # But for now, let's just save() to ensure auto_now works
                profile.save(update_fields=['last_activity'])
                
            except Exception:
                pass
                
        return response
