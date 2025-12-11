from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, default="This is my personal corner of the internet.")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    # Social Links
    def validate_instagram(value):
        if "instagram.com" not in value.lower():
            from django.core.exceptions import ValidationError
            raise ValidationError("Please enter a valid Instagram URL.")

    def validate_linkedin(value):
        if "linkedin.com" not in value.lower():
            from django.core.exceptions import ValidationError
            raise ValidationError("Please enter a valid LinkedIn URL.")

    def validate_github(value):
        if "github.com" not in value.lower():
            from django.core.exceptions import ValidationError
            raise ValidationError("Please enter a valid GitHub URL.")

    instagram = models.URLField(blank=True, validators=[validate_instagram])
    linkedin = models.URLField(blank=True, validators=[validate_linkedin])
    github = models.URLField(blank=True, validators=[validate_github])
    gmail = models.EmailField(blank=True)

    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def display_name(self):
        import re
        match = re.match(r"([a-zA-Z]+)", self.user.username)
        return match.group(1).capitalize() if match else self.user.username

    @property
    def pronouns(self):
        PRONOUN_MAP = {
            'M': '(he/him)',
            'F': '(she/her)',
            'O': '(they/them)',
            'N': '',
            None: '',
            '': ''
        }
        return PRONOUN_MAP.get(self.gender, '')

class UserPhoto(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='gallery/')
    caption = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo by {self.user.username} at {self.created_at}"

class PhotoLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='photo_likes')
    photo = models.ForeignKey(UserPhoto, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'photo'], name='unique_user_photo_like')
        ]

    def __str__(self):
        return f"{self.user.username} likes {self.photo.id}"

class PhotoComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='photo_comments')
    photo = models.ForeignKey(UserPhoto, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} on {self.photo.id}: {self.text[:20]}"

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}: {self.text[:20]}"
