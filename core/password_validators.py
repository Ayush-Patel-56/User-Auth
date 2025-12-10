import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    """
    Validate that the password contains:
    - At least 8 characters
    - At least one uppercase letter
    - At least one number
    - At least one special character
    
    This matches the frontend validation rules.
    """
    
    def validate(self, password, user=None):
        # Check minimum length
        if len(password) < 8:
            raise ValidationError(
                _("Password must be at least 8 characters long."),
                code='password_too_short',
            )
        
        # Check for uppercase letter
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code='password_no_upper',
            )
        
        # Check for number
        if not re.search(r'[0-9]', password):
            raise ValidationError(
                _("Password must contain at least one number."),
                code='password_no_number',
            )
        
        # Check for special character
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
            raise ValidationError(
                _("Password must contain at least one special character."),
                code='password_no_special',
            )
    
    def get_help_text(self):
        return _(
            "Your password must contain at least 8 characters, "
            "including one uppercase letter, one number, and one special character."
        )
