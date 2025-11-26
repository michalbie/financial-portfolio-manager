"""
Integration tests for statistics API
"""
import pytest
from datetime import datetime
from database.models import Statistic


class TestStatisticsAPI:
    """Test /statistics endpoints"""

    def test_get_statistics_empty(self, client, auth_headers):
        """Test getting statistics when none exist"""
        response = client.get("/statistics/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_statistics_with_data(self, client, auth_headers, test_user, test_db):
        """Test getting statistics with existing data"""
        # Create sample statistics
        stat1 = Statistic(
            user_id=test_user.id,
            date=datetime(2024, 1, 1),
            total_portfolio_value=10000.0,
            portfolio_distribution={"stocks": 6000.0, "savings": 4000.0}
        )
        stat2 = Statistic(
            user_id=test_user.id,
            date=datetime(2024, 2, 1),
            total_portfolio_value=12000.0,
            portfolio_distribution={"stocks": 7000.0, "savings": 5000.0}
        )

        test_db.add(stat1)
        test_db.add(stat2)
        test_db.commit()

        response = client.get("/statistics/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["total_portfolio_value"] == 10000.0
        assert data[1]["total_portfolio_value"] == 12000.0
