"""
Unit tests for growth percentage calculation
"""
import pytest


def get_growth_percent(purchase_price: float, current_price: float) -> str:
    """
    Calculate growth percentage between purchase and current price
    (Copied from frontend logic for testing)
    """
    if current_price is None or current_price == 0:
        return "0.00"
    if purchase_price == 0:
        purchase_price = 1
    return f"{abs(((current_price - purchase_price) / purchase_price) * 100):.2f}"


class TestGrowthPercent:
    """Test growth percentage calculations"""

    def test_positive_growth(self):
        """Test positive price growth"""
        result = get_growth_percent(100.0, 150.0)
        assert result == "50.00"

    def test_negative_growth(self):
        """Test negative price growth (loss)"""
        result = get_growth_percent(100.0, 75.0)
        assert result == "25.00"  # Returns absolute value

    def test_no_growth(self):
        """Test zero growth"""
        result = get_growth_percent(100.0, 100.0)
        assert result == "0.00"

    def test_zero_purchase_price(self):
        """Test with zero purchase price (edge case)"""
        result = get_growth_percent(0.0, 100.0)
        # Should handle division by zero
        assert result == "9900.00"  # (100-1)/1 * 100

    def test_none_current_price(self):
        """Test with None current price"""
        result = get_growth_percent(100.0, None)
        assert result == "0.00"

    def test_large_growth(self):
        """Test very large growth percentage"""
        result = get_growth_percent(10.0, 1000.0)
        assert result == "9900.00"
