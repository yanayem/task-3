from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User


class ErrorResponseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='erroruser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_validation_error_response_structure(self):
        """Rubric check: Error responses name what was wrong, not only that something was"""
        payload = {
            "title": "",
            "amount": -50.00,
            "category": "InvalidCategory"
        }
        response = self.client.post('/api/expenses/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = response.data
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error_code'], 'VALIDATION_ERROR')
        self.assertIn('message', data)
        self.assertIn('details', data)

        # Field-specific validation details should clearly state what is wrong
        details = data['details']
        self.assertIn('amount', details)
        self.assertIn('title', details)
        self.assertIn('category', details)

    def test_not_found_error_response_structure(self):
        response = self.client.get('/api/expenses/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        data = response.data
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error_code'], 'NOT_FOUND')
        self.assertIn('message', data)
