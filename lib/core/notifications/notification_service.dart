import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_providers.dart';
import '../../api/repositories/notifications_api.dart';
import '../../firebase_options.dart';
import '../network/auth_token.dart';

/// Top-level background message handler required by FirebaseMessaging.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (_) {
    // Ignore initialization errors in background isolates
  }
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  final api = ref.watch(notificationsApiProvider);
  final tokenReader = ref.watch(authTokenReaderProvider);
  return NotificationService(api, authTokenReader: tokenReader);
});

/// Manages Firebase Cloud Messaging lifecycle, permissions, token synchronization,
/// foreground presentation, and background notification routing.
class NotificationService {
  final NotificationsApi _api;
  final AuthTokenReader? authTokenReader;
  String? _currentToken;
  bool _isSynced = false;
  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _messageSub;
  StreamSubscription<RemoteMessage>? _messageOpenedSub;
  bool _isInitialized = false;

  NotificationService(this._api, {this.authTokenReader});

  bool get isInitialized => _isInitialized;
  bool get isSynced => _isSynced;
  String? get currentToken => _currentToken;

  /// Resolves a notification target screen or route string to a valid app route path.
  static String resolveRoute(String target) {
    final trimmed = target.trim();
    if (trimmed.startsWith('/')) return trimmed;

    switch (trimmed.toLowerCase()) {
      case 'dashboard':
        return '/overview/dashboard';
      case 'map':
        return '/overview/map';
      case 'regions':
        return '/overview/regions';
      case 'education':
        return '/insights/education';
      case 'healthcare':
        return '/insights/healthcare';
      case 'economy':
        return '/insights/economy';
      case 'infrastructure':
        return '/insights/infrastructure';
      case 'comparison':
        return '/insights/comparison';
      case 'history':
        return '/insights/history';
      case 'priority':
        return '/insights/priority';
      case 'data_quality':
      case 'data-quality':
        return '/insights/data-quality';
      case 'predictions':
        return '/intelligence/predictions';
      case 'assistant':
        return '/intelligence/assistant';
      case 'recommendations':
        return '/intelligence/recommendations';
      case 'simulator':
        return '/decisions/simulator';
      case 'projects':
        return '/decisions/projects';
      case 'reports':
      case 'citizen_reports':
      case 'citizen-reports':
        return '/decisions/reports';
      default:
        return '/$trimmed';
    }
  }

  /// Checks whether an authenticated user session is currently active.
  Future<bool> _isAuthenticated() async {
    final reader = authTokenReader;
    if (reader == null) return false;
    final token = await reader();
    return token != null && token.trim().isNotEmpty;
  }

  /// Initializes Firebase and sets up FCM messaging listeners.
  /// Operates safely in test and headless environments.
  Future<bool> initialize({void Function(String screen)? onNavigate}) async {
    if (_isInitialized) return true;

    try {
      // 1. Initialize Firebase App
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );

      // 2. Register Background Handler
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;

      // 3. Request permissions (Android 13+ and iOS)
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (kDebugMode) {
        debugPrint(
          '[NotificationService] Permission status: ${settings.authorizationStatus}',
        );
      }

      // 4. Foreground notification presentation options
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 5. Listen to registration stream for device token updates
      _tokenRefreshSub = messaging.onRegistered.listen((token) async {
        _currentToken = token;
        if (await _isAuthenticated()) {
          await _syncTokenWithBackend(token);
        } else {
          _isSynced = false;
          if (kDebugMode) {
            debugPrint(
              '[NotificationService] Device token generated before login. Buffered until user session.',
            );
          }
        }
      });

      // 6. Trigger device registration with FCM
      try {
        await messaging.register();
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[NotificationService] Could not register with FCM: $e');
        }
      }

      // 7. Foreground notification listener
      _messageSub = FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        if (kDebugMode) {
          debugPrint(
            '[NotificationService] Received foreground message: ${message.notification?.title}',
          );
        }
      });

      // 8. Notification tap routing (app opened from background)
      _messageOpenedSub = FirebaseMessaging.onMessageOpenedApp.listen((
        RemoteMessage message,
      ) {
        final screen = message.data['screen'] as String? ??
            message.data['route'] as String?;
        if (screen != null && onNavigate != null) {
          onNavigate(resolveRoute(screen));
        }
      });

      // 9. Initial notification launch (app launched from terminated state)
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        final screen = initialMessage.data['screen'] as String? ??
            initialMessage.data['route'] as String?;
        if (screen != null && onNavigate != null) {
          onNavigate(resolveRoute(screen));
        }
      }

      _isInitialized = true;
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint(
          '[NotificationService] Running without live Firebase messaging: $e',
        );
      }
      _isInitialized = false;
      return false;
    }
  }

  /// Sends the device token to the backend for push notification targeting.
  /// Strictly checks authentication before attempting registration.
  Future<void> _syncTokenWithBackend(String token) async {
    if (!await _isAuthenticated()) {
      if (kDebugMode) {
        debugPrint(
          '[NotificationService] Skipping token sync: user is not authenticated.',
        );
      }
      _isSynced = false;
      return;
    }

    try {
      final platform = defaultTargetPlatform == TargetPlatform.iOS
          ? 'ios'
          : 'android';
      await _api.registerDeviceToken(token: token, platform: platform);
      _isSynced = true;
    } catch (e) {
      _isSynced = false;
      if (kDebugMode) {
        debugPrint(
          '[NotificationService] Could not register token with API: $e',
        );
      }
    }
  }

  /// Called after successful login, or when an existing valid session is restored at startup.
  /// Syncs any buffered device token with the backend.
  Future<void> onUserAuthenticated() async {
    if (_currentToken != null) {
      await _syncTokenWithBackend(_currentToken!);
    }
  }

  /// Called upon user sign-out to deactivate device push registration.
  /// Preserves the token locally so that a subsequent login can immediately reclaim it.
  Future<void> onUserLoggedOut() async {
    final token = _currentToken;
    if (token != null) {
      try {
        await _api.unregisterDeviceToken(token: token);
      } catch (e) {
        if (kDebugMode) {
          debugPrint(
            '[NotificationService] Error deactivating token on logout: $e',
          );
        }
      }
    }
    _isSynced = false;
  }

  /// Explicitly unregisters the device token and clears cached token.
  Future<void> unregister() async {
    final token = _currentToken;
    if (token != null) {
      try {
        await _api.unregisterDeviceToken(token: token);
      } catch (_) {}
    }
    _currentToken = null;
    _isSynced = false;
  }

  /// Disposes active stream subscriptions.
  void dispose() {
    _tokenRefreshSub?.cancel();
    _messageSub?.cancel();
    _messageOpenedSub?.cancel();
  }
}
