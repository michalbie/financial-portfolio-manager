"""
Unit tests for CSV parser (Claude AI integration)
"""
import pytest
from csv_parser import CSVParser
from unittest.mock import Mock, patch


class TestCSVParser:
    """Test CSV parsing logic"""

    @patch('csv_parser.Anthropic')
    def test_parse_simple_csv(self, mock_anthropic):
        """Test parsing a simple CSV file"""
        # Mock Claude API response
        mock_response = Mock()
        mock_response.content = [Mock(
            text='{"date_start": "2024-01-01", "date_end": "2024-01-31", "incomes": 5000.0, "expenses": 3000.0, "final_balance": 10000.0, "transaction_count": 45, "currency": "USD"}')]

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        parser = CSVParser()

        csv_content = """
        Date,Description,Amount,Balance
        2024-01-01,Salary,5000.00,10000.00
        2024-01-15,Groceries,-150.00,9850.00
        2024-01-20,Utilities,-200.00,9650.00
        """

        result = parser.parse_csv(csv_content, asset_id=1)

        assert result["date_start"].strftime("%Y-%m-%d") == "2024-01-01"
        assert result["date_end"].strftime("%Y-%m-%d") == "2024-01-31"
        assert result["incomes"] == 5000.0
        assert result["expenses"] == 3000.0
        assert result["final_balance"] == 10000.0
        assert result["asset_id"] == 1

    @patch('csv_parser.Anthropic')
    def test_parse_csv_with_missing_fields(self, mock_anthropic):
        """Test that parser raises error for missing required fields"""
        mock_response = Mock()
        mock_response.content = [Mock(text='{"date_start": "2024-01-01"}')]

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        parser = CSVParser()

        with pytest.raises(ValueError, match="Missing required field in response"):
            parser.parse_csv("invalid,csv,data")

    def test_parser_requires_api_key(self, monkeypatch):
        """Test that parser requires ANTHROPIC_API_KEY"""
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY environment variable not set"):
            CSVParser()
