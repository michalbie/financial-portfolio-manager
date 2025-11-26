"""
Unit tests for currency translation
"""
import pytest
from unittest.mock import patch, MagicMock


class TestCurrencyTranslation:
    """Test currency conversion logic"""

    @patch('currency.translate_currency.SessionLocal')
    def test_usd_to_pln(self, mock_session_local, test_db, currency_rates):
        """Test USD to PLN conversion"""
        # Mock SessionLocal to return our test session
        mock_session_local.return_value = test_db

        from currency.translate_currency import translate_currency
        result = translate_currency("USD", "PLN", 100.0)
        assert result == 400.0

    @patch('currency.translate_currency.SessionLocal')
    def test_pln_to_usd(self, mock_session_local, test_db, currency_rates):
        """Test PLN to USD conversion"""
        mock_session_local.return_value = test_db

        from currency.translate_currency import translate_currency
        result = translate_currency("PLN", "USD", 400.0)
        assert result == 100.0

    @patch('currency.translate_currency.SessionLocal')
    def test_usd_to_eur(self, mock_session_local, test_db, currency_rates):
        """Test USD to EUR conversion"""
        mock_session_local.return_value = test_db

        from currency.translate_currency import translate_currency
        result = translate_currency("USD", "EUR", 100.0)
        assert result == pytest.approx(92.0, rel=0.01)

    def test_invalid_currency_pair(self, test_db, currency_rates):
        """Test that invalid currency pair raises error"""
        with patch('currency.translate_currency.SessionLocal', return_value=test_db):
            from currency.translate_currency import translate_currency
            with pytest.raises(ValueError, match="Exchange rate from USD to JPY not found"):
                translate_currency("USD", "JPY", 100.0)

    @patch('currency.translate_currency.SessionLocal')
    def test_zero_amount(self, mock_session_local, test_db, currency_rates):
        """Test conversion of zero amount"""
        mock_session_local.return_value = test_db

        from currency.translate_currency import translate_currency
        result = translate_currency("USD", "PLN", 0.0)
        assert result == 0.0

    @patch('currency.translate_currency.SessionLocal')
    def test_negative_amount(self, mock_session_local, test_db, currency_rates):
        """Test conversion of negative amount"""
        mock_session_local.return_value = test_db

        from currency.translate_currency import translate_currency
        result = translate_currency("USD", "PLN", -100.0)
        assert result == -400.0
