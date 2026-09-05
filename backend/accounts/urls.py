from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('verify-otp/', views.VerifyOTPView.as_view(), name='verify_otp'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('me/', views.ProfileView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/validate/', views.ValidateResetTokenView.as_view(), name='reset_password_validate'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    # Admin
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<uuid:id>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
]
