from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, default="This is my personal corner of the internet.")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    # Social Links
    instagram = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    github = models.URLField(blank=True)
    gmail = models.EmailField(blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def display_name(self):
        import re
        match = re.match(r"([a-zA-Z]+)", self.user.username)
        return match.group(1).capitalize() if match else self.user.username

class UserPhoto(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='gallery/')
    caption = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo by {self.user.username} at {self.created_at}"
