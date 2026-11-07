import '../../core/network/api_client.dart';

/// Authenticated dataset-upload lifecycle and dataset management API.
class DatasetsApi {
  const DatasetsApi(this._client);

  final ApiClient _client;

  static Map<String, dynamic> _unwrap(dynamic raw) {
    if (raw is Map) {
      final inner = raw['data'];
      if (inner is Map) return Map<String, dynamic>.from(inner);
      return Map<String, dynamic>.from(raw);
    }
    return <String, dynamic>{};
  }

  Future<Map<String, dynamic>> initiate(Map<String, dynamic> body) async {
    final response = await _client.post('/datasets/uploads/initiate', data: body);
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> complete(String id, Map<String, dynamic> body) async {
    final response = await _client.post('/datasets/$id/complete', data: body);
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> validate(String id) async {
    final response = await _client.post('/datasets/$id/validate');
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> ingest(String id) async {
    final response = await _client.post('/datasets/$id/ingest');
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> activate(String id) async {
    final response = await _client.post('/datasets/$id/activate');
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> getStats() async {
    final response = await _client.get('/datasets/stats');
    return _unwrap(response.data);
  }

  Future<List<Map<String, dynamic>>> list({String? search, String? status}) async {
    final query = <String, dynamic>{};
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (status != null && status.isNotEmpty) query['status'] = status;
    final response = await _client.get('/datasets', queryParameters: query);
    final raw = response.data;
    final list = (raw is Map ? raw['data'] : raw) as List?;
    if (list == null) return [];
    return list.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  Future<Map<String, dynamic>> getById(String id) async {
    final response = await _client.get('/datasets/$id');
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> retry(String id) async {
    final response = await _client.post('/datasets/$id/retry');
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> delete(String id) async {
    final response = await _client.delete('/datasets/$id');
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>> uploadDirect(Map<String, dynamic> body) async {
    final response = await _client.post('/datasets/upload-direct', data: body);
    return _unwrap(response.data);
  }
}
