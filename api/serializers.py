from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify


from homepage.models import Profile, UserPhoto, PhotoLike, PhotoComment, ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'username', 'avatar', 'text', 'created_at', 'is_me']
        read_only_fields = ['id', 'username', 'avatar', 'created_at', 'is_me']

    def get_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return None

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Profile
        fields = ['username', 'email', 'title', 'description', 'avatar', 'instagram', 'linkedin', 'github', 'gmail', 'gender']

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
