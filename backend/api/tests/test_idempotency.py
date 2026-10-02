from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from api.models import Expense, IdempotencyRecord


class IdempotencyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='retryuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_idempotent_write_path_prevents_duplicates(self):
        """Rubric check: One write path is retry-safe and returns identical result on repeat"""
        idempotency_key = "unique-key-uuid-9999"
        payload = {
            "title": "Recurring Subscription",
            "amount": 29.99,
            "category": "Utilities",
            "note": "Monthly SaaS payment"
        }

        # First Request
        response1 = self.client.post(
            '/api/expenses/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('X-Idempotent-Replay', response1.headers)
        created_id = response1.data['id']

        # Assert exactly 1 expense exists in database
        self.assertEqual(Expense.objects.filter(user=self.user).count(), 1)
        self.assertEqual(IdempotencyRecord.objects.filter(user=self.user, key=idempotency_key).count(), 1)

        # Second Identical Request with Same Idempotency Key (Simulating Network Retry / Double Click)
        response2 = self.client.post(
            '/api/expenses/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.headers.get('X-Idempotent-Replay'), 'true')
        self.assertEqual(response2.data['id'], created_id)

        # Assert STILL exactly 1 expense exists in database! No duplicate row was created.
        self.assertEqual(Expense.objects.filter(user=self.user).count(), 1)

    def test_different_idempotency_key_creates_new_row(self):
        payload = {"title": "Coffee", "amount": 4.50, "category": "Food & Dining"}

        resp1 = self.client.post('/api/expenses/', payload, format='json', HTTP_IDEMPOTENCY_KEY="key-1")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        resp2 = self.client.post('/api/expenses/', payload, format='json', HTTP_IDEMPOTENCY_KEY="key-2")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        # Both should create distinct rows
        self.assertEqual(Expense.objects.filter(user=self.user).count(), 2)
