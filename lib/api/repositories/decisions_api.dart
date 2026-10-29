import 'package:dio/dio.dart';
import '../../core/network/api_endpoints.dart';
import '../models/decisions.dart';
import '../models/json.dart';
import '../transport/api_transport.dart';

/// Simulator, projects and citizen reports (contract section "Decisions").
class DecisionsApi {
  final ApiTransport _transport;

  const DecisionsApi(this._transport);

  /// Pass a [cancelToken] and cancel it when a newer slider value replaces this
  /// request; the call then throws `RequestCancelledException`.
  Future<SimulationResult> simulate(
    SimulationRequest request, {
    CancelToken? cancelToken,
  }) async {
    final response = await _transport.post(
      ApiEndpoints.simulate,
      body: request.toJson(),
      cancelToken: cancelToken,
    );
    return SimulationResult.fromJson(asMap(response.data, 'data'));
  }

  /// A null [status] means all projects.
  Future<ProjectsData> getProjects({
    ProjectStatus? status,
    int page = 1,
    int perPage = 20,
  }) async {
    final response = await _transport.get(
      ApiEndpoints.projects,
      query: {
        if (status != null) 'status': wireName(status),
        'page': page,
        'per_page': perPage,
      },
    );
    return ProjectsData.fromJson(asMap(response.data, 'data'), response.meta);
  }

  Future<ReportsData> getCitizenReports({
    ReportCategory? category,
    ReportStatus? status,
    int page = 1,
    int perPage = 20,
  }) async {
    final response = await _transport.get(
      ApiEndpoints.citizenReports,
      query: {
        if (category != null) 'category': wireName(category),
        if (status != null) 'status': wireName(status),
        'page': page,
        'per_page': perPage,
      },
    );
    return ReportsData.fromJson(asMap(response.data, 'data'), response.meta);
  }

  /// Likes the report, or removes the like if it is already liked.
  Future<LikeResult> toggleLike(String reportId) async {
    final response = await _transport.post(ApiEndpoints.citizenReportLike(reportId));
    return LikeResult.fromJson(asMap(response.data, 'data'));
  }
}
