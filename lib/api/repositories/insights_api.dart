import '../../core/network/api_endpoints.dart';
import '../models/common.dart';
import '../models/insights.dart';
import '../models/json.dart';
import '../transport/api_transport.dart';

/// The eight Insights screens (contract section "Insights").
class InsightsApi {
  final ApiTransport _transport;

  const InsightsApi(this._transport);

  /// Education, healthcare, economy or infrastructure; they share one shape.
  Future<SectorInsights> getSector(Domain sector) async {
    assert(sector != Domain.unknown, 'Pick one of the four sectors');
    final response = await _transport.get(ApiEndpoints.sector(sector.name));
    return SectorInsights.fromJson(asMap(response.data, 'data'));
  }

  Future<RegionComparison> getComparison(String regionA, String regionB) async {
    final response = await _transport.get(
      ApiEndpoints.comparison,
      query: {'a': regionA, 'b': regionB},
    );
    return RegionComparison.fromJson(asMap(response.data, 'data'));
  }

  /// [sector] is `overall`, `education`, `healthcare` or `economy`.
  Future<HistoricalData> getHistorical({String sector = 'overall', String range = '7Y'}) async {
    final response = await _transport.get(
      ApiEndpoints.historical,
      query: {'sector': sector, 'range': range},
    );
    return HistoricalData.fromJson(asMap(response.data, 'data'));
  }

  Future<PriorityOverview> getPriority({int limit = 6}) async {
    final response = await _transport.get(ApiEndpoints.priority, query: {'limit': limit});
    return PriorityOverview.fromJson(asMap(response.data, 'data'));
  }

  Future<DataQuality> getDataQuality() async {
    final response = await _transport.get(ApiEndpoints.dataQuality);
    return DataQuality.fromJson(asMap(response.data, 'data'));
  }
}
