from django.db import models
from django.contrib.auth.models import User


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('Food & Dining', 'Food & Dining'),
        ('Shopping', 'Shopping'),
        ('Utilities', 'Utilities'),
        ('Entertainment', 'Entertainment'),
        ('Travel', 'Travel'),
        ('Other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    note = models.TextField(blank=True, default='')
    idempotency_key = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - ${self.amount} ({self.user.username})"


class IdempotencyRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='idempotency_records')
    key = models.CharField(max_length=100, db_index=True)
    request_path = models.CharField(max_length=255, default='')
    response_status = models.IntegerField()
    response_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'key')
        ordering = ['-created_at']

    def __str__(self):
        return f"IdempotencyRecord({self.user.username}, {self.key}) -> {self.response_status}"
