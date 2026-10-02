from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from api.models import Expense


class CachingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cacheuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_summary_cache_and_invalidation(self):
        # 1. Initial request -> Cache MISS
        res1 = self.client.get('/api/expenses/summary/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.headers.get('X-Cache-Status'), 'MISS')
        self.assertEqual(res1.data['total_expenses'], 0)

        # 2. Immediate second request -> Cache HIT
        res2 = self.client.get('/api/expenses/summary/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.headers.get('X-Cache-Status'), 'HIT')

        # 3. Create a new expense -> Invalidates cache
        self.client.post('/api/expenses/', {'title': 'Dinner', 'amount': 45.00, 'category': 'Food & Dining'}, format='json')

        # 4. Next GET -> Cache MISS with updated totals
        res3 = self.client.get('/api/expenses/summary/')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertEqual(res3.headers.get('X-Cache-Status'), 'MISS')
        self.assertEqual(res3.data['total_expenses'], 1)
        self.assertEqual(res3.data['total_amount'], 45.0)
