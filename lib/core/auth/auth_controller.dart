import '../config/app_config.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../notifications/notification_service.dart';

const String _prefUserKey = 'auth_user';
const String _prefTokenKey = 'auth_token';
const String _prefRefreshKey = 'auth_refresh_token';
const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

class DecidixUser {
  final String id;
  final String name;
  final String? arabicName;
  final String email;
  final String role;
  final bool emailVerified;
  final String status;
  final bool mustChangePassword;

  const DecidixUser({
    required this.id,
    required this.name,
    this.arabicName,
    required this.email,
    required this.role,
    this.emailVerified = true,
    this.status = 'active',
    this.mustChangePassword = false,
  });

  bool get isAdmin => role.toLowerCase() == 'admin';
  bool get isSuspended => status.toLowerCase() == 'suspended';

  factory DecidixUser.fromJson(Map<String, dynamic> json) => DecidixUser(
    id: json['id'] as String,
    name: json['name'] as String,
    arabicName: json['arabic_name'] as String?,
    email: json['email'] as String,
    role: json['role'] as String? ?? 'viewer',
    emailVerified: json['email_verified'] as bool? ?? true,
    status: json['status'] as String? ?? 'active',
    mustChangePassword: json['must_change_password'] as bool? ?? false,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'arabic_name': arabicName,
    'email': email,
    'role': role,
    'email_verified': emailVerified,
    'status': status,
    'must_change_password': mustChangePassword,
  };
}

class AuthState {
  final DecidixUser? user;
  final String? accessToken;
  final String? refreshToken;
  final bool isLoading;
  final String? errorMessage;
  final bool isInitialized;

  const AuthState({
    this.user,
    this.accessToken,
    this.refreshToken,
    this.isLoading = false,
    this.errorMessage,
    this.isInitialized = false,
  });

  bool get isAuthenticated => user != null && accessToken != null;

  AuthState copyWith({
    DecidixUser? user,
    String? accessToken,
    String? refreshToken,
    bool? isLoading,
    String? errorMessage,
    bool? isInitialized,
    bool clearError = false,
    bool clearAuth = false,
  }) {
    return AuthState(
      user: clearAuth ? null : (user ?? this.user),
      accessToken: clearAuth ? null : (accessToken ?? this.accessToken),
      refreshToken: clearAuth ? null : (refreshToken ?? this.refreshToken),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isInitialized: isInitialized ?? this.isInitialized,
    );
  }
}

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

class AuthNotifier extends Notifier<AuthState> {
  bool _initializedGoogle = false;

  @override
  AuthState build() {
    _loadPersistedSession();
    try {
      validateGoogleConfiguration();
    } catch (e) {
      debugPrint('[AuthNotifier] Startup auth configuration diagnostic: $e');
    }
    return const AuthState();
  }

  /// Validates Google Sign-In configuration before initialization.
  /// Throws [StateError] with actionable instructions if missing.
  void validateGoogleConfiguration({String? candidateServerClientId}) {
    final clientId = (candidateServerClientId ?? AppConfig.googleServerClientId).trim();
    if (clientId.isEmpty) {
      throw StateError(
        'Google Sign-In configuration error: serverClientId must be provided on Android. '
        'Configure GOOGLE_SERVER_CLIENT_ID in env/staging.json or provide AppConfig.defaultGoogleServerClientId.',
      );
    }
  }

  Future<void> _ensureGoogleInitialized() async {
    if (_initializedGoogle) return;
    validateGoogleConfiguration();
    final serverClientId = AppConfig.googleServerClientId.trim();
    await GoogleSignIn.instance.initialize(
      serverClientId: serverClientId,
    );
    _initializedGoogle = true;
  }

  @visibleForTesting
  Future<void> ensureGoogleInitializedForTesting([String? overrideServerClientId]) async {
    validateGoogleConfiguration(candidateServerClientId: overrideServerClientId);
    final serverClientId = (overrideServerClientId ?? AppConfig.googleServerClientId).trim();
    await GoogleSignIn.instance.initialize(
      serverClientId: serverClientId,
    );
    _initializedGoogle = true;
  }

