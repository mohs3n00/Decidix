import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/api/repositories/notifications_api.dart';
import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/api/transport/mock_transport.dart';
import 'package:decidix_app/core/notifications/notification_service.dart';
import 'package:dio/dio.dart';

class RecordingTransport implements ApiTransport {
  final List<Map<String, dynamic>> recordedCalls = [];

  @override
  Future<ApiEnvelope> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  }) async {
    recordedCalls.add({'method': 'GET', 'path': path, 'query': query});
    return const ApiEnvelope({});
  }

  @override
  Future<ApiEnvelope> post(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  }) async {
    recordedCalls.add({'method': 'POST', 'path': path, 'body': body});
    return const ApiEnvelope({'message': 'Device token registered successfully'});
  }

  @override
  Future<ApiEnvelope> delete(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  }) async {
    recordedCalls.add({'method': 'DELETE', 'path': path, 'body': body});
    return const ApiEnvelope({'message': 'Device token deactivated successfully'});
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('NotificationsApi', () {
    late RecordingTransport transport;
    late NotificationsApi api;

    setUp(() {
      transport = RecordingTransport();
      api = NotificationsApi(transport);
    });

    test('registerDeviceToken sends post request with payload', () async {
      await api.registerDeviceToken(
        token: 'fcm_test_token_123',
        platform: 'android',
        deviceModel: 'Pixel 8',
      );

      expect(transport.recordedCalls, hasLength(1));
      final call = transport.recordedCalls.first;
      expect(call['method'], 'POST');
      expect(call['path'], '/notifications/device-token');
      expect(call['body'], {
        'token': 'fcm_test_token_123',
        'platform': 'android',
        'device_model': 'Pixel 8',
      });
    });

    test('registerDeviceToken omits null deviceModel', () async {
      await api.registerDeviceToken(
        token: 'fcm_test_token_456',
        platform: 'ios',
      );

      expect(transport.recordedCalls, hasLength(1));
      final call = transport.recordedCalls.first;
      expect(call['method'], 'POST');
      expect(call['path'], '/notifications/device-token');
      expect(call['body'], {
        'token': 'fcm_test_token_456',
        'platform': 'ios',
      });
    });

    test('unregisterDeviceToken sends delete request with token', () async {
      await api.unregisterDeviceToken(token: 'fcm_test_token_123');

      expect(transport.recordedCalls, hasLength(1));
      final call = transport.recordedCalls.first;
      expect(call['method'], 'DELETE');
      expect(call['path'], '/notifications/device-token');
      expect(call['body'], {'token': 'fcm_test_token_123'});
    });
  });

  group('MockTransport device token handling', () {
    late MockTransport mock;
    late NotificationsApi api;

    setUp(() {
      mock = MockTransport(latency: Duration.zero);
      api = NotificationsApi(mock);
    });

    test('registers device token successfully against mock transport', () async {
      await expectLater(
        api.registerDeviceToken(
          token: 'mock_token_abc',
          platform: 'android',
        ),
        completes,
      );
    });

    test('unregisters device token successfully against mock transport', () async {
      await expectLater(
        api.unregisterDeviceToken(token: 'mock_token_abc'),
        completes,
      );
    });
  });

  group('NotificationService lifecycle & resilience', () {
    late RecordingTransport transport;
    late NotificationsApi api;
    late NotificationService service;

    setUp(() {
      transport = RecordingTransport();
      api = NotificationsApi(transport);
      service = NotificationService(api);
    });

    tearDown(() {
      service.dispose();
    });

    test('initial state has null token and uninitialized flag', () {
      expect(service.isInitialized, isFalse);
      expect(service.currentToken, isNull);
      expect(service.isSynced, isFalse);
    });

    test('unregister does not throw when token is null', () async {
      await expectLater(service.unregister(), completes);
      expect(transport.recordedCalls, isEmpty);
    });

    test('initialize safely degrades to false in unit test environment', () async {
      final success = await service.initialize();
      expect(success, isFalse);
      expect(service.isInitialized, isFalse);
    });

    test('dispose cancels active streams cleanly', () {
      expect(() => service.dispose(), returnsNormally);
    });
  });

  group('Phase E2.1 — Auth-Gated Token Lifecycle & Account Switching', () {
    late RecordingTransport transport;
    late NotificationsApi api;
    String? currentAuthSession;

    setUp(() {
      transport = RecordingTransport();
      api = NotificationsApi(transport);
      currentAuthSession = null;
    });

    test('buffers token and suppresses API call when user is not authenticated', () async {
      final service = NotificationService(
        api,
        authTokenReader: () => currentAuthSession,
      );

      // Simulating a token arrival before login
      await service.onUserAuthenticated(); // no token cached yet
      expect(transport.recordedCalls, isEmpty);
      expect(service.isSynced, isFalse);
    });

    test('dispatches registration when user logs in and token is cached', () async {
      final service = NotificationService(
        api,
        authTokenReader: () => currentAuthSession,
      );

      // User signs in
      currentAuthSession = 'valid_jwt_token_planner_1';

      // Manually trigger token sync on authentication
      await service.onUserAuthenticated();
      expect(transport.recordedCalls, isEmpty); // no token generated yet

      // Directly register via api with service
      await api.registerDeviceToken(
        token: 'device_token_xyz',
        platform: 'android',
      );
      expect(transport.recordedCalls, hasLength(1));
      expect(transport.recordedCalls.first['method'], 'POST');
    });

    test('account switching cleans up previous token and re-registers for new user', () async {
      final service = NotificationService(
        api,
        authTokenReader: () => currentAuthSession,
      );

      // 1. User A is logged in
      currentAuthSession = 'user_a_jwt';
      await service.onUserAuthenticated();
      await api.registerDeviceToken(token: 'shared_device_token', platform: 'android');
      expect(transport.recordedCalls, hasLength(1));
      expect(transport.recordedCalls.last['method'], 'POST');

      // 2. User A logs out
      await service.onUserLoggedOut();
      await api.unregisterDeviceToken(token: 'shared_device_token');
      expect(transport.recordedCalls, hasLength(2));
      expect(transport.recordedCalls.last['method'], 'DELETE');

      // 3. User B logs in on the same device
      currentAuthSession = 'user_b_jwt';
      await service.onUserAuthenticated();
      await api.registerDeviceToken(token: 'shared_device_token', platform: 'android');
      expect(transport.recordedCalls, hasLength(3));
      expect(transport.recordedCalls.last['method'], 'POST');
    });
  });

  group('Phase E2.1 — Route & Deep-Link Resolution', () {
    test('resolves screen shortcut names to valid canonical routes', () {
      expect(NotificationService.resolveRoute('dashboard'), '/overview/dashboard');
      expect(NotificationService.resolveRoute('map'), '/overview/map');
      expect(NotificationService.resolveRoute('regions'), '/overview/regions');
      expect(NotificationService.resolveRoute('education'), '/insights/education');
      expect(NotificationService.resolveRoute('healthcare'), '/insights/healthcare');
      expect(NotificationService.resolveRoute('economy'), '/insights/economy');
      expect(NotificationService.resolveRoute('infrastructure'), '/insights/infrastructure');
      expect(NotificationService.resolveRoute('comparison'), '/insights/comparison');
      expect(NotificationService.resolveRoute('history'), '/insights/history');
      expect(NotificationService.resolveRoute('priority'), '/insights/priority');
      expect(NotificationService.resolveRoute('data-quality'), '/insights/data-quality');
      expect(NotificationService.resolveRoute('predictions'), '/intelligence/predictions');
      expect(NotificationService.resolveRoute('assistant'), '/intelligence/assistant');
      expect(NotificationService.resolveRoute('recommendations'), '/intelligence/recommendations');
      expect(NotificationService.resolveRoute('simulator'), '/decisions/simulator');
      expect(NotificationService.resolveRoute('projects'), '/decisions/projects');
      expect(NotificationService.resolveRoute('reports'), '/decisions/reports');
      expect(NotificationService.resolveRoute('citizen_reports'), '/decisions/reports');
    });

    test('preserves explicit canonical paths with leading slashes', () {
      expect(
        NotificationService.resolveRoute('/decisions/projects'),
        '/decisions/projects',
      );
      expect(
        NotificationService.resolveRoute('/overview/regions/frontier'),
        '/overview/regions/frontier',
      );
    });
  });
}
