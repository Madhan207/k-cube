"""
audit/middleware.py — Lightweight request audit middleware
"""
import logging

logger = logging.getLogger('kcube')


class AuditLogMiddleware:
    """
    Lightweight middleware that logs unusual/suspicious requests.
    Detailed audit logging is done per-view using audit.utils.log_action.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Log 4xx/5xx errors for investigation
        if response.status_code >= 400:
            logger.warning(
                f'{request.method} {request.path} → {response.status_code} '
                f'| IP: {self._get_ip(request)}'
            )
        return response

    def _get_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
