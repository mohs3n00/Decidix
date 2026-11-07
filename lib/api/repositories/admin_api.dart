import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';

final adminApiProvider = Provider<AdminApi>((ref) {
  final client = ref.watch(apiClientProvider);
  return AdminApi(client);
});

class AdminApi {
  const AdminApi(this._client);

  final ApiClient _client;

  static dynamic _unwrap(dynamic raw) {
    if (raw is Map) {
      if (raw.containsKey('data')) return raw['data'];
      return raw;
    }
    return raw;
  }

  /// Fetches platform KPI cards and high-level health summaries.
  Future<Map<String, dynamic>> getDashboard({String period = '30d'}) async {
    final response = await _client.get('/admin/dashboard', queryParameters: {'period': period});
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Fetches module usage distribution, trends, and top events.
  Future<Map<String, dynamic>> getAnalytics({String period = '30d'}) async {
    final response = await _client.get('/admin/analytics', queryParameters: {'period': period});
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Lists users with pagination, status filter, and keyword search.
  Future<({List<Map<String, dynamic>> users, int total, int page, int perPage})> getUsers({
    String? search,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final query = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    if (status != null && status.isNotEmpty && status != 'all') {
      query['status'] = status;
    }

    final response = await _client.get('/admin/users', queryParameters: query);
    final raw = response.data;
    List<Map<String, dynamic>> users = [];
    int total = 0;
    int curPage = page;
    int curLimit = limit;

    if (raw is Map) {
      final data = raw['data'];
      if (data is List) {
        users = data.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList();
      }
      final meta = raw['meta'];
      if (meta is Map) {
        total = meta['total'] as int? ?? users.length;
        curPage = meta['page'] as int? ?? page;
        curLimit = meta['per_page'] as int? ?? limit;
      } else {
        total = users.length;
      }
    }

    return (users: users, total: total, page: curPage, perPage: curLimit);
  }

  /// Fetches full metadata for a user without exposing private dataset contents.
  Future<Map<String, dynamic>> getUserDetails(String userId) async {
    final response = await _client.get('/admin/users/$userId');
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Suspends a user account and revokes all active sessions.
  Future<Map<String, dynamic>> suspendUser(String userId) async {
    final response = await _client.post('/admin/users/$userId/suspend');
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Reactivates a suspended user account.
  Future<Map<String, dynamic>> reactivateUser(String userId) async {
    final response = await _client.post('/admin/users/$userId/reactivate');
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Safely soft-deletes a user account.
  Future<Map<String, dynamic>> deleteUser(String userId) async {
    final response = await _client.delete('/admin/users/$userId');
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Fetches platform-wide dataset statistics and storage consumption.
  Future<Map<String, dynamic>> getDatasetStatistics() async {
    final response = await _client.get('/admin/datasets/statistics');
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Sends a push notification campaign to active users or test device.
  Future<Map<String, dynamic>> sendNotification({
    required String title,
    required String body,
    required String targetAudience,
    String? targetUserId,
    String? arabicTitle,
    String? arabicBody,
    Map<String, String>? data,
  }) async {
    final payload = <String, dynamic>{
      'title': title,
      'body': body,
      'target_audience': targetAudience,
      'target_user_id': ?targetUserId,
      if (arabicTitle != null && arabicTitle.isNotEmpty) 'arabic_title': arabicTitle,
      if (arabicBody != null && arabicBody.isNotEmpty) 'arabic_body': arabicBody,
      if (data != null && data.isNotEmpty) 'data': data,
    };

    final response = await _client.post('/admin/notifications/send', data: payload);
    final unwrapped = _unwrap(response.data);
    if (unwrapped is Map) return Map<String, dynamic>.from(unwrapped);
    return <String, dynamic>{};
  }

  /// Retrieves past notification campaigns.
  Future<({List<Map<String, dynamic>> campaigns, int total, int page, int perPage})> getNotificationHistory({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _client.get(
      '/admin/notifications/history',
      queryParameters: {'page': page, 'limit': limit},
    );
    final raw = response.data;
    List<Map<String, dynamic>> campaigns = [];
    int total = 0;
    int curPage = page;
    int curLimit = limit;

    if (raw is Map) {
      final data = raw['data'];
      if (data is List) {
        campaigns = data.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList();
      }
      final meta = raw['meta'];
      if (meta is Map) {
        total = meta['total'] as int? ?? campaigns.length;
        curPage = meta['page'] as int? ?? page;
        curLimit = meta['per_page'] as int? ?? limit;
      } else {
        total = campaigns.length;
      }
    }

    return (campaigns: campaigns, total: total, page: curPage, perPage: curLimit);
  }

  /// Privacy-preserving platform activity event tracking.
  Future<void> trackActivity({
    required String module,
    required String eventType,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _client.post(
        '/analytics/track',
        data: {
          'module': module,
          'event_type': eventType,
          'metadata': ?metadata,
        },
      );
    } catch (_) {
      // Analytics failures must never interrupt the primary user experience
    }
  }
}
