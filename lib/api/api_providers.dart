import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/config/app_config.dart';
import '../core/network/api_client.dart';
import 'repositories/decisions_api.dart';
import 'repositories/insights_api.dart';
import 'repositories/intelligence_api.dart';
import 'repositories/overview_api.dart';
import 'transport/api_transport.dart';
import 'transport/mock_transport.dart';

/// Where answers come from. `--dart-define=USE_MOCK=false` switches from the
/// files in assets/mock to the real server; nothing else changes.
final apiTransportProvider = Provider<ApiTransport>((ref) {
  if (AppConfig.useMock) return MockTransport();
  return DioTransport(ref.watch(apiClientProvider));
});

final overviewApiProvider =
    Provider<OverviewApi>((ref) => OverviewApi(ref.watch(apiTransportProvider)));

final insightsApiProvider =
    Provider<InsightsApi>((ref) => InsightsApi(ref.watch(apiTransportProvider)));

final intelligenceApiProvider =
    Provider<IntelligenceApi>((ref) => IntelligenceApi(ref.watch(apiTransportProvider)));

final decisionsApiProvider =
    Provider<DecisionsApi>((ref) => DecisionsApi(ref.watch(apiTransportProvider)));
