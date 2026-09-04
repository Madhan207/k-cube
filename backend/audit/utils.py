"""
audit/utils.py — Helper to create audit log entries
"""
from .models import AuditLog


def log_action(actor, action, target_type='', target_id='', request=None,
               target_repr='', extra_data=None):
    """
    Create an audit log entry. Call from any view.
    """
    ip_address = None
    user_agent = ''

    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip_address = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

    AuditLog.objects.create(
        actor=actor if actor and actor.is_authenticated else None,
        actor_email=actor.email if actor and actor.is_authenticated else '',
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        target_repr=target_repr,
        ip_address=ip_address,
        user_agent=user_agent,
        extra_data=extra_data or {},
    )
