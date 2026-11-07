import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';

/// Gives the bearer token for the next request, or null when nobody is signed in.
typedef AuthTokenReader = FutureOr<String?> Function();

/// Connects the HTTP client's Bearer token with the active Decidix authenticated session.
final authTokenReaderProvider = Provider<AuthTokenReader>((ref) {
  return () => ref.read(authNotifierProvider).accessToken;
});
