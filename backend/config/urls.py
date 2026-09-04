"""
K-CUBE Loan System — Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/borrowers/', include('borrowers.urls')),
    path('api/lenders/', include('lenders.urls')),
    path('api/kyc/', include('kyc.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/agreements/', include('agreements.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/audit-logs/', include('audit.urls')),
    path('api/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
