"""
borrowers/views.py
"""
from rest_framework import generics, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend

from .models import Borrower
from .serializers import BorrowerSerializer, BorrowerCreateSerializer, BorrowerSummarySerializer
from accounts.permissions import IsAdminUser, IsOwnerOrAdmin
from audit.utils import log_action


class BorrowerViewSet(ModelViewSet):
    queryset = Borrower.objects.select_related('user', 'kyc_profile').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'pan_verified', 'gender', 'state']
    search_fields = ['full_name', 'borrower_id', 'mobile', 'email', 'pan_number']
    ordering_fields = ['created_at', 'full_name', 'borrower_id']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return BorrowerCreateSerializer
        if self.action == 'list':
            return BorrowerSummarySerializer
        return BorrowerSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'suspend', 'reactivate']:
            return [IsAdminUser()]
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Borrower.objects.select_related('user').all()
        # Borrowers can only see their own profile
        return Borrower.objects.filter(user=user)

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg, '')

        import uuid
        try:
            uuid.UUID(pk)
            obj = queryset.get(id=pk)
        except (ValueError, TypeError, Borrower.DoesNotExist):
            try:
                obj = queryset.get(borrower_id=pk)
            except Borrower.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound('Borrower not found.')

        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        borrower = serializer.save(created_by=self.request.user)
        log_action(self.request.user, 'PROFILE_UPDATE', 'borrower',
                   borrower.borrower_id, self.request, target_repr=borrower.full_name)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def suspend(self, request, pk=None):
        borrower = self.get_object()
        borrower.status = Borrower.Status.SUSPENDED
        borrower.save()
        log_action(request.user, 'ACCOUNT_SUSPENDED', 'borrower',
                   borrower.borrower_id, request, target_repr=borrower.full_name)
        return Response({'message': 'Borrower account suspended.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reactivate(self, request, pk=None):
        borrower = self.get_object()
        borrower.status = Borrower.Status.ACTIVE
        borrower.save()
        log_action(request.user, 'ACCOUNT_REACTIVATED', 'borrower',
                   borrower.borrower_id, request, target_repr=borrower.full_name)
        return Response({'message': 'Borrower account reactivated.'})

    @action(detail=True, methods=['get'], permission_classes=[IsOwnerOrAdmin])
    def loans(self, request, pk=None):
        from loans.serializers import LoanSummarySerializer
        borrower = self.get_object()
        loans = borrower.loans.all()
        return Response(LoanSummarySerializer(loans, many=True).data)

    @action(detail=True, methods=['get'], permission_classes=[IsOwnerOrAdmin])
    def kyc_status(self, request, pk=None):
        from kyc.serializers import KYCProfileSerializer
        borrower = self.get_object()
        try:
            profile = borrower.kyc_profile
            return Response(KYCProfileSerializer(profile).data)
        except Exception:
            return Response({'overall_status': 'NOT_STARTED', 'message': 'KYC not initiated.'})
