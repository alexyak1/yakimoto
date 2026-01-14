"""
Email notification service.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any

from ..config import settings


class EmailService:
    """Service for sending email notifications."""
    
    PAYMENT_DISPLAY_NAMES = {
        "stripe": "Stripe (Betalning genomförd)",
        "swish": "Swish",
        "bankgiro": "Bankgiro",
    }
    
    @classmethod
    def get_payment_display_name(cls, payment_method: str) -> str:
        """Get human-readable payment method name."""
        return cls.PAYMENT_DISPLAY_NAMES.get(payment_method, payment_method)
    
    @classmethod
    def compose_order_email(
        cls,
        customer: Dict[str, Any],
        items: List[Dict[str, Any]],
        payment_method: str
    ) -> str:
        """
        Compose order notification email body.
        
        Args:
            customer: Customer information
            items: List of order items
            payment_method: Payment method used
            
        Returns:
            Formatted email body
        """
        payment_display = cls.get_payment_display_name(payment_method)
        
        body = f"Ny beställning från {customer.get('firstName', '')} {customer.get('lastName', '')}\n\n"
        body += f"E-post: {customer.get('email', '')}\n"
        body += f"Telefon: {customer.get('phone', '')}\n"
        body += f"Betalning: {payment_display}\n\n"
        body += "Produkter:\n"
        
        for item in items:
            color = item.get('color', '')
            color_str = f" ({color})" if color else ""
            body += f"- {item.get('name')}{color_str} ({item.get('selectedSize')}) x{item.get('quantity')} – {item.get('price')} kr\n"
        
        return body
    
    @classmethod
    def send_order_notification(
        cls,
        customer: Dict[str, Any],
        items: List[Dict[str, Any]],
        payment_method: str
    ) -> bool:
        """
        Send order notification email.
        
        Args:
            customer: Customer information
            items: List of order items
            payment_method: Payment method used
            
        Returns:
            True if email was sent successfully
            
        Raises:
            Exception: If email sending fails
        """
        payment_display = cls.get_payment_display_name(payment_method)
        body = cls.compose_order_email(customer, items, payment_method)
        
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_USER
        msg["To"] = settings.EMAIL_RECEIVER
        msg["Subject"] = f"Ny beställning på Yakimoto Dojo ({payment_display})"
        msg.attach(MIMEText(body, "plain"))
        
        try:
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                print("Email sent.")
                return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            raise
