import 'common.dart';
import 'json.dart';

class ForecastPoint {
  final int year;
  final double value;
  final bool isForecast;

  /// Confidence band; null for past years.
  final double? lower;
  final double? upper;

  const ForecastPoint({
    required this.year,
    required this.value,
    required this.isForecast,
    this.lower,
    this.upper,
  });

  factory ForecastPoint.fromJson(JsonMap json) => ForecastPoint(
    year: json.integer('year'),
    value: json.number('value'),
    isForecast: json.string('kind') == 'forecast',
    lower: json.maybeNumber('lower'),
    upper: json.maybeNumber('upper'),
  );
}

class ModelScore {
  final String id;
  final LocalizedText name;
  final double r2;

  const ModelScore({required this.id, required this.name, required this.r2});

  factory ModelScore.fromJson(JsonMap json) => ModelScore(
    id: json.string('id'),
    name: LocalizedText.read(json, 'name'),
    r2: json.number('r2'),
  );
}

class RegionDelta {
  final String regionId;
  final LocalizedText name;

  /// Index points.
  final double delta;

  const RegionDelta({
    required this.regionId,
    required this.name,
    required this.delta,
  });

  factory RegionDelta.fromJson(JsonMap json) => RegionDelta(
    regionId: json.string('region_id'),
    name: LocalizedText.read(json, 'name'),
    delta: json.number('delta'),
  );
}

class Predictions {
  final int targetYear;
  final List<int> availableYears;
  final double projectedIndex;

  /// 0 to 100.
  final double confidence;
  final List<ForecastPoint> series;
  final List<ModelScore> models;
  final List<RegionDelta> topImprovers;

  const Predictions({
    required this.targetYear,
    required this.availableYears,
    required this.projectedIndex,
    required this.confidence,
    required this.series,
    required this.models,
    required this.topImprovers,
  });

  factory Predictions.fromJson(JsonMap json) {
    return Predictions(
      targetYear: json.integer('target_year'),
      availableYears: [
        for (final year in json.need<List<dynamic>>('available_years'))
          if (year is num) year.toInt(),
      ],
      projectedIndex: json.number('projected_index'),
      confidence: json.number('confidence'),
      series: json.listOf('series', ForecastPoint.fromJson),
      models: json.listOf('models', ModelScore.fromJson),
      topImprovers: json.listOf('top_improvers', RegionDelta.fromJson),
    );
  }
}

class ChatRow {
  final String regionId;
  final LocalizedText name;
  final double score;
  final double change;

  const ChatRow({
    required this.regionId,
    required this.name,
    required this.score,
    required this.change,
  });

  factory ChatRow.fromJson(JsonMap json) => ChatRow(
    regionId: json.string('region_id'),
    name: LocalizedText.read(json, 'name'),
    score: json.number('score'),
    change: json.number('change'),
  );
}

class ChatSource {
  final LocalizedText name;
  final String period;

  const ChatSource({required this.name, required this.period});

  factory ChatSource.fromJson(JsonMap json) => ChatSource(
    name: LocalizedText.read(json, 'name'),
    period: json.string('period'),
  );
}

/// The assistant's answer. [text] is already in the language the app asked for.
class ChatReply {
  final String conversationId;
  final String text;

  /// Null when the answer has no table.
  final List<ChatRow>? table;
  final List<ChatSource> sources;
  final List<String> suggestedPrompts;

  const ChatReply({
    required this.conversationId,
    required this.text,
    required this.table,
    required this.sources,
    required this.suggestedPrompts,
  });

  factory ChatReply.fromJson(JsonMap json) {
    final reply = json.object('reply');
    final prompts = json['suggested_prompts'];
    return ChatReply(
      conversationId: json.string('conversation_id'),
      text: reply.string('text'),
      table: reply['table'] == null
          ? null
          : reply.object('table').listOf('rows', ChatRow.fromJson),
      sources: reply.listOf('sources', ChatSource.fromJson),
      suggestedPrompts: [
        if (prompts is List)
          for (final p in prompts) '$p',
      ],
    );
  }
}

enum RecommendationStatus { suggested, inPlan, dismissed, unknown }

class Recommendation {
  final String id;
  final Priority priority;
  final RegionRef region;
  final Domain domain;
  final LocalizedText title;
  final LocalizedText summary;

  /// Index points.
  final double indexImpact;
  final Money estimatedCost;

  /// 0 to 100.
  final double confidence;
  final RecommendationStatus status;

  const Recommendation({
    required this.id,
    required this.priority,
    required this.region,
    required this.domain,
    required this.title,
    required this.summary,
    required this.indexImpact,
    required this.estimatedCost,
    required this.confidence,
    required this.status,
  });

  factory Recommendation.fromJson(JsonMap json) => Recommendation(
    id: json.string('id'),
    priority: parsePriority(json['priority']),
    region: RegionRef.fromJson(json.object('region')),
    domain: parseDomain(json['domain']),
    title: LocalizedText.read(json, 'title'),
    summary: LocalizedText.read(json, 'summary'),
    indexImpact: json.number('index_impact'),
    estimatedCost: Money.fromJson(json.object('estimated_cost')),
    confidence: json.number('confidence'),
    status: parseEnum(
      RecommendationStatus.values,
      json['status'],
      RecommendationStatus.unknown,
    ),
  );
}

/// Answer to "Add to plan" and "Dismiss".
class RecommendationResult {
  final String id;
  final RecommendationStatus status;

  const RecommendationResult({required this.id, required this.status});

  factory RecommendationResult.fromJson(JsonMap json) => RecommendationResult(
    id: json.string('id'),
    status: parseEnum(
      RecommendationStatus.values,
      json['status'],
      RecommendationStatus.unknown,
    ),
  );
}
