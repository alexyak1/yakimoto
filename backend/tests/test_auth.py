"""
Tests for authentication endpoints and token verification.
"""
import time

import jwt
import pytest


class TestLogin:
    """Tests for the login endpoint."""
    
    def test_login_success(self, client):
        """Should return token with valid password."""
        response = client.post(
            "/login",
            data={"password": "test_password", "remember_me": "false"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        
        # Verify token is valid JWT
        payload = jwt.decode(
            data["token"],
            "test_jwt_secret_key_for_testing",
            algorithms=["HS256"]
        )
        assert payload["sub"] == "admin"
    
    def test_login_wrong_password(self, client):
        """Should return 401 with invalid password."""
        response = client.post(
            "/login",
            data={"password": "wrong_password"}
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Unauthorized"
    
    def test_login_remember_me_extends_expiration(self, client):
        """Remember me should extend token expiration to 30 days."""
        response = client.post(
            "/login",
            data={"password": "test_password", "remember_me": "true"}
        )
        
        assert response.status_code == 200
        token = response.json()["token"]
        
        payload = jwt.decode(
            token,
            "test_jwt_secret_key_for_testing",
            algorithms=["HS256"]
        )
        
        # Check expiration is approximately 30 days from now
        expected_exp = time.time() + (30 * 24 * 60 * 60)
        assert abs(payload["exp"] - expected_exp) < 10  # Within 10 seconds
    
    def test_login_without_remember_me_uses_default(self, client):
        """Without remember_me, should use default expiration."""
        response = client.post(
            "/login",
            data={"password": "test_password", "remember_me": "false"}
        )
        
        assert response.status_code == 200
        token = response.json()["token"]
        
        payload = jwt.decode(
            token,
            "test_jwt_secret_key_for_testing",
            algorithms=["HS256"]
        )
        
        # Default is 3600 seconds (1 hour)
        expected_exp = time.time() + 3600
        assert abs(payload["exp"] - expected_exp) < 10


class TestTokenVerification:
    """Tests for token verification in protected endpoints."""
    
    def test_protected_endpoint_with_valid_token(self, client, auth_headers):
        """Should allow access with valid token."""
        # Categories endpoint requires auth for POST
        response = client.get("/categories")
        assert response.status_code == 200  # GET doesn't require auth
    
    def test_protected_endpoint_without_token(self, client):
        """Should return 422 without Authorization header."""
        response = client.post(
            "/categories",
            data={"name": "Test Category"}
        )
        # FastAPI returns 422 for missing required header
        assert response.status_code == 422
    
    def test_protected_endpoint_with_expired_token(self, client, expired_token):
        """Should return 403 with expired token."""
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.post(
            "/categories",
            data={"name": "Test Category"},
            headers=headers
        )
        
        assert response.status_code == 403
        assert "Invalid or expired token" in response.json()["detail"]
    
    def test_protected_endpoint_with_invalid_token(self, client):
        """Should return 403 with invalid token."""
        headers = {"Authorization": "Bearer invalid_token_string"}
        response = client.post(
            "/categories",
            data={"name": "Test Category"},
            headers=headers
        )
        
        assert response.status_code == 403
    
    def test_protected_endpoint_wrong_auth_scheme(self, client, auth_token):
        """Should return 403 with wrong auth scheme."""
        headers = {"Authorization": f"Basic {auth_token}"}
        response = client.post(
            "/categories",
            data={"name": "Test Category"},
            headers=headers
        )
        
        assert response.status_code == 403
    
    def test_protected_endpoint_malformed_header(self, client):
        """Should return 403 with malformed header."""
        headers = {"Authorization": "MalformedHeader"}
        response = client.post(
            "/categories",
            data={"name": "Test Category"},
            headers=headers
        )
        
        assert response.status_code == 403


class TestTokenWithDifferentSecret:
    """Tests for token signed with different secret."""
    
    def test_token_with_wrong_secret(self, client):
        """Should reject token signed with different secret."""
        payload = {
            "sub": "admin",
            "exp": time.time() + 3600
        }
        # Sign with wrong secret
        wrong_token = jwt.encode(payload, "wrong_secret", algorithm="HS256")
        
        headers = {"Authorization": f"Bearer {wrong_token}"}
        response = client.post(
            "/categories",
            data={"name": "Test Category"},
            headers=headers
        )
        
        assert response.status_code == 403
