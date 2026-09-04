"""
accounts/emails.py — Email helpers for K-CUBE Audit & FinServ
"""
import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger('kcube')


def send_password_reset_email(user, reset_url):
    """
    Send a branded password reset email to the user.
    """
    subject = "Reset Your K-CUBE Account Password"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'K-CUBE Audit & FinServ <hrkcube@gmail.com>')
    to_email = [user.email]

    user_name = user.full_name or "Valued Customer"

    # Plain text version
    text_content = f"""Hello {user_name},

We received a request to reset the password for your K-CUBE Audit & FinServ account.

To create a new password, click the link below or copy and paste it into your browser:
{reset_url}

This password reset link will expire after 30 minutes.

If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.

Regards,

K-CUBE Audit & FinServ
a MasterMind Group
Phone: +91 98656 82992
Email: hrkcube@gmail.com
Address: #7, KVS Complex, Salem Main Road, Kalipatti
"""

    # HTML version with K-CUBE branding
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your K-CUBE Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
                    
                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="background-color: #0d2d1a; padding: 32px 24px; border-bottom: 3px solid #b88600;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">K-CUBE Audit & FinServ</h1>
                            <p style="color: #d4a017; margin: 4px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">a MasterMind Group Company</p>
                        </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="color: #0d2d1a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Hello {user_name},</h2>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                                We received a request to reset the password for your K-CUBE Audit & FinServ account. Click the button below to create a new secure password.
                            </p>

                            <!-- BUTTON -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                                <tr>
                                    <td align="center">
                                        <a href="{reset_url}" target="_blank" style="display: inline-block; background-color: #1a4a2e; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(26,74,46,0.25);">
                                            RESET PASSWORD
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fff8e1; border-left: 4px solid #b88600; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                                <p style="margin: 0; font-size: 13px; color: #8a6400; font-weight: 600;">
                                    ⏱ This password reset link will expire after <strong>30 minutes</strong>.
                                </p>
                            </div>

                            <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin-bottom: 24px;">
                                If you did not request this password reset, you can safely ignore this email. Your account password will remain unchanged.
                            </p>

                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">

                            <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.4;">
                                If the button above doesn't work, copy and paste this URL into your web browser:<br>
                                <a href="{reset_url}" style="color: #1a4a2e; word-break: break-all;">{reset_url}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1a4a2e;">K-CUBE Audit & FinServ</p>
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">a MasterMind Group Company</p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                Phone: +91 98656 82992 | Email: hrkcube@gmail.com<br>
                                #7, KVS Complex, Salem Main Road, Kalipatti
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    
    try:
        msg.send(fail_silently=False)
        logger.info(f"Password reset email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}")
        return False
