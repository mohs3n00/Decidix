import 'dart:convert';

import 'package:decidix_app/core/auth/auth_controller.dart';
import 'package:decidix_app/core/network/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Stands in for the platform keystore so refresh/persistence paths can run in a
/// plain test isolate.
class _MemorySecureStorage {
  final Map<String, String> values = {};

  static const MethodChannel _channel = MethodChannel(
    'plugins.it_nomads.com/flutter_secure_storage',
  );

  void install() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, (call) async {
          final args = (call.arguments as Map?) ?? const {};
          final key = args['key'] as String?;
          switch (call.method) {
            case 'read':
              return values[key];
            case 'write':
              values[key!] = args['value'] as String;
              return null;
            case 'delete':
              values.remove(key);
              return null;
            case 'readAll':
              return Map<String, String>.from(values);
            case 'deleteAll':
              values.clear();
              return null;
            case 'containsKey':
              return values.containsKey(key);
            default:
              return null;
          }
        });
  }

  void removeHandler() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, null);
  }
}

class _Adapter implements HttpClientAdapter {
  _Adapter(this.handler);

  final ResponseBody Function(RequestOptions options) handler;
  int refreshCalls = 0;
  final List<String?> protectedAuth = [];
  Duration refreshDelay = Duration.zero;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path.endsWith('/auth/refresh')) {
      refreshCalls++;
      if (refreshDelay > Duration.zero) {
        await Future<void>.delayed(refreshDelay);
      }
    } else if (options.path.endsWith('/protected')) {
      protectedAuth.add(options.headers['Authorization'] as String?);
    }
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object body, [int status = 200]) => ResponseBody.fromString(
  jsonEncode(body),
  status,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  },
);

Future<void> _until(bool Function() predicate) async {
  for (var i = 0; i < 200; i++) {
    if (predicate()) return;
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
  fail('condition was not met within 2 seconds');
}

ApiClient _client(_Adapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local/v1'))
    ..httpClientAdapter = adapter;
  return ApiClient(dio: dio, logRequests: false);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _MemorySecureStorage storage;

  setUp(() {
    storage = _MemorySecureStorage()..install();
    SharedPreferences.setMockInitialValues({
      'auth_user': jsonEncode({
        'id': 'usr_session',
        'name': 'Session User',
        'email': 'session@decidix.org',
        'role': 'viewer',
      }),
    });
    storage.values['auth_token'] = 'start-access';
    storage.values['auth_refresh_token'] = 'start-refresh';
  });

  tearDown(() => storage.removeHandler());

  test('a rejected refresh clears the persisted session', () async {
    final adapter = _Adapter(
      (_) => _json({
        'error': {'code': 'INVALID_REFRESH_TOKEN', 'message': 'revoked'},
      }, 401),
    );
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(_client(adapter))],
    );
    addTearDown(container.dispose);

    container.read(authNotifierProvider);
    await _until(() => storage.values.isEmpty);

    final state = container.read(authNotifierProvider);
    expect(state.isAuthenticated, isFalse);
    expect(state.user, isNull);
    expect(state.accessToken, isNull);
    expect(state.refreshToken, isNull);
    expect(state.isInitialized, isTrue);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('auth_user'), isNull);
    expect(adapter.refreshCalls, 1);
  });

  test('concurrent callers share a single refresh rotation', () async {
    late final _Adapter adapter;
    adapter = _Adapter((options) {
      if (options.path.endsWith('/auth/refresh')) {
        final n = adapter.refreshCalls;
        return _json({
          'data': {'token': 'access-$n', 'refresh_token': 'refresh-$n'},
        });
      }
      return _json({'data': <String, dynamic>{}});
    });
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(_client(adapter))],
    );
    addTearDown(container.dispose);

    container.read(authNotifierProvider);
    // Startup restoration performs the first rotation.
    await _until(
      () =>
          adapter.refreshCalls == 1 &&
          container.read(authNotifierProvider).accessToken == 'access-1',
    );

    final notifier = container.read(authNotifierProvider.notifier);
    // Two callers in the same tick: a 401 retry path and a UI retry.
    final results = await Future.wait([
      notifier.refreshSession(),
      notifier.refreshSession(),
    ]);

    expect(results, [true, true]);
    // One startup rotation plus exactly one shared rotation, never a second
    // presentation of the same single-use token.
    expect(adapter.refreshCalls, 2);
    expect(storage.values['auth_refresh_token'], 'refresh-2');
  });

  test('restoration and a 401 retry share exactly one refresh request', () async {
    var protectedRequests = 0;
    late final ProviderContainer container;
    final adapter = _Adapter((options) {
      if (options.path.endsWith('/protected')) {
        protectedRequests++;
        if (protectedRequests == 1) {
          return _json({
            'error': {'code': 'TOKEN_EXPIRED', 'message': 'expired'},
          }, 401);
        }
        return _json({
          'data': {'ok': true},
        });
      }
      if (options.path.endsWith('/auth/refresh')) {
        return _json({
          'data': {'token': 'access-1', 'refresh_token': 'refresh-1'},
        });
      }
      return _json({'data': <String, dynamic>{}});
    })..refreshDelay = const Duration(milliseconds: 300);

    final dio = Dio(BaseOptions(baseUrl: 'https://test.local/v1'))
      ..httpClientAdapter = adapter;
    // Wired exactly like apiClientProvider: the interceptor delegates rotation
    // to the notifier instead of performing its own /auth/refresh call.
    final client = ApiClient(
      dio: dio,
      logRequests: false,
      authToken: () => container.read(authNotifierProvider).accessToken,
      refreshAccessToken: () =>
          container.read(authNotifierProvider.notifier).refreshSession(),
    );
    container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(client)],
    );
    addTearDown(container.dispose);

    // Startup restoration adopts the persisted tokens and starts rotating them;
    // /auth/refresh is deliberately slow so the rotation is still in flight.
    container.read(authNotifierProvider);
    await _until(
      () => container.read(authNotifierProvider).accessToken == 'start-access',
    );

    final response = await client.get('/protected');

    expect(adapter.refreshCalls, 1);
    expect(protectedRequests, 2);
    expect(response.data, {
      'data': {'ok': true},
    });
    // The retry used the rotated token, so persistence completed first.
    expect(adapter.protectedAuth.last, 'Bearer access-1');
    expect(storage.values['auth_token'], 'access-1');
    expect(storage.values['auth_refresh_token'], 'refresh-1');
    expect(container.read(authNotifierProvider).accessToken, 'access-1');
    expect(container.read(authNotifierProvider).refreshToken, 'refresh-1');
  });

  test('a refresh with no stored token does not call the backend', () async {
    SharedPreferences.setMockInitialValues({});
    storage.values.clear();

    final adapter = _Adapter((_) => _json({'data': <String, dynamic>{}}));
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(_client(adapter))],
    );
    addTearDown(container.dispose);

    container.read(authNotifierProvider);
    await _until(() => container.read(authNotifierProvider).isInitialized);

    expect(await container.read(authNotifierProvider.notifier).refreshSession(),
        isFalse);
    expect(adapter.refreshCalls, 0);
  });
}
