from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgreementViewSet

router = DefaultRouter()
router.register('', AgreementViewSet, basename='agreement')

urlpatterns = [path('', include(router.urls))]
