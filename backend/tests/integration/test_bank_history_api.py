"""
Integration tests for bank history API
"""
import pytest
from io import BytesIO


class TestBankHistoryAPI:
    """Test /bank_history endpoints"""

    def test_get_bank_history_empty(self, client, auth_headers):
        """Test getting bank history when none exists"""
        response = client.get("/bank_history/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.skip(reason="Requires Claude API key and mocking")
    def test_upload_csv(self, client, auth_headers, sample_asset):
        """Test uploading a CSV file (requires mocking Claude API)"""
        csv_content = b"""Date,Description,Amount,Balance
2024-01-01,Salary,5000.00,10000.00
2024-01-15,Groceries,-150.00,9850.00
"""

        files = {"file": ("test.csv", BytesIO(csv_content), "text/csv")}
        data = {"asset_id": sample_asset.id}

        response = client.post(
            "/bank_history/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        # Will fail without proper Claude API mocking
        # This is a placeholder for future implementation
        pass