  Future<void> _loadPersistedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString(_prefUserKey);
      final token = await _secureStorage.read(key: _prefTokenKey);
      final refresh = await _secureStorage.read(key: _prefRefreshKey);

      if (userJson != null && token != null && refresh != null) {
        final user = DecidixUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
        if (ref.mounted) {
          state = state.copyWith(
            user: user,
            accessToken: token,
            refreshToken: refresh,
            isInitialized: true,
          );
        }
        await refreshSession();
        try {
          ref.read(notificationServiceProvider).onUserAuthenticated();
        } catch (_) {}
        return;
      }

    } catch (e) {
      debugPrint('[AuthNotifier] Error loading persisted session: $e');
    }
    if (ref.mounted) {
      state = state.copyWith(isInitialized: true);
    }
  }

  Future<bool>? _refreshInFlight;

  /// Rotates the refresh token at most once at a time.
  ///
  /// Startup restoration and a 401 from the HTTP client can ask at the same
  /// moment. Refresh tokens are single-use: presenting the same one twice makes
  /// the backend treat it as reuse and revoke every session for the user, so
  /// concurrent callers must share one rotation instead of starting another.
  Future<bool> refreshSession() {
    final existing = _refreshInFlight;
    if (existing != null) return existing;

    final refreshToken = state.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      return Future<bool>.value(false);
    }

    final flight = _performRefresh();
    _refreshInFlight = flight;
    return flight.whenComplete(() {
      if (identical(_refreshInFlight, flight)) _refreshInFlight = null;
    });
  }

  Future<bool> _performRefresh() async {
    final refreshToken = state.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final response = await ref.read(apiClientProvider).post(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final token = data['token'] as String;
      final rotatedRefreshToken = data['refresh_token'] as String;
      await _persistTokens(token, rotatedRefreshToken);
      if (ref.mounted) {
        state = state.copyWith(
          accessToken: token,
          refreshToken: rotatedRefreshToken,
          clearError: true,
        );
      }
      return true;
    } catch (e) {
      debugPrint('[AuthNotifier] Session refresh failed: $e');
      await _clearPersistedSession();
      if (ref.mounted) {
        state = state.copyWith(clearAuth: true, isLoading: false);
      }
      return false;
    }
  }

  Future<void> _persistTokens(String token, String refreshToken) async {
    await _secureStorage.write(key: _prefTokenKey, value: token);
    await _secureStorage.write(key: _prefRefreshKey, value: refreshToken);
  }

  /// Best-effort wipe: one failing store must never leave the session usable.
  Future<void> _clearPersistedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefUserKey);
    } catch (e) {
      debugPrint('[AuthNotifier] Could not clear persisted user: $e');
    }
    for (final key in const [_prefTokenKey, _prefRefreshKey]) {
      try {
        await _secureStorage.delete(key: key);
      } catch (e) {
        debugPrint('[AuthNotifier] Could not clear $key: $e');
      }
    }
  }

  /// Returns a user-facing message when the backend address is missing or not
  /// absolute, so authentication fails with instructions instead of the
  /// "No host specified in URI /auth/google" Dio error.
  String? _backendConfigurationError() {
    try {
      ApiClient.requireAbsoluteBaseUrl(ApiEndpoints.baseUrl);
      return null;
    } on StateError catch (error) {
      return error.message;
    }
  }

  /// Email/password sign-in against the Backend `/auth/login` route.
  /// This path works independently of Google OAuth configuration.
  Future<bool> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty || password.isEmpty) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Email and password are required.',
        );
      }
      return false;
    }
    final configurationError = _backendConfigurationError();
    if (configurationError != null) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: configurationError,
        );
      }
      return false;
    }
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post(
        '/auth/login',
        data: {'email': trimmedEmail, 'password': password},
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final user = DecidixUser.fromJson(data['user'] as Map<String, dynamic>);
      final token = data['token'] as String;
      final refreshToken = data['refresh_token'] as String;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefUserKey, jsonEncode(user.toJson()));
      await _persistTokens(token, refreshToken);

      if (ref.mounted) {
        state = state.copyWith(
          user: user,
          accessToken: token,
          refreshToken: refreshToken,
          isLoading: false,
          clearError: true,
        );
      }
      try {
        ref.read(notificationServiceProvider).onUserAuthenticated();
      } catch (_) {}
      return true;
    } catch (e) {
      debugPrint('[AuthNotifier] Password sign-in error: $e');
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Sign-in failed. Check your email and password.',
        );
      }
      return false;
    }
  }

  /// Registration of a new email/password account against `/auth/register`.
  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? arabicName,
  }) async {
    final trimmedName = name.trim();
    final trimmedEmail = email.trim();
    if (trimmedName.isEmpty || trimmedEmail.isEmpty || password.isEmpty) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Name, email and password are required.',
        );
      }
      return false;
    }
    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(trimmedEmail)) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Invalid email address.',
        );
      }
      return false;
    }
    if (password.length < 8) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Password must be at least 8 characters.',
        );
      }
      return false;
    }
    final configurationError = _backendConfigurationError();
    if (configurationError != null) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: configurationError,
        );
      }
      return false;
    }
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post(
        '/auth/register',
        data: {
          'name': trimmedName,
          'email': trimmedEmail,
          'password': password,
          if (arabicName != null && arabicName.trim().isNotEmpty)
            'arabic_name': arabicName.trim(),
        },
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final user = DecidixUser.fromJson(data['user'] as Map<String, dynamic>);
      final token = data['token'] as String;
      final refreshToken = data['refresh_token'] as String;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefUserKey, jsonEncode(user.toJson()));
      await _persistTokens(token, refreshToken);

      if (ref.mounted) {
        state = state.copyWith(
          user: user,
          accessToken: token,
          refreshToken: refreshToken,
          isLoading: false,
          clearError: true,
        );
      }
      try {
        ref.read(notificationServiceProvider).onUserAuthenticated();
      } catch (_) {}
      return true;
    } catch (e) {
      debugPrint('[AuthNotifier] Registration error: $e');
      String msg = 'Registration failed. Please check your information.';
      if (e is DioException && e.response?.data is Map) {
        final err = (e.response!.data as Map)['error'];
        if (err is Map && err['message'] is String) {
          msg = err['message'] as String;
        }
      }
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: msg,
        );
      }
      return false;
    }
  }

  Future<bool> signInWithGoogle() async {
    // Check the backend address before opening the Google account picker: a
    // missing API_BASE_URL can never succeed, and asking the user to choose an
    // account first only to fail is worse than saying so immediately.
    final configurationError = _backendConfigurationError();
    if (configurationError != null) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: configurationError,
        );
      }
      return false;
    }
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _ensureGoogleInitialized();
      final GoogleSignInAccount account = await GoogleSignIn.instance.authenticate();
      final GoogleSignInAuthentication auth = account.authentication;
      final String? idToken = auth.idToken;

      if (idToken == null || idToken.isEmpty) {
        throw Exception('Google Sign-In returned an empty ID token.');
      }

      return await _exchangeTokenWithBackend(idToken);
    } catch (e) {
      debugPrint('[AuthNotifier] Google Sign-In error: $e');
      if (e is GoogleSignInException && e.code == GoogleSignInExceptionCode.canceled) {
        if (ref.mounted) state = state.copyWith(isLoading: false);
        return false;
      }
      final errorMsg = e is StateError
          ? e.message
          : (e.toString().contains('ApiException: 10') ||
                  e.toString().contains('12500') ||
                  e.toString().contains('developer_error')
              ? 'Google Sign-In requires SHA-1 certificate registration in Google Cloud Console. Use Demo Sign-In below for evaluation.'
              : 'Authentication failed: ${e.toString()}');
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: errorMsg,
        );
      }
      return false;
    }
  }

  Future<bool> signInWithDemoGoogle({
    String email = 'evaluator@decidix.org',
    String name = 'Decidix Evaluator',
  }) async {
    if (!kDebugMode || !AppConfig.useMock) {
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Demo authentication is available only in debug mock mode.',
        );
      }
      return false;
    }
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final demoToken = 'test_google_:$email:$name';
      final success = await _exchangeTokenWithBackend(demoToken);
      if (success) return true;

      // Local demo sessions are restricted above to debug mock mode and are
      // never accepted as production authentication.
      final user = DecidixUser(
        id: 'usr_evaluator_demo',
        name: name,
        arabicName: 'مقيّم المشروع',
        email: email,
        role: 'viewer',
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefUserKey, jsonEncode(user.toJson()));
      await _secureStorage.write(
        key: _prefTokenKey,
        value: 'demo_evaluator_jwt_token',
      );
      await _secureStorage.write(
        key: _prefRefreshKey,
        value: 'demo_evaluator_refresh_token',
      );

      if (ref.mounted) {
        state = state.copyWith(
          user: user,
          accessToken: 'demo_evaluator_jwt_token',
          refreshToken: 'demo_evaluator_refresh_token',
          isLoading: false,
          clearError: true,
        );
      }
      return true;
    } catch (e) {
      if (ref.mounted) {
        state = state.copyWith(isLoading: false, errorMessage: e.toString());
      }
      return false;
    }
  }

  Future<bool> _exchangeTokenWithBackend(String idToken) async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post(
        '/auth/google',
        data: {'id_token': idToken},
      );

      final data = response.data['data'] as Map<String, dynamic>;
      final userMap = data['user'] as Map<String, dynamic>;
      final token = data['token'] as String;
      final refreshToken = data['refresh_token'] as String;

      final user = DecidixUser.fromJson(userMap);

      // Persist session locally
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefUserKey, jsonEncode(user.toJson()));
      await _persistTokens(token, refreshToken);

      if (ref.mounted) {
        state = state.copyWith(
          user: user,
          accessToken: token,
          refreshToken: refreshToken,
          isLoading: false,
          clearError: true,
        );
      }

      // Trigger FCM notification token sync
      try {
        ref.read(notificationServiceProvider).onUserAuthenticated();
      } catch (_) {}

      return true;
    } catch (e) {
      debugPrint('[AuthNotifier] Backend exchange error: $e');
      if (ref.mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: _describeBackendExchangeFailure(e),
        );
      }
      return false;
    }
  }

  /// Turns the backend response into a message that names the actual problem.
  ///
  /// The deployed API answers `/auth/google` with 503 GOOGLE_CONFIG_MISSING
  /// while its Google audience is unset; reporting that is more useful than a
  /// transport exception dump.
  static String _describeBackendExchangeFailure(Object error) {
    if (error is StateError) return error.message;
    if (error is DioException) {
      final data = error.response?.data;
      final code = data is Map && data['error'] is Map
          ? (data['error'] as Map)['code']
          : null;
      if (code == 'GOOGLE_CONFIG_MISSING') {
        return 'Google sign-in is not configured on the backend. '
            'The API server needs GOOGLE_WEB_CLIENT_ID set to the Web client ID.';
      }
      if (error.response?.statusCode == 503 &&
          error.response?.data == null) {
        return 'The backend is unavailable right now. Try again shortly.';
      }
    }
    return 'Backend token verification failed: $error';
  }

  /// Request a password reset link for [email].
  /// Anti-enumeration friendly: succeeds as long as request is received.
  Future<({bool success, String message})> requestPasswordReset(String email) async {
    final trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty) {
      return (success: false, message: 'Please enter your email address.');
    }
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post(
        '/auth/forgot-password',
        data: {'email': trimmedEmail},
      );
      final data = response.data as Map<String, dynamic>;
      final msg = (data['data'] as Map<String, dynamic>?)?['message'] as String? ??
          'If an account exists with this email, a password reset link has been sent.';
      return (success: true, message: msg);
    } catch (e) {
      debugPrint('[AuthNotifier] requestPasswordReset error: $e');
      if (e is DioException && e.response?.data is Map) {
        final err = (e.response!.data as Map)['error'];
        if (err is Map && err['code'] == 'RESET_THROTTLED') {
          return (
            success: false,
            message: 'Please wait a minute before requesting another reset link.',
          );
        }
      }
      return (
        success: false,
        message: 'Could not send reset link. Please check your connection.',
      );
    }
  }

  /// Resend email verification link for the currently signed-in user or [candidateEmail].
  Future<({bool success, String message})> resendVerificationEmail([String? candidateEmail]) async {
    final targetEmail = (candidateEmail ?? state.user?.email ?? '').trim();
    if (targetEmail.isEmpty) {
      return (success: false, message: 'No email address found to verify.');
    }
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post(
        '/auth/resend-verification',
        data: {'email': targetEmail},
      );
      final data = response.data as Map<String, dynamic>;
      final msg = (data['data'] as Map<String, dynamic>?)?['message'] as String? ??
          'Verification email has been sent. Please check your inbox.';
      return (success: true, message: msg);
    } catch (e) {
      debugPrint('[AuthNotifier] resendVerificationEmail error: $e');
      if (e is DioException && e.response?.data is Map) {
        final err = (e.response!.data as Map)['error'];
        if (err is Map && err['code'] == 'RESEND_THROTTLED') {
          return (
            success: false,
            message: 'Please wait a minute before requesting another verification email.',
          );
        }
      }
      return (
        success: false,
        message: 'Could not send verification email. Please check your connection.',
      );
    }
  }

  /// Changes password for the authenticated user and clears `mustChangePassword`.
  Future<({bool success, String message})> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final cur = currentPassword.trim();
    final next = newPassword.trim();
    if (cur.isEmpty || next.isEmpty) {
      return (success: false, message: 'Both current and new password are required.');
    }
    if (next.length < 8) {
      return (success: false, message: 'New password must be at least 8 characters.');
    }
    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        '/auth/change-password',
        data: {
          'current_password': cur,
          'new_password': next,
        },
      );

      if (state.user != null) {
        final updatedUser = DecidixUser(
          id: state.user!.id,
          name: state.user!.name,
          arabicName: state.user!.arabicName,
          email: state.user!.email,
          role: state.user!.role,
          emailVerified: state.user!.emailVerified,
          status: state.user!.status,
          mustChangePassword: false,
        );
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_prefUserKey, jsonEncode(updatedUser.toJson()));
        if (ref.mounted) {
          state = state.copyWith(user: updatedUser);
        }
      }
      return (success: true, message: 'Password updated successfully.');
    } catch (e) {
      debugPrint('[AuthNotifier] changePassword error: $e');
      if (e is DioException && e.response?.data is Map) {
        final err = (e.response!.data as Map)['error'];
        if (err is Map && err['message'] is String) {
          return (success: false, message: err['message'] as String);
        }
      }
      return (success: false, message: 'Failed to update password. Check your current password.');
    }
  }

  Future<void> signOut() async {
    final refresh = state.refreshToken;
    state = state.copyWith(clearAuth: true, isLoading: false);

    try {
      ref.read(notificationServiceProvider).onUserLoggedOut();
    } catch (_) {}

    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {}

    try {
      await _clearPersistedSession();
    } catch (_) {}

    if (refresh != null) {
      try {
        final api = ref.read(apiClientProvider);
        await api.post('/auth/logout', data: {'refresh_token': refresh});
      } catch (_) {}
    }
  }
}
