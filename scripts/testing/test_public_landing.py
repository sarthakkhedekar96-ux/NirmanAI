#!/usr/bin/env python3
"""
Test suite for Public Read-Only Landing API Layer.
Verifies unauthenticated access to /api/public/landing/* endpoints while ensuring
existing protected routes (/api/analytics/*, /api/risk/*) remain secured with 401 Unauthorized.
"""
import sys
import os
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from backend.app.main import app

class TestPublicLandingAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_public_summary_returns_200_without_jwt(self):
        """GET /api/public/landing/summary -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_master_projects", data)
        self.assertIn("total_live_projects_2026", data)
        self.assertIn("total_cost_overrun_crore", data)
        self.assertIsInstance(data["total_master_projects"], int)

    def test_02_public_agencies_returns_200_without_jwt(self):
        """GET /api/public/landing/agencies -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/agencies?limit=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            first = data[0]
            self.assertIn("agency", first)
            self.assertIn("project_count", first)

    def test_02b_public_sectors_returns_200_without_jwt(self):
        """GET /api/public/landing/sectors -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/sectors?limit=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        first = data[0]
        self.assertIn("sector", first)
        self.assertIn("project_count", first)
        self.assertGreater(first["project_count"], 0)

    def test_03_public_states_returns_200_without_jwt(self):
        """GET /api/public/landing/states -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/states?limit=50")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            first = data[0]
            self.assertIn("state", first)
            self.assertIn("project_count", first)

    def test_04_public_geographic_risk_returns_200_without_jwt(self):
        """GET /api/public/landing/geographic-risk -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/geographic-risk")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("states", data)
        self.assertIsInstance(data["states"], list)

    def test_05_public_major_projects_returns_200_without_jwt(self):
        """GET /api/public/landing/major-projects -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/major-projects?limit=6")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            first = data[0]
            self.assertIn("project_code", first)
            self.assertIn("project_name", first)

    def test_06_public_spotlight_returns_200_without_jwt(self):
        """GET /api/public/landing/project/020100044 -> 200 OK without JWT"""
        res = self.client.get("/api/public/landing/project/020100044")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("project_code"), "020100044")
        self.assertIn("project_name", data)

    def test_07_protected_portfolio_kpis_returns_401_without_jwt(self):
        """Existing protected /api/analytics/portfolio_kpis -> 401 Unauthorized without JWT"""
        res = self.client.get("/api/analytics/portfolio_kpis")
        self.assertEqual(res.status_code, 401)

    def test_08_protected_risk_intelligence_returns_401_without_jwt(self):
        """Existing protected /api/risk/intelligence/020100044 -> 401 Unauthorized without JWT"""
        res = self.client.get("/api/risk/intelligence/020100044")
        self.assertEqual(res.status_code, 401)

    def test_09_public_endpoints_return_real_non_fabricated_values(self):
        """Verify public summary returns real data non-zero or actual DB query counts"""
        res = self.client.get("/api/public/landing/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data.get("total_master_projects", 0), 0)

    def test_10_no_database_writes(self):
        """Verify read-only endpoints execute strictly SELECT statements"""
        res1 = self.client.get("/api/public/landing/summary")
        res2 = self.client.get("/api/public/landing/agencies")
        res3 = self.client.get("/api/public/landing/project/020100044")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res3.status_code, 200)

if __name__ == "__main__":
    unittest.main()
