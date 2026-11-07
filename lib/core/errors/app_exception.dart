class AppException implements Exception {
  final String message;
  final int? statusCode;

  const AppException(this.message, [this.statusCode]);

  @override
  String toString() => '$runtimeType: $message (code: $statusCode)';
}

/// No connection, timeout or an unreachable host.
class NetworkException extends AppException {
  const NetworkException([
    super.message = 'Network connection error',
    super.statusCode,
  ]);
}

/// 5xx from the server.
class ServerException extends AppException {
  const ServerException([
    super.message = 'Server error occurred',
    super.statusCode,
  ]);
}

class DatasetUnavailableException extends ServerException {
  const DatasetUnavailableException()
    : super('No approved dataset is connected', 503);
}

/// 401: the request needs a sign-in, or the token expired.
class UnauthorizedException extends AppException {
  const UnauthorizedException([String message = 'Not signed in'])
    : super(message, 401);
}

/// 404: the id does not exist.
class NotFoundException extends AppException {
  const NotFoundException([String message = 'Not found']) : super(message, 404);
}

/// 422: the server rejected the input. [fields] maps a field name to the reason.
class ValidationException extends AppException {
  final Map<String, String> fields;

  const ValidationException([
    String message = 'Invalid request',
    this.fields = const {},
  ]) : super(message, 422);
}

/// The caller cancelled the request (for example a newer slider value replaced it).
class RequestCancelledException extends AppException {
  const RequestCancelledException() : super('Request cancelled');
}

/// The response arrived but does not match the API contract.
class ParseException extends AppException {
  const ParseException(super.message);
}
