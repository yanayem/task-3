from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    UserMeView,
    ExpenseListCreateView,
    ExpenseDetailView,
    ExpenseSummaryView,
)

urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', UserMeView.as_view(), name='me'),

    # Expense endpoints
    path('expenses/', ExpenseListCreateView.as_view(), name='expense-list-create'),
    path('expenses/summary/', ExpenseSummaryView.as_view(), name='expense-summary'),
    path('expenses/<int:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
]
