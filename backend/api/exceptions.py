from rest_framework.views import exception_handler
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        status_code = response.status_code
        error_code = "REQUEST_FAILED"
        
        if status_code == 400:
            error_code = "VALIDATION_ERROR"
        elif status_code == 401:
            error_code = "AUTHENTICATION_REQUIRED"
        elif status_code == 403:
            error_code = "PERMISSION_DENIED"
        elif status_code == 404:
            error_code = "NOT_FOUND"
        elif status_code == 405:
            error_code = "METHOD_NOT_ALLOWED"

        original_data = response.data
        message = _extract_message(original_data, status_code)

        response.data = {
            "status": "error",
            "error_code": error_code,
            "message": message,
            "details": original_data,
        }

    return response


def _extract_message(data, status_code):
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        # If field validation errors exist, create a summary string
        error_messages = []
        for field, errors in data.items():
            if isinstance(errors, list):
                error_messages.append(f"{field}: {', '.join([str(e) for e in errors])}")
            else:
                error_messages.append(f"{field}: {str(errors)}")
        if error_messages:
            return "Validation failed: " + "; ".join(error_messages)
    elif isinstance(data, list):
        return "; ".join([str(e) for e in data])
    
    if status_code == 401:
        return "Authentication credentials were not provided or are invalid."
    if status_code == 403:
        return "You do not have permission to perform this action."
    if status_code == 404:
        return "The requested resource was not found."
    
    return "An error occurred while processing your request."
