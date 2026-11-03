import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../localization/locale_controller.dart';
import 'api_endpoints.dart';
import 'auth_token.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    languageCode: () => ref.read(localeNotifierProvider).languageCode,
    authToken: () => ref.read(authTokenReaderProvider)(),
  );
});

class ApiClient {
  final Dio dio;

  /// [dio] is for tests; the app lets the client build its own.
  ApiClient({
    String baseUrl = ApiEndpoints.baseUrl,
    Dio? dio,
    String Function()? languageCode,
    AuthTokenReader? authToken,
    bool logRequests = kDebugMode,
  }) : dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: baseUrl,
               connectTimeout: const Duration(seconds: 15),
               receiveTimeout: const Duration(seconds: 15),
               headers: {
                 'Content-Type': 'application/json',
                 'Accept': 'application/json',
               },
             ),
           ) {
    this.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final language = languageCode?.call();
          if (language != null) options.headers['Accept-Language'] = language;

          // If the token cannot be fetched, send the request without it: the
          // server answers 401 and the app handles that like any other 401.
          String? token;
          try {
            token = await authToken?.call();
          } catch (_) {}
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
      ),
    );

    if (logRequests) {
      this.dio.interceptors.add(
        LogInterceptor(
          requestHeader: false,
          responseHeader: false,
          requestBody: false,
          responseBody: false,
        ),
      );
    }
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }
}
