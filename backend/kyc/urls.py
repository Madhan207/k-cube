from django.urls import path
from . import views

urlpatterns = [
    path('', views.KYCListAdminView.as_view(), name='kyc_list'),
    path('<str:borrower_id>/', views.KYCProfileView.as_view(), name='kyc_profile'),
    path('<str:borrower_id>/admin-action/', views.KYCAdminActionView.as_view(), name='kyc_admin_action'),
    path('<str:borrower_id>/request-review/', views.KYCRequestReviewView.as_view(), name='kyc_request_review'),
    path('verify/pan/', views.PANVerifyView.as_view(), name='pan_verify'),
    path('verify/aadhaar/initiate/', views.AadhaarInitiateView.as_view(), name='aadhaar_initiate'),
    path('verify/aadhaar/otp/', views.AadhaarVerifyOTPView.as_view(), name='aadhaar_verify_otp'),
    path('<str:borrower_id>/bank-account/', views.BankAccountUpdateView.as_view(), name='bank_account_update'),
]
