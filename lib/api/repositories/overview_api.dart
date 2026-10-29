import '../../core/network/api_endpoints.dart';
import '../models/common.dart';
import '../models/json.dart';
import '../models/overview.dart';
import '../transport/api_transport.dart';

/// Dashboard, map and regions (contract section "Overview").
class OverviewApi {
  final ApiTransport _transport;

  const OverviewApi(this._transport);

  /// [range] is `3Y`, `5Y` or `7Y`.
  Future<OverviewData> getOverview({String range = '7Y'}) async {
    final response = await _transport.get(ApiEndpoints.overview, query: {'range': range});
    return OverviewData.fromJson(asMap(response.data, 'data'));
  }

  Future<List<MapPoint>> getMapPoints({String sector = 'overall'}) async {
    final response = await _transport.get(ApiEndpoints.mapPoints, query: {'sector': sector});
    return [for (final item in asMapList(response.data, 'data')) MapPoint.fromJson(item)];
  }

  /// [query] searches names in both languages. A null [priority] means all.
  Future<Paged<RegionListItem>> getRegions({
    String? query,
    Priority? priority,
    int page = 1,
    int perPage = 20,
  }) async {
    final response = await _transport.get(
      ApiEndpoints.regions,
      query: {
        if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
        if (priority != null) 'priority': priority.name,
        'page': page,
        'per_page': perPage,
      },
    );
    final items = [
      for (final item in asMapList(response.data, 'data')) RegionListItem.fromJson(item),
    ];
    return Paged(items, PageMeta.read(response.meta, itemCount: items.length));
  }

  Future<RegionProfile> getRegion(String id) async {
    final response = await _transport.get(ApiEndpoints.regionDetail(id));
    return RegionProfile.fromJson(asMap(response.data, 'data'));
  }
}
