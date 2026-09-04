from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentScheduleViewSet, RecordPaymentView, PaymentListView

router = DefaultRouter()
router.register('schedules', PaymentScheduleViewSet, basename='payment_schedule')

urlpatterns = [
    path('', include(router.urls)),
    path('record/', RecordPaymentView.as_view(), name='record_payment'),
    path('history/', PaymentListView.as_view(), name='payment_history'),
]
