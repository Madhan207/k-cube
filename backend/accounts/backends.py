"""
accounts/backends.py
"""
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrMobileBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Allow authentication via email or mobile
        # SimpleJWT might pass 'email' instead of 'username' because of USERNAME_FIELD
        identifier = username or kwargs.get('email') or kwargs.get('mobile')
        if not identifier:
            return None
            
        try:
            user = User.objects.get(Q(email=identifier) | Q(mobile=identifier))
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except User.DoesNotExist:
            return None
