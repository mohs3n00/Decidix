import 'package:dio/dio.dart';
import '../../core/network/api_endpoints.dart';
import '../models/common.dart';
import '../models/intelligence.dart';
import '../models/json.dart';
import '../transport/api_transport.dart';

/// Predictions, assistant and recommendations (contract section "Intelligence").
class IntelligenceApi {
  final ApiTransport _transport;

  const IntelligenceApi(this._transport);

  Future<Predictions> getPredictions({int? targetYear}) async {
    final response = await _transport.get(
      ApiEndpoints.predictions,
      query: {'target_year': ?targetYear},
    );
    return Predictions.fromJson(asMap(response.data, 'data'));
  }

  /// [language] is `en` or `ar`: the reply is written in it.
  /// Pass the [conversationId] of the previous reply to continue a conversation.
  Future<ChatReply> sendMessage({
    required String message,
    required String language,
    String? conversationId,
  }) async {
    final response = await _transport.post(
      ApiEndpoints.assistantChat,
      body: {
        'message': message,
        'language': language,
        'conversation_id': conversationId,
      },
    );
    return ChatReply.fromJson(asMap(response.data, 'data'));
  }

  /// Suggestions the user has not planned or dismissed yet.
  Future<List<Recommendation>> getRecommendations({Priority? priority}) async {
    final response = await _transport.get(
      ApiEndpoints.recommendations,
      query: {if (priority != null) 'priority': priority.name},
    );
    return [
      for (final item in asMapList(response.data, 'data')) Recommendation.fromJson(item),
    ];
  }

  Future<RecommendationResult> acceptRecommendation(String id, {CancelToken? cancelToken}) =>
      _answer(ApiEndpoints.recommendationAccept(id), cancelToken);

  Future<RecommendationResult> dismissRecommendation(String id, {CancelToken? cancelToken}) =>
      _answer(ApiEndpoints.recommendationDismiss(id), cancelToken);

  Future<RecommendationResult> _answer(String path, CancelToken? cancelToken) async {
    final response = await _transport.post(path, cancelToken: cancelToken);
    return RecommendationResult.fromJson(asMap(response.data, 'data'));
  }
}
