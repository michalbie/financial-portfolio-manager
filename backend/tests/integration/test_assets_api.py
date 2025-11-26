"""
Integration tests for assets API
"""
import pytest
from datetime import datetime


class TestAssetsAPI:
    """Test /assets endpoints"""

    def test_get_user_assets_empty(self, client, test_user, auth_headers):  # ← Dodaj test_user
        """Test getting assets for user with no assets"""
        response = client.get("/assets/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_create_savings_asset(self, client, auth_headers, test_user):
        """Test creating a savings account asset"""
        asset_data = {
            "name": "Main Savings",
            "type": "savings",
            "purchase_price": 5000.0,
            "currency": "USD",
            "quantity": 1,
            "deduct_from_savings": False
        }

        response = client.post(
            "/assets/", json=asset_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Main Savings"
        assert data["type"] == "savings"
        assert data["purchase_price"] == 5000.0
        assert data["user_id"] == test_user.id

    def test_create_stock_asset(self, client, auth_headers, test_user):
        """Test creating a stock asset"""
        asset_data = {
            "name": "Apple Inc",
            "type": "stocks",
            "symbol": "AAPL",
            "mic_code": "XNAS",
            "currency": "USD",
            "purchase_price": 150.0,
            "purchase_date": datetime.utcnow().isoformat(),
            "quantity": 10,
            "exchange": "NASDAQ",
            "deduct_from_savings": False
        }

        response = client.post(
            "/assets/", json=asset_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Apple Inc"
        assert data["symbol"] == "AAPL"
        assert data["mic_code"] == "XNAS"
        assert data["quantity"] == 10

    def test_update_asset(self, client, auth_headers, sample_asset):
        """Test updating an existing asset"""
        update_data = {
            "name": "Updated Stock Name",
            "purchase_price": 120.0
        }

        response = client.put(
            f"/assets/{sample_asset.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Stock Name"
        assert data["purchase_price"] == 120.0

    def test_delete_asset(self, client, auth_headers, sample_asset):
        """Test deleting an asset"""
        response = client.delete(
            f"/assets/{sample_asset.id}",
            headers=auth_headers
        )

        assert response.status_code == 200

        # Verify it's deleted
        get_response = client.get("/assets/", headers=auth_headers)
        assets = get_response.json()
        asset_ids = [a["id"] for a in assets]
        assert sample_asset.id not in asset_ids
