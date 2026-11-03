import 'package:dio/dio.dart';

import '../../core/errors/app_exception.dart';
import '../../core/network/api_client.dart';
import '../../core/network/error_mapper.dart';
import '../models/json.dart';

/// The `data` and `meta` of a successful response.
class ApiEnvelope {
  final Object? data;
  final JsonMap? meta;

  const ApiEnvelope(this.data, [this.meta]);
}

/// How the app talks to the backend. [DioTransport] calls the real server;
/// `MockTransport` answers from the files in assets/mock. Both return the same
/// shapes and throw the same [AppException] types, so the repositories above
/// them do not know which one they use.
abstract class ApiTransport {
  Future<ApiEnvelope> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  });

  Future<ApiEnvelope> post(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  });

  Future<ApiEnvelope> delete(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  });
}

class DioTransport implements ApiTransport {
  final ApiClient _client;

  const DioTransport(this._client);

  @override
  Future<ApiEnvelope> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => _client.get<Object?>(
        path,
        queryParameters: query,
        cancelToken: cancelToken,
      ),
    );
  }

  @override
  Future<ApiEnvelope> post(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => _client.post<Object?>(path, data: body, cancelToken: cancelToken),
    );
  }

  @override
  Future<ApiEnvelope> delete(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => _client.delete<Object?>(path, data: body, cancelToken: cancelToken),
    );
  }

  Future<ApiEnvelope> _send(Future<Response<Object?>> Function() call) async {
    try {
      final response = await call();
      return _unwrap(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  ApiEnvelope _unwrap(Object? body) {
    if (body is! JsonMap || !body.containsKey('data')) {
      throw const ParseException(
        'The response is not a {"data": ...} envelope',
      );
    }
    final meta = body['meta'];
    return ApiEnvelope(body['data'], meta is JsonMap ? meta : null);
  }
}
