import 'package:flutter/foundation.dart' show debugPrint, kReleaseMode;
import '../network/api_endpoints.dart';

class AppConfig {
  AppConfig._();

  /// Normalizes API base URL by trimming whitespace and removing trailing slashes.
  static String normalizeApiBaseUrl(String url) {
    var trimmed = url.trim();
    while (trimmed.endsWith('/')) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
    }
    return trimmed;
  }

  /// Safe startup diagnostics that report:
  /// - Whether API configuration was loaded.
  /// - Whether the URL is valid.
  /// - The API host and path prefix.
  /// - Whether the application is using development, emulator, or production configuration.
  /// Never logs credentials, authorization headers, Google ID tokens, passwords, or FCM tokens.
  static void logStartupDiagnostics({String baseUrl = ApiEndpoints.baseUrl}) {
    final normalized = normalizeApiBaseUrl(baseUrl);
    final isLoaded = normalized.isNotEmpty;
    final uri = Uri.tryParse(normalized);
    final isValid = uri != null && uri.hasScheme && uri.host.isNotEmpty;

    final host = isValid ? uri.host : '(missing_or_invalid)';
    final prefix = isValid ? (uri.path.isEmpty ? '/' : uri.path) : '(none)';
    final isEmulator = host == '10.0.2.2';
    final isLocal = host == 'localhost' || host == '127.0.0.1';

    final String environmentType;
    if (kReleaseMode) {
      environmentType = 'production/release';
    } else if (isEmulator) {
      environmentType = 'local_android_emulator';
    } else if (isLocal) {
      environmentType = 'local_development';
    } else if (isValid && uri.scheme == 'https') {
      environmentType = 'deployed_https_backend';
    } else {
      environmentType = 'custom_development';
    }

    debugPrint(
      '--------------------------------------------------\n'
      '[Decidix Startup Diagnostic]\n'
      '  API Config Loaded   : $isLoaded\n'
      '  API Base URL Valid  : $isValid\n'
      '  Resolved Host       : $host\n'
      '  Resolved Prefix     : $prefix\n'
      '  Target Environment  : $environmentType\n'
      '  Mock Data Fallback  : $useMock\n'
      '  Release Mode        : $kReleaseMode\n'
      '--------------------------------------------------',
    );
  }

  /// What the build asked for. Mock data is a development convenience only.
  static const bool _useMockRequested = bool.fromEnvironment(
    'USE_MOCK',
    defaultValue: true,
  );

  /// The mode the app actually runs in.
  ///
  /// A release build can never serve `assets/mock`, even if `USE_MOCK=true` was
  /// passed, so a misconfigured store build fails loudly on its missing API
  /// address instead of silently presenting simulated statistics as real.
  ///
  /// flutter run --dart-define-from-file=env/dev.json   (mock, development)
  /// flutter run --dart-define-from-file=env/prod.json  (real API, release)
  static bool get useMock =>
      resolveUseMock(requested: _useMockRequested, isRelease: kReleaseMode);

  static bool resolveUseMock({
    required bool requested,
    required bool isRelease,
  }) => requested && !isRelease;

  /// Fails before the first request when the transport configuration cannot be
  /// trusted, with a message that says what to change. Never falls back.
  static void validateApiConfiguration({
    required bool useMock,
    required String baseUrl,
    bool isRelease = kReleaseMode,
  }) {
    if (useMock) {
      if (isRelease) {
        throw StateError(
          'Mock data is not allowed in a release build. Build with '
          '--dart-define-from-file=env/prod.json so the app calls the real API.',
        );
      }
      return;
    }

    final url = baseUrl.trim();
    if (url.isEmpty) {
      throw StateError(
        'API_BASE_URL is not set. Build with --dart-define-from-file=env/prod.json '
        '(or env/staging.json for staging).',
      );
    }

    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw StateError('API_BASE_URL is not a valid absolute URL.');
    }

    final scheme = uri.scheme.toLowerCase();
    final host = uri.host.toLowerCase();
    final isLoopback =
        host == 'localhost' ||
        host == '127.0.0.1' ||
        host == '10.0.2.2' ||
        host == '0.0.0.0' ||
        host == '::1';

    if (isRelease) {
      if (scheme != 'https') {
        throw StateError('Release builds must use HTTPS for API_BASE_URL.');
      }
      if (isLoopback ||
          host.endsWith('.local') ||
          host == 'host.docker.internal') {
        throw StateError(
          'Release builds must not target a development host for API_BASE_URL.',
        );
      }
      return;
    }

    if (scheme != 'https' && scheme != 'http') {
      throw StateError('API_BASE_URL must use http or https.');
    }
    if (scheme == 'http' && !isLoopback && !host.endsWith('.local')) {
      throw StateError(
        'Plain HTTP is only allowed for a local development address.',
      );
    }
  }

  /// Where the map tiles come from. The default is the public OpenStreetMap
  /// server, which is fine for development but not for a launched app. For a
  /// style like Google's, use a provider such as MapTiler or Mapbox:
  ///
  /// --dart-define=MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY
  /// --dart-define=MAP_ATTRIBUTION="© MapTiler © OpenStreetMap contributors"
  static const String mapTileUrl = String.fromEnvironment(
    'MAP_TILE_URL',
    defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  );

  /// Shown on the map. Every tile provider requires it.
  static const String mapAttribution = String.fromEnvironment(
    'MAP_ATTRIBUTION',
    defaultValue: '© OpenStreetMap contributors',
  );

  /// Canonical Google OAuth 2.0 Web Client ID registered in Google Cloud Console project `decidix` (50086376748).
  static const String defaultGoogleServerClientId =
      '50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com';

  /// Google OAuth 2.0 Web Client ID used as serverClientId on Android to request ID tokens.
  /// Defaults to [defaultGoogleServerClientId] so every supported Android build configuration
  /// reliably receives the intended Web Client ID even if `--dart-define-from-file` was omitted.
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: defaultGoogleServerClientId,
  );
}
