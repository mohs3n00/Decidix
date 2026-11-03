import 'package:dio/dio.dart';
import '../../core/network/api_endpoints.dart';
import '../transport/api_transport.dart';

/// Push notification device token registration and cleanup.
class NotificationsApi {
  final ApiTransport _transport;

  const NotificationsApi(this._transport);

  /// Registers or rotates an FCM device token for the authenticated user.
  Future<void> registerDeviceToken({
    required String token,
    required String platform,
    String? deviceModel,
    CancelToken? cancelToken,
  }) async {
    await _transport.post(
      ApiEndpoints.deviceToken,
      body: {
        'token': token,
        'platform': platform,
        'device_model': ?deviceModel,
      },
      cancelToken: cancelToken,
    );
  }

  /// Deactivates a device token upon sign-out or notification opt-out.
  Future<void> unregisterDeviceToken({
    required String token,
    CancelToken? cancelToken,
  }) async {
    await _transport.delete(
      ApiEndpoints.deviceToken,
      body: {'token': token},
      cancelToken: cancelToken,
    );
  }
}
