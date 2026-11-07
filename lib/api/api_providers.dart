import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../core/network/api_client.dart';
import '../core/network/api_endpoints.dart';
import 'repositories/decisions_api.dart';
import 'repositories/datasets_api.dart';
import 'repositories/insights_api.dart';
import 'repositories/intelligence_api.dart';
import 'repositories/notifications_api.dart';
import 'repositories/overview_api.dart';
import 'transport/api_transport.dart';
import 'transport/mock_transport.dart';

/// Picks where answers come from: the files in assets/mock, or the server.
///
/// The configuration is validated first, so a release build with a missing,
/// plain-HTTP, or development address fails immediately with a message that
/// says what to change instead of showing mock data or failing per screen.
ApiTransport createTransport({
  required bool useMock,
  required String baseUrl,
  required ApiClient Function() client,
  bool isRelease = kReleaseMode,
}) {
  AppConfig.validateApiConfiguration(
    useMock: useMock,
    baseUrl: baseUrl,
    isRelease: isRelease,
  );
  if (useMock) return MockTransport();
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

final notificationsApiProvider = Provider<NotificationsApi>(
  (ref) => NotificationsApi(ref.watch(apiTransportProvider)),
);

final datasetsApiProvider = Provider<DatasetsApi>(
  (ref) => DatasetsApi(ref.watch(apiClientProvider)),
);
