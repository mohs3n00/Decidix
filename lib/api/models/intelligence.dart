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
  final double? r2;

  const ModelScore({required this.id, required this.name, required this.r2});

  factory ModelScore.fromJson(JsonMap json) => ModelScore(
    id: json.string('id'),
    name: LocalizedText.read(json, 'name'),
    r2: json.maybeNumber('r2'),
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

/// How a predictions response was produced. Every Decidix forecast is a
/// simulated scenario, never an official government projection.
class ForecastClassification {
  final String source;
  final bool isSimulated;
  final bool isOfficial;
  final bool isCalibrated;
  final String validationStatus;
  final LocalizedText disclaimer;

  const ForecastClassification({
    required this.source,
    required this.isSimulated,
    required this.isOfficial,
    required this.isCalibrated,
    required this.validationStatus,
    required this.disclaimer,
  });

  /// Used when a server omits the block. Decidix forecasts are simulations, so
  /// the app assumes the conservative case rather than implying official status.
  static const simulated = ForecastClassification(
    source: 'simulated_scenario',
    isSimulated: true,
    isOfficial: false,
    isCalibrated: false,
    validationStatus: 'simulated',
    disclaimer: LocalizedText(
      'Simulated forecast: these values are modelled scenarios built on stated assumptions. They are not official government projections and have not been empirically validated.',
      'توقع محاكاة: هذه القيم سيناريوهات مبنية على افتراضات معلنة. وهي ليست توقعات حكومية رسمية ولم يتم التحقق منها تجريبياً.',
    ),
  );

  factory ForecastClassification.fromJson(JsonMap json) {
    final disclaimerEn = json.maybeString('disclaimer_en');
    final disclaimerAr = json.maybeString('disclaimer_ar');
    return ForecastClassification(
      source: json.maybeString('source') ?? simulated.source,
      isSimulated: json['is_simulated'] == null
          ? true
          : json.flag('is_simulated'),
      isOfficial: json['is_official'] == null
          ? false
          : json.flag('is_official'),
      isCalibrated: json['is_calibrated'] == null
          ? false
          : json.flag('is_calibrated'),
      validationStatus: json.maybeString('validation_status') ?? 'simulated',
      disclaimer: disclaimerEn == null
          ? simulated.disclaimer
          : LocalizedText(disclaimerEn, disclaimerAr),
    );
  }
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

  /// Provenance and the disclaimer the UI must show.
  final ForecastClassification classification;

  const Predictions({
    required this.targetYear,
    required this.availableYears,
    required this.projectedIndex,
    required this.confidence,
    required this.series,
    required this.models,
    required this.topImprovers,
    this.classification = ForecastClassification.simulated,
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
      classification: json['forecast_classification'] == null
          ? ForecastClassification.simulated
          : ForecastClassification.fromJson(
              json.object('forecast_classification'),
            ),
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

/// Where an assistant answer came from, as reported by the backend.
///
/// [deterministicFallback] means the free model was unavailable (quota, timeout,
/// outage) and the text was extracted from verified records locally. The UI must
/// say so rather than passing it off as a model answer.
enum AnswerSource { model, deterministicFallback, refusal, unknown }

AnswerSource parseAnswerSource(String? raw) {
  switch (raw) {
    case 'model':
      return AnswerSource.model;
    case 'deterministic_fallback':
      return AnswerSource.deterministicFallback;
    case 'refusal':
      return AnswerSource.refusal;
    default:
      return AnswerSource.unknown;
  }
}

/// The assistant's answer. [text] is already in the language the app asked for.
class ChatReply {
  final String conversationId;
  final String text;

  /// Null when the answer has no table.
  final List<ChatRow>? table;
  final List<ChatSource> sources;
  final List<String> suggestedPrompts;

  /// Model answer, deterministic fallback, or refusal.
  final AnswerSource answerSource;

  /// Provider reason for a fallback (`rate_limited`, `timeout`, ...); null when
  /// the model answered. Never shown verbatim to the user.
  final String? providerStatus;

  const ChatReply({
    required this.conversationId,
    required this.text,
    required this.table,
    required this.sources,
    required this.suggestedPrompts,
    this.answerSource = AnswerSource.unknown,
    this.providerStatus,
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
      answerSource: parseAnswerSource(json.maybeString('answer_source')),
      providerStatus: json.maybeString('provider_status'),
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
  final DatasetProvenance? provenance;

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
    this.provenance,
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
    provenance: json['provenance'] is Map
        ? DatasetProvenance.fromJson(json.object('provenance'))
        : null,
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
