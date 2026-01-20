from django.contrib import admin

from .models import Community, CommunityMembership, ChatMessage, Profile, UserPhoto, PhotoLike, PhotoComment

admin.site.register(Community)
admin.site.register(CommunityMembership)
admin.site.register(ChatMessage)
admin.site.register(Profile)
admin.site.register(UserPhoto)
admin.site.register(PhotoLike)
admin.site.register(PhotoComment)

from .models import EmailOTP
admin.site.register(EmailOTP)
