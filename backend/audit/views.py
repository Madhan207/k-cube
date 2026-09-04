"""audit/views.py"""
from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer
from accounts.permissions import IsAdminUser


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'target_type']
    search_fields = ['actor_email', 'target_id', 'target_repr']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    queryset = AuditLog.objects.all()
