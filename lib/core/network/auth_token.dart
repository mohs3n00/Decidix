import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Gives the bearer token for the next request, or null when nobody is signed in.
///
/// It may be asynchronous: a Clerk session token is short-lived and is asked
/// for just before each request.
typedef AuthTokenReader = FutureOr<String?> Function();

/// Where the app gets its token. There is no sign-in yet, so nobody has one
/// (decision 2 in docs/api_contract.md). When Clerk is added, override this
/// provider with `() => session.getToken()`; nothing else has to change.
final authTokenReaderProvider = Provider<AuthTokenReader>(
  (ref) =>
      () => null,
);
