from django.db import models
from django.contrib.auth.models import User
from django.db.models import UniqueConstraint
from django.utils.text import slugify
from django.utils import timezone

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
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Keep conversation ordering fresh for inbox sorting.
        Conversation.objects.filter(pk=self.conversation_id).update(updated_at=timezone.now())

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
