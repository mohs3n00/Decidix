import 'package:dio/dio.dart';

import '../errors/app_exception.dart';

/// Turns a Dio failure into one of the [AppException] types, so no screen has
/// to know about Dio. Error bodies follow the contract:
/// `{ "error": { "code", "message", "fields" } }`.
AppException mapDioException(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.transformTimeout:
      return const NetworkException('The server took too long to answer');
    case DioExceptionType.connectionError:
    case DioExceptionType.badCertificate:
      return NetworkException(e.message ?? 'Network connection error');
    case DioExceptionType.cancel:
      return const RequestCancelledException();
    case DioExceptionType.badResponse:
      return _fromResponse(e.response);
    case DioExceptionType.unknown:
      return NetworkException(e.message ?? 'Network connection error');
  }
}

AppException _fromResponse(Response<dynamic>? response) {
  final status = response?.statusCode ?? 0;
  final error = _errorBody(response?.data);
  final message = error?['message'] as String?;

  if (status == 401) return UnauthorizedException(message ?? 'Not signed in');
  if (status == 404) return NotFoundException(message ?? 'Not found');
  if (status == 422) {
    final raw = error?['fields'];
    final fields = <String, String>{
      if (raw is Map)
        for (final entry in raw.entries) '${entry.key}': '${entry.value}',
    };
    return ValidationException(message ?? 'Invalid request', fields);
  }
  if (status >= 500) {
    if (error?['code'] == 'DATASET_NOT_CONNECTED') {
      return const DatasetUnavailableException();
    }
    return ServerException(message ?? 'Server error occurred', status);
  }
  return AppException(message ?? 'Request failed', status);
}

Map<String, dynamic>? _errorBody(Object? body) {
  if (body is Map<String, dynamic>) {
    final error = body['error'];
    if (error is Map<String, dynamic>) return error;
  }
  return null;
}
