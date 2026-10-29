import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../core/network/api_client.dart';
import '../core/network/api_endpoints.dart';
import 'repositories/decisions_api.dart';
import 'repositories/insights_api.dart';
import 'repositories/intelligence_api.dart';
import 'repositories/overview_api.dart';
import 'transport/api_transport.dart';
import 'transport/mock_transport.dart';

/// Picks where answers come from: the files in assets/mock, or the server.
///
/// Calling the server with no address is a setup mistake. It fails here, with
/// a message that says what to do, instead of as a network error on every
/// screen.
ApiTransport createTransport({
  required bool useMock,
  required String baseUrl,
  required ApiClient Function() client,
}) {
  if (useMock) return MockTransport();
  if (baseUrl.trim().isEmpty) {
    throw StateError(
      'API_BASE_URL is not set. Run with --dart-define-from-file=env/staging.json '
      '(or env/prod.json), or use USE_MOCK=true.',
    );
  }
  return DioTransport(client());
}

/// `--dart-define=USE_MOCK=false` switches from the files in assets/mock to the
/// real server; nothing else changes. See the env/ folder.
final apiTransportProvider = Provider<ApiTransport>((ref) {
  return createTransport(
    useMock: AppConfig.useMock,
    baseUrl: ApiEndpoints.baseUrl,
    client: () => ref.watch(apiClientProvider),
  );
});

final overviewApiProvider = Provider<OverviewApi>(
  (ref) => OverviewApi(ref.watch(apiTransportProvider)),
);

final insightsApiProvider = Provider<InsightsApi>(
  (ref) => InsightsApi(ref.watch(apiTransportProvider)),
);

final intelligenceApiProvider = Provider<IntelligenceApi>(
  (ref) => IntelligenceApi(ref.watch(apiTransportProvider)),
);

final decisionsApiProvider = Provider<DecisionsApi>(
  (ref) => DecisionsApi(ref.watch(apiTransportProvider)),
);
