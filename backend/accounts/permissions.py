"""
accounts/permissions.py — Custom DRF permission classes
"""
from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allow access only to Admin or Super Admin users."""
    message = 'You do not have admin access.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsSuperAdmin(BasePermission):
    """Allow access only to Super Admin users."""
    message = 'You do not have super admin access.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_super_admin)


class IsBorrower(BasePermission):
    """Allow access only to Borrower users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_borrower)


class IsOwnerOrAdmin(BasePermission):
    """Allow access to the owner or admin."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True

        user = request.user
        if hasattr(obj, 'user') and obj.user and getattr(obj, 'user_id', None) == user.id:
            return True
        if hasattr(obj, 'uploaded_by') and obj.uploaded_by and getattr(obj, 'uploaded_by_id', None) == user.id:
            return True
        if hasattr(obj, 'created_by') and obj.created_by and getattr(obj, 'created_by_id', None) == user.id:
            return True

        borrower = None
        if hasattr(obj, 'borrower') and obj.borrower:
            borrower = obj.borrower
        elif hasattr(obj, 'loan') and obj.loan and hasattr(obj.loan, 'borrower'):
            borrower = obj.loan.borrower

        if borrower:
            if getattr(borrower, 'user_id', None) and borrower.user_id == user.id:
                return True
            if getattr(borrower, 'email', None) and borrower.email.lower() == user.email.lower():
                return True
            if getattr(borrower, 'mobile', None) and borrower.mobile == user.mobile:
                return True

        return False
