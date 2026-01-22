from django.db import models
from django.contrib.auth.models import User
from django.db.models import UniqueConstraint
from django.utils.text import slugify
from django.utils import timezone
import random

class EmailOTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # Valid for 10 minutes
        return timezone.now() - self.created_at < timezone.timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.user.username}"


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
    
    slug = models.SlugField(max_length=100, blank=True)
    
    # Activity tracking for online status
    last_activity = models.DateTimeField(auto_now=True)

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

class Education(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='education')
    organization = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    start_year = models.IntegerField()
    end_year = models.IntegerField(null=True, blank=True)  # null means "Present"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_year']  # Most recent first

    def __str__(self):
        end = self.end_year if self.end_year else "Present"
        return f"{self.user.username} - {self.organization} ({self.start_year}-{end})"

class Experience(models.Model):
    EMPLOYMENT_TYPES = [
        ('FULL_TIME', 'Full-time'),
        ('PART_TIME', 'Part-time'),
        ('SELF_EMPLOYED', 'Self-employed'),
        ('FREELANCE', 'Freelance'),
        ('INTERNSHIP', 'Internship'),
        ('TRAINEE', 'Trainee'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='experiences')
    title = models.CharField(max_length=200)  # Job title/position
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES)
    company = models.CharField(max_length=200)  # Company or organization
    location = models.CharField(max_length=200, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # null means "Present"
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']  # Most recent first

    def __str__(self):
        end = self.end_date.strftime('%Y-%m') if self.end_date else "Present"
        start = self.start_date.strftime('%Y-%m')
        return f"{self.user.username} - {self.title} at {self.company} ({start} - {end})"

class Skill(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']  # Alphabetical order
        unique_together = ['user', 'name']  # Prevent duplicate skills for same user

    def __str__(self):
        return f"{self.user.username} - {self.name}"

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
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} on {self.photo.id}: {self.text[:20]}"

class Community(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='communities_created')
    is_private = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:110] or 'community'
            slug = base
            i = 1
            while Community.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CommunityMembership(models.Model):
    ROLE_ADMIN = 'admin'
    ROLE_MEMBER = 'member'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_MEMBER, 'Member'),
    ]

    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='community_members_added',
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            UniqueConstraint(fields=['community', 'user'], name='unique_community_user_membership'),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.community.slug} ({self.role})"


class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    community = models.ForeignKey(Community, on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        scope = self.community.slug if self.community_id else 'global'
        return f"[{scope}] {self.user.username}: {self.text[:20]}"


class Conversation(models.Model):
    """A conversation between users.

    The database already contains these tables:
      - homepage_conversation
      - homepage_conversation_participants
      - homepage_directmessage

    For 1:1 messaging we treat conversations with exactly 2 participants as DMs.
    """

    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def other_user(self, me):
        # For 1:1 conversations, return the other participant.
        if not me:
            return None
        qs = self.participants.exclude(pk=me.pk)
        return qs.first()

    def __str__(self):
        return f"Conversation {self.pk}"


class DirectMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dm_messages_sent')
    text = models.TextField()  # Stores encrypted data
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        """Override save to encrypt message text before storing."""
        # Encrypt message if not already encrypted
        # if self.text and not self._is_encrypted(self.text):
        #     from .encryption import MessageEncryption
        #     self.text = MessageEncryption.encrypt(self.text)
        
        super().save(*args, **kwargs)
        
        # Keep conversation ordering fresh for inbox sorting
        Conversation.objects.filter(pk=self.conversation_id).update(updated_at=timezone.now())
    
    def _is_encrypted(self, text):
        """
        Check if text is already encrypted.
        Fernet encrypted strings start with 'gAAAAA' prefix.
        """
        return text.startswith('gAAAAA')
    
    def get_decrypted_text(self):
        """Get the decrypted message text."""
        from .encryption import MessageEncryption
        return MessageEncryption.decrypt(self.text)

    def __str__(self):
        return f"[DM {self.conversation_id}] {self.sender.username}: {self.text[:20]}"


class MessageReaction(models.Model):
    """Emoji reactions on direct messages (WhatsApp-style)"""
    message = models.ForeignKey(DirectMessage, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dm_reactions')
    emoji = models.CharField(max_length=10)  # Unicode emoji character
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # One user can only have ONE reaction per message (can change emoji, but only one at a time)
        unique_together = [['message', 'user']]
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user.username} {self.emoji} on DM {self.message_id}"


class CommunityMessageReaction(models.Model):
    """Emoji reactions on community/global chat messages"""
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_reactions')
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['message', 'user']]  # One reaction per user per message
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user.username} {self.emoji} on Chat {self.message_id}"
