import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../config/app_config.dart';
import '../localization/locale_controller.dart';
import 'api_endpoints.dart';
import 'auth_token.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  // Dashboard screens may legitimately run on mock data, but this client is the
  // only path to the real backend (Google sign-in, login, uploads,
  // notifications). It therefore needs an absolute API_BASE_URL even in mock
  // builds, otherwise Dio fails with "No host specified in URI /auth/google"
  // as soon as the user signs in.
  return ApiClient(
    baseUrl: ApiClient.requireAbsoluteBaseUrl(ApiEndpoints.baseUrl),
    languageCode: () => ref.read(localeNotifierProvider).languageCode,
    authToken: () => ref.read(authTokenReaderProvider)(),
    refreshAccessToken: () => ref.read(authNotifierProvider.notifier).refreshSession(),
  );
});

class ApiClient {
  final Dio dio;
  final Future<bool> Function()? refreshAccessToken;
  Future<bool>? _refreshInFlight;

  /// Returns [candidate] as an absolute http(s) base URL, or throws a
  /// [StateError] that names the build flag to fix.
  ///
  /// Requests are built by joining a path such as `/auth/google` onto this
  /// value, so an empty or origin-less value produces Dio's
  /// "No host specified in URI /auth/google" instead of a usable error. Every
  /// caller therefore fails here, before the first request, with an actionable
  /// message.
  static String requireAbsoluteBaseUrl(String candidate) {
    final value = AppConfig.normalizeApiBaseUrl(candidate);
    if (value.isEmpty) {
      throw StateError(
        'API_BASE_URL is not set. Real backend calls such as Google sign-in '
        'need an absolute address; start the app with '
        '--dart-define-from-file=env/staging.json (staging) or env/prod.json.',
      );
    }
    final uri = Uri.tryParse(value);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw StateError(
        'API_BASE_URL must be an absolute http(s) URL with a host, such as '
        'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1. '
        'Received "$value".',
      );
    }
    final scheme = uri.scheme.toLowerCase();
    if (scheme != 'http' && scheme != 'https') {
      throw StateError(
        'API_BASE_URL must use http or https. Received "$value".',
      );
    }
    final host = uri.host.toLowerCase();
    final isLoopback =
        host == 'localhost' ||
        host == '127.0.0.1' ||
        host == '10.0.2.2' ||
        host == '0.0.0.0' ||
        host == '::1';

    if (kReleaseMode) {
      if (scheme != 'https') {
        throw StateError('Release builds must use HTTPS for API_BASE_URL.');
      }
      if (isLoopback || host.endsWith('.local') || host == 'host.docker.internal') {
        throw StateError(
          'Release builds must not target a development host for API_BASE_URL.',
        );
      }
    }
    return value;
  }

  ApiClient({
    String baseUrl = ApiEndpoints.baseUrl,
    Dio? dio,
    String Function()? languageCode,
    AuthTokenReader? authToken,
    this.refreshAccessToken,
    bool logRequests = kDebugMode,
  }) : dio =
           dio ??
           Dio(
             BaseOptions(
               // Only a client that builds its own transport validates the base
               // URL: an injected Dio (tests, custom transports) already owns it.
               baseUrl: ApiClient.requireAbsoluteBaseUrl(baseUrl),
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
          String? token;
          try {
            token = await authToken?.call();
          } catch (_) {
            token = null;
          }
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final canRefresh =
              error.response?.statusCode == 401 &&
              refreshAccessToken != null &&
              request.extra['authRetry'] != true &&
              !request.path.endsWith('/auth/refresh') &&
              !request.path.endsWith('/auth/google') &&
              !request.path.endsWith('/auth/login') &&
              !request.path.endsWith('/auth/register');
          if (!canRefresh) {
            handler.next(error);
            return;
          }
          try {
            _refreshInFlight ??= refreshAccessToken!();
            if (await _refreshInFlight == true) {
              handler.resolve(
                await this.dio.fetch<dynamic>(
                  request.copyWith(
                    extra: {...request.extra, 'authRetry': true},
                  ),
                ),
              );
              return;
            }
          } catch (_) {
            // Preserve the original 401 when the session cannot be refreshed.
          } finally {
            _refreshInFlight = null;
          }
          handler.next(error);
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
  }) => dio.get<T>(
    path,
    queryParameters: queryParameters,
    options: options,
    cancelToken: cancelToken,
  );

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) => dio.post<T>(
    path,
    data: data,
    queryParameters: queryParameters,
    options: options,
    cancelToken: cancelToken,
  );

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) => dio.delete<T>(
    path,
    data: data,
    queryParameters: queryParameters,
    options: options,
    cancelToken: cancelToken,
  );
}
