from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Disable rate limiting in dev
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
