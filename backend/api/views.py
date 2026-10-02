from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db import transaction
from django.db.models import Sum, Count

from .models import Expense, IdempotencyRecord
from .serializers import UserSerializer, RegisterSerializer, ExpenseSerializer


SUMMARY_CACHE_TIMEOUT = 60  # 60 seconds
IDEMPOTENCY_CACHE_TIMEOUT = 86400  # 24 hours


def invalidate_user_summary_cache(user_id):
    cache_key = f"summary_user_{user_id}"
    cache.delete(cache_key)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data,
            "message": "User registered successfully."
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"non_field_errors": ["Username and password are required."]})

        user = authenticate(username=username, password=password)
        if not user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"non_field_errors": ["Invalid username or password."]})

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data,
            "message": "Login successful."
        }, status=status.HTTP_200_OK)


class UserMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        # Data Isolation: User can only list their own expenses
        return Expense.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        idempotency_key = request.headers.get('Idempotency-Key') or request.META.get('HTTP_IDEMPOTENCY_KEY')
        user = request.user

        if idempotency_key:
            cache_key = f"idempotency_{user.id}_{idempotency_key}"
            cached_response = cache.get(cache_key)

            if cached_response:
                return Response(
                    cached_response['data'],
                    status=cached_response['status'],
                    headers={'X-Idempotent-Replay': 'true'}
                )

            # Check Database for idempotency record
            existing_record = IdempotencyRecord.objects.filter(user=user, key=idempotency_key).first()
            if existing_record:
                # Save into cache for future requests
                cache.set(cache_key, {
                    'data': existing_record.response_data,
                    'status': existing_record.response_status
                }, IDEMPOTENCY_CACHE_TIMEOUT)

                return Response(
                    existing_record.response_data,
                    status=existing_record.response_status,
                    headers={'X-Idempotent-Replay': 'true'}
                )

        # Validate request payload
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            expense = serializer.save(user=user, idempotency_key=idempotency_key)
            response_data = ExpenseSerializer(expense).data

            if idempotency_key:
                IdempotencyRecord.objects.create(
                    user=user,
                    key=idempotency_key,
                    request_path=request.path,
                    response_status=status.HTTP_201_CREATED,
                    response_data=response_data
                )
                cache_key = f"idempotency_{user.id}_{idempotency_key}"
                cache.set(cache_key, {
                    'data': response_data,
                    'status': status.HTTP_201_CREATED
                }, IDEMPOTENCY_CACHE_TIMEOUT)

        invalidate_user_summary_cache(user.id)

        response_headers = {}
        if idempotency_key:
            response_headers['X-Idempotent-Key'] = idempotency_key

        return Response(response_data, status=status.HTTP_201_CREATED, headers=response_headers)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        # Data Isolation: User can only access/modify their own expenses
        return Expense.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
        invalidate_user_summary_cache(self.request.user.id)

    def perform_destroy(self, instance):
        instance.delete()
        invalidate_user_summary_cache(self.request.user.id)


class ExpenseSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"summary_user_{user.id}"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK, headers={'X-Cache-Status': 'HIT'})

        user_expenses = Expense.objects.filter(user=user)
        total_count = user_expenses.count()
        total_amount = user_expenses.aggregate(total=Sum('amount'))['total'] or 0.0

        # Group by category
        categories = (
            user_expenses.values('category')
            .annotate(count=Count('id'), total=Sum('amount'))
            .order_by('-total')
        )

        summary_data = {
            'total_expenses': total_count,
            'total_amount': float(total_amount),
            'by_category': [
                {
                    'category': c['category'],
                    'count': c['count'],
                    'total': float(c['total'])
                }
                for c in categories
            ],
            'cached_for_seconds': SUMMARY_CACHE_TIMEOUT,
        }

        cache.set(cache_key, summary_data, SUMMARY_CACHE_TIMEOUT)

        return Response(summary_data, status=status.HTTP_200_OK, headers={'X-Cache-Status': 'MISS'})
