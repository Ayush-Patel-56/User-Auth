from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        raw_username = attrs['username']
        slug_username = slugify(raw_username)

        if User.objects.filter(username__iexact=slug_username).exists():
            raise serializers.ValidationError({"username": "Username already taken."})

        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Email already exists."})

        attrs['username'] = slug_username
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')

        user = User.objects.create_user(password=password, **validated_data)
        return user
