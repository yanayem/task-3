from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_unauthenticated_request_returns_401(self):
        """Rubric check: An unauthenticated request to a protected route returns 401"""
        response = self.client.get('/api/expenses/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error_code'], 'AUTHENTICATION_REQUIRED')

    def test_user_registration_success(self):
        payload = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123',
            'confirm_password': 'password123'
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'newuser')

    def test_user_registration_password_mismatch(self):
        payload = {
            'username': 'newuser2',
            'password': 'password123',
            'confirm_password': 'different_password'
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error_code'], 'VALIDATION_ERROR')
        self.assertIn('confirm_password', response.data['details'])

    def test_user_login_success(self):
        User.objects.create_user(username='loginuser', password='password123')
        payload = {'username': 'loginuser', 'password': 'password123'}
        response = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_user_login_invalid_credentials(self):
        User.objects.create_user(username='loginuser2', password='password123')
        payload = {'username': 'loginuser2', 'password': 'wrongpassword'}
        response = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error_code'], 'VALIDATION_ERROR')
