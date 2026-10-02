from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from api.models import Expense


class DataIsolationTests(TestCase):
    def setUp(self):
        # Create User A
        self.user_a = User.objects.create_user(username='usera', password='password123')
        self.token_a = Token.objects.create(user=self.user_a)
        self.client_a = APIClient()
        self.client_a.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)

        # Create User B
        self.user_b = User.objects.create_user(username='userb', password='password123')
        self.token_b = Token.objects.create(user=self.user_b)
        self.client_b = APIClient()
        self.client_b.credentials(HTTP_AUTHORIZATION='Token ' + self.token_b.key)

        # Create expense owned by User A
        self.expense_a = Expense.objects.create(
            user=self.user_a,
            title="User A's Grocery",
            amount=75.50,
            category='Food & Dining'
        )

    def test_user_b_cannot_list_user_a_expenses(self):
        """Rubric check: One user cannot read or write another user's rows"""
        response = self.client_b.get('/api/expenses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # User B should see 0 expenses
        self.assertEqual(len(response.data), 0)

    def test_user_b_cannot_retrieve_user_a_expense_by_id(self):
        """User B requesting User A's expense directly gets 404 Not Found"""
        response = self.client_b.get(f'/api/expenses/{self.expense_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_b_cannot_update_user_a_expense(self):
        """User B attempting to edit User A's expense gets 404 and row remains unchanged"""
        payload = {'title': "Hacked Title", 'amount': 1.00, 'category': 'Other'}
        response = self.client_b.put(f'/api/expenses/{self.expense_a.id}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify User A's expense in DB was not modified
        self.expense_a.refresh_from_db()
        self.assertEqual(self.expense_a.title, "User A's Grocery")

    def test_user_b_cannot_delete_user_a_expense(self):
        """User B attempting to delete User A's expense gets 404 and row remains in DB"""
        response = self.client_b.delete(f'/api/expenses/{self.expense_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify expense still exists
        self.assertTrue(Expense.objects.filter(id=self.expense_a.id).exists())
