"""
K-CUBE Loan System — Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        'status': 'online',
        'message': 'K-CUBE Audit & FinServ API is operational',
        'version': '1.0.0'
    })

urlpatterns = [
    path('', health_check, name='root_health_check'),
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
