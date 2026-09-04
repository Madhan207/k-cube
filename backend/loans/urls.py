from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoanViewSet, LoanCalculatePreviewView

router = DefaultRouter()
router.register('', LoanViewSet, basename='loan')

urlpatterns = [
    path('calculate-preview/', LoanCalculatePreviewView.as_view(), name='loan_calculate_preview'),
    path('', include(router.urls)),
]
