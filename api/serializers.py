from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify


from homepage.models import (
    Profile,
    UserPhoto,
    PhotoLike,
    PhotoComment,
    ChatMessage,
    Community,
    CommunityMembership,
    Conversation,
    DirectMessage,
    Education,
    MessageReaction,
)


class ChatMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()
    community_id = serializers.IntegerField(source='community.id', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'username', 'avatar', 'text', 'created_at', 'is_me', 'community_id']
        read_only_fields = ['id', 'username', 'avatar', 'created_at', 'is_me', 'community_id']

    def get_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return None

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False

class CommunitySerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = ['id', 'name', 'slug', 'is_private', 'created_at', 'member_count', 'is_admin']
        read_only_fields = ['id', 'slug', 'created_at', 'member_count', 'is_admin']

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_is_admin(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return CommunityMembership.objects.filter(
            community=obj,
            user=request.user,
            role=CommunityMembership.ROLE_ADMIN,
        ).exists()


class CommunityMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = CommunityMembership
        fields = ['username', 'display_name', 'avatar', 'role', 'added_at']
        read_only_fields = ['username', 'display_name', 'avatar', 'role', 'added_at']

    def get_display_name(self, obj):
        if hasattr(obj.user, 'profile'):
            return obj.user.profile.display_name
        return obj.user.username

    def get_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return None


class MessageReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'username', 'created_at']
        read_only_fields = ['id', 'username', 'created_at']


class DirectMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='sender.username', read_only=True)
    avatar = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = ['id', 'text', 'username', 'avatar', 'created_at', 'is_me', 'reactions']
        read_only_fields = ['id', 'username', 'avatar', 'created_at', 'is_me', 'reactions']

    def get_avatar(self, obj):
        if hasattr(obj.sender, 'profile') and obj.sender.profile.avatar:
            return obj.sender.profile.avatar.url
        return None

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.sender == request.user
        return False
    
    def get_reactions(self, obj):
        """Group reactions by emoji with list of users"""
        from collections import defaultdict
        reaction_groups = defaultdict(list)
        
        for reaction in obj.reactions.all():
            reaction_groups[reaction.emoji].append({
                'username': reaction.user.username,
                'is_me': reaction.user == self.context.get('request').user if self.context.get('request') else False
            })
        
        # Convert to list format
        return [
            {
                'emoji': emoji,
                'count': len(users),
                'users': users
            }
            for emoji, users in reaction_groups.items()
        ]


class DirectThreadSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message', 'unread_count', 'updated_at', 'created_at']
        read_only_fields = ['id', 'updated_at', 'created_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        other = obj.other_user(request.user)
        if not other:
            return None
        return {
            'username': other.username,
            'display_name': getattr(other, 'profile', None).display_name if hasattr(other, 'profile') else other.username,
            'avatar': other.profile.avatar.url if hasattr(other, 'profile') and other.profile.avatar else None,
            'profile_url': f'/u/{other.username}/',
        }

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if not last:
            return None
        return {
            'text': last.text,
            'created_at': last.created_at,
            'username': last.sender.username,
        }
    
    def get_unread_count(self, obj):
        """Count unread messages in this conversation for the current user."""
        request = self.context.get('request')
        if not request or not request.user:
            return 0
        
        # Count messages sent by other user that haven't been read
        return obj.messages.filter(
            is_read=False
        ).exclude(
            sender=request.user
        ).count()


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Profile
        fields = ['username', 'email', 'title', 'description', 'avatar', 'instagram', 'linkedin', 'github', 'gmail', 'gender']

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = ['id', 'organization', 'location', 'start_year', 'end_year', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class CommentSerializer(serializers.ModelSerializer):

    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.SerializerMethodField()
    parent_id = serializers.IntegerField(source='parent.id', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = PhotoComment
        fields = ['id', 'username', 'avatar', 'text', 'created_at', 'parent_id', 'replies']
        read_only_fields = ['id', 'username', 'avatar', 'created_at', 'parent_id', 'replies']

    def get_avatar(self, obj):
        if obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return None

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True).data
        return []

class UserPhotoSerializer(serializers.ModelSerializer):
    is_liked = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()

    class Meta:
        model = UserPhoto
        fields = ['id', 'image', 'caption', 'created_at', 'is_liked', 'like_count']
        read_only_fields = ['created_at', 'is_liked', 'like_count']

    def get_is_liked(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return PhotoLike.objects.filter(user=user, photo=obj).exists()
        return False

    def get_like_count(self, obj):
        return obj.likes.count()

class UserSearchSerializer(serializers.ModelSerializer):
    """Minimal serializer for user search results"""
    display_name = serializers.CharField(source='profile.display_name', read_only=True)
    avatar = serializers.SerializerMethodField()
    profile_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'display_name', 'avatar', 'profile_url']
        read_only_fields = ['username', 'display_name', 'avatar', 'profile_url']

    def get_avatar(self, obj):
        if hasattr(obj, 'profile') and obj.profile.avatar:
            return obj.profile.avatar.url
        return None

    def get_profile_url(self, obj):
        return f'/u/{obj.username}/'

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    # Override username to remove strict validators (allow spaces)
    username = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        # Allow spaces, just strip whitespace
        raw_username = attrs['username'].strip()

        if User.objects.filter(username__iexact=raw_username).exists():
            raise serializers.ValidationError({"username": "Username already taken."})

        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Email already exists."})

        attrs['username'] = raw_username
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')

        user = User.objects.create_user(password=password, **validated_data)
        
        # Extract name from username (e.g. "piyush13" -> "Piyush")
        import re
        match = re.match(r"([a-zA-Z]+)", user.username)
        display_name = match.group(1).capitalize() if match else user.username

        # Create profile with dynamic title & description
        Profile.objects.create(
            user=user,
            title=f"{display_name}'s Profile",
            description=f"Hello this is {display_name} and This is my personal corner of the internet."
        )
        
        return user
