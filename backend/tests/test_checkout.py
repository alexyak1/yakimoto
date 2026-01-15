"""
Tests for checkout and payment flow.
"""
import json
import sqlite3
from unittest.mock import MagicMock, patch

import pytest


class TestStripePublishableKey:
    """Tests for Stripe publishable key endpoint."""
    
    def test_get_stripe_key_configured(self, client):
        """Should return publishable key when configured."""
        response = client.get("/stripe-publishable-key")
        
        assert response.status_code == 200
        data = response.json()
        assert "publishable_key" in data
        assert data["publishable_key"] == "pk_test_fake"
    
    def test_get_stripe_key_not_configured(self, client, monkeypatch):
        """Should return 500 when key not configured."""
        from app.config import settings
        monkeypatch.setattr(settings, "STRIPE_PUBLISHABLE_KEY", "")
        
        response = client.get("/stripe-publishable-key")
        
        assert response.status_code == 500


class TestCreatePaymentIntent:
    """Tests for payment intent creation."""
    
    @patch("stripe.PaymentIntent.create")
    def test_create_payment_intent_success(self, mock_create, client):
        """Should create payment intent successfully."""
        mock_intent = MagicMock()
        mock_intent.client_secret = "pi_test_secret"
        mock_create.return_value = mock_intent
        
        order_data = {
            "total": 1500,
            "customer": {
                "email": "test@example.com",
                "firstName": "John",
                "lastName": "Doe"
            },
            "items": [{"id": 1, "name": "Test Product"}]
        }
        
        response = client.post("/create-payment-intent", json=order_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "client_secret" in data
        assert data["client_secret"] == "pi_test_secret"
    
    @patch("stripe.PaymentIntent.create")
    def test_create_payment_intent_amount_in_cents(self, mock_create, client):
        """Should convert amount to cents for Stripe."""
        mock_intent = MagicMock()
        mock_intent.client_secret = "pi_test_secret"
        mock_create.return_value = mock_intent
        
        order_data = {"total": 1500}  # 1500 SEK
        
        client.post("/create-payment-intent", json=order_data)
        
        # Verify Stripe was called with amount in cents
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["amount"] == 150000  # 1500 * 100
        assert call_kwargs["currency"] == "sek"
    
    @patch("stripe.PaymentIntent.create")
    def test_create_payment_intent_stripe_error(self, mock_create, client):
        """Should handle Stripe errors gracefully."""
        mock_create.side_effect = Exception("Stripe API error")
        
        order_data = {"total": 1500}
        
        response = client.post("/create-payment-intent", json=order_data)
        
        assert response.status_code == 500
        assert "Failed to create payment intent" in response.json()["detail"]


class TestCheckout:
    """Tests for checkout order processing."""
    
    @patch("app.services.email.EmailService.send_order_notification")
    @patch("app.services.inventory.InventoryService.reduce_stock")
    def test_checkout_success(self, mock_reduce, mock_email, client, test_db_with_data, monkeypatch):
        """Should process checkout successfully."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        order_data = {
            "customer": {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john@example.com",
                "phone": "+46701234567",
                "payment": "swish"
            },
            "items": [
                {
                    "id": 1,
                    "name": "Judo Gi",
                    "price": 1500,
                    "quantity": 1,
                    "selectedSize": "170"
                }
            ]
        }
        
        response = client.post("/checkout", json=order_data)
        
        assert response.status_code == 200
        assert "Order received" in response.json()["message"]
        mock_email.assert_called_once()
        mock_reduce.assert_called_once()
    
    @patch("app.services.email.EmailService.send_order_notification")
    def test_checkout_email_failure(self, mock_email, client, test_db_with_data, monkeypatch):
        """Should return 500 if email fails."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        mock_email.side_effect = Exception("SMTP error")
        
        order_data = {
            "customer": {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john@example.com",
                "phone": "+46701234567"
            },
            "items": []
        }
        
        response = client.post("/checkout", json=order_data)
        
        assert response.status_code == 500
        assert "Failed to send email" in response.json()["detail"]


class TestConfirmPayment:
    """Tests for payment confirmation endpoint."""
    
    @patch("stripe.PaymentIntent.retrieve")
    @patch("app.services.email.EmailService.send_order_notification")
    def test_confirm_payment_success(self, mock_email, mock_retrieve, client, test_db_with_data, monkeypatch):
        """Should confirm payment and process order."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_retrieve.return_value = mock_intent
        
        payment_data = {
            "payment_intent_id": "pi_test_123",
            "order": {
                "customer": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "email": "john@example.com",
                    "phone": "+46701234567"
                },
                "items": [
                    {
                        "id": 1,
                        "name": "Judo Gi",
                        "price": 1500,
                        "quantity": 1,
                        "selectedSize": "170"
                    }
                ]
            }
        }
        
        response = client.post("/confirm-payment", json=payment_data)
        
        assert response.status_code == 200
        assert "Payment confirmed" in response.json()["message"]
    
    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_payment_not_succeeded(self, mock_retrieve, client):
        """Should reject if payment not succeeded."""
        mock_intent = MagicMock()
        mock_intent.status = "requires_payment_method"
        mock_retrieve.return_value = mock_intent
        
        payment_data = {
            "payment_intent_id": "pi_test_123",
            "order": {
                "customer": {},
                "items": []
            }
        }
        
        response = client.post("/confirm-payment", json=payment_data)
        
        assert response.status_code == 400
        assert "Payment not completed" in response.json()["detail"]
    
    @patch("stripe.PaymentIntent.retrieve")
    @patch("app.services.email.EmailService.send_order_notification")
    def test_confirm_payment_updates_stock(self, mock_email, mock_retrieve, client, test_db_with_data, monkeypatch):
        """Should update stock levels after payment confirmation."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_retrieve.return_value = mock_intent
        
        payment_data = {
            "payment_intent_id": "pi_test_123",
            "order": {
                "customer": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "email": "john@example.com",
                    "phone": "+46701234567"
                },
                "items": [
                    {
                        "id": 1,
                        "name": "Judo Gi",
                        "price": 1500,
                        "quantity": 2,
                        "selectedSize": "170"
                    }
                ]
            }
        }
        
        # Get initial stock
        conn = sqlite3.connect(test_db_with_data)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT sizes FROM products WHERE id = 1").fetchone()
        initial_sizes = json.loads(row["sizes"])
        initial_online = initial_sizes["170"]["online"]
        conn.close()
        
        response = client.post("/confirm-payment", json=payment_data)
        
        assert response.status_code == 200
        
        # Verify stock was reduced
        conn = sqlite3.connect(test_db_with_data)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT sizes FROM products WHERE id = 1").fetchone()
        final_sizes = json.loads(row["sizes"])
        conn.close()
        
        assert final_sizes["170"]["online"] == initial_online - 2


class TestCheckoutOrderValidation:
    """Tests for order data validation in checkout."""
    
    @patch("app.services.email.EmailService.send_order_notification")
    @patch("app.services.inventory.InventoryService.reduce_stock")
    def test_checkout_with_empty_items(self, mock_reduce, mock_email, client):
        """Should handle empty items list."""
        order_data = {
            "customer": {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john@example.com",
                "phone": "+46701234567"
            },
            "items": []
        }
        
        response = client.post("/checkout", json=order_data)
        
        # Should still succeed (email sent, no stock to reduce)
        assert response.status_code == 200
    
    @patch("app.services.email.EmailService.send_order_notification")
    @patch("app.services.inventory.InventoryService.reduce_stock")
    def test_checkout_extracts_payment_from_customer(self, mock_reduce, mock_email, client):
        """Should extract payment method from customer data."""
        order_data = {
            "customer": {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john@example.com",
                "phone": "+46701234567",
                "payment": "swish"
            },
            "items": []
        }
        
        response = client.post("/checkout", json=order_data)
        
        assert response.status_code == 200
        # Verify email was called with payment info
        call_args = mock_email.call_args
        assert call_args[0][2] == "swish"  # Third argument is payment
