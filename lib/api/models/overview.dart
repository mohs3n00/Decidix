import 'common.dart';
import 'json.dart';

enum IndexBand { low, moderateLow, moderate, moderateHigh, high, unknown }

class OverviewIndex {
  final double score;
  final double maxScore;

  /// Index points against [comparedWith].
  final double change;
  final String comparedWith;
  final IndexBand band;
  final int regionsCount;
  final int population;
  final int atRiskCount;

  const OverviewIndex({
    required this.score,
    required this.maxScore,
    required this.change,
    required this.comparedWith,
    required this.band,
    required this.regionsCount,
    required this.population,
    required this.atRiskCount,
  });

  factory OverviewIndex.fromJson(JsonMap json) => OverviewIndex(
        score: json.number('score'),
        maxScore: json.number('max_score'),
        change: json.number('change'),
        comparedWith: json.string('compared_with'),
        band: parseEnum(IndexBand.values, json['band'], IndexBand.unknown),
        regionsCount: json.integer('regions_count'),
        population: json.integer('population'),
        atRiskCount: json.integer('at_risk_count'),
      );
}

/// A region in a list (Regions screen, "Needs attention").
class RegionListItem {
  final String id;
  final LocalizedText name;

  /// Null in "Needs attention", where the list is not ranked.
  final int? rank;
  final double score;

  /// Index points.
  final double change;
  final Priority priority;
  final int population;

  const RegionListItem({
    required this.id,
    required this.name,
    required this.rank,
    required this.score,
    required this.change,
    required this.priority,
    required this.population,
  });

  factory RegionListItem.fromJson(JsonMap json) => RegionListItem(
        id: json.string('id'),
        name: LocalizedText.read(json, 'name'),
        rank: json.maybeInteger('rank'),
        score: json.number('score'),
        change: json.number('change'),
        priority: parsePriority(json['priority']),
        population: json.integer('population'),
      );
}

class OverviewData {
  final String asOf;
  final OverviewIndex index;
  final List<Metric> kpis;
  final String trendRange;
  final List<TrendPoint> trend;
  final List<RegionListItem> needsAttention;
  final LocalizedText aiInsight;

  const OverviewData({
    required this.asOf,
    required this.index,
    required this.kpis,
    required this.trendRange,
    required this.trend,
    required this.needsAttention,
    required this.aiInsight,
  });

  factory OverviewData.fromJson(JsonMap json) {
    final trend = json.object('trend');
    return OverviewData(
      asOf: json.string('as_of'),
      index: OverviewIndex.fromJson(json.object('index')),
      kpis: json.listOf('kpis', Metric.fromJson),
      trendRange: trend.string('range'),
      trend: TrendPoint.readList(trend, 'points'),
      needsAttention: json.listOf('needs_attention', RegionListItem.fromJson),
      aiInsight: LocalizedText.read(json.object('ai_insight'), 'text'),
    );
  }
}

class MapPoint {
  final String id;
  final LocalizedText name;
  final double score;
  final Priority priority;
  final int population;
  final double latitude;
  final double longitude;

  const MapPoint({
    required this.id,
    required this.name,
    required this.score,
    required this.priority,
    required this.population,
    required this.latitude,
    required this.longitude,
  });

  factory MapPoint.fromJson(JsonMap json) => MapPoint(
        id: json.string('id'),
        name: LocalizedText.read(json, 'name'),
        score: json.number('score'),
        priority: parsePriority(json['priority']),
        population: json.integer('population'),
        latitude: json.number('latitude'),
        longitude: json.number('longitude'),
      );
}

class DomainScore {
  final Domain key;
  final LocalizedText label;
  final double score;

  const DomainScore({required this.key, required this.label, required this.score});

  factory DomainScore.fromJson(JsonMap json) => DomainScore(
        key: parseDomain(json['key']),
        label: LocalizedText.read(json, 'label'),
        score: json.number('score'),
      );
}

class RegionProfile {
  final String id;
  final LocalizedText name;
  final int rank;
  final int rankTotal;
  final double score;
  final double change;
  final Priority priority;
  final int population;
  final double areaKm2;
  final List<DomainScore> domains;
  final List<TrendPoint> historyRegion;
  final List<TrendPoint> historyNational;
  final LocalizedText aiInsight;
  final double dataQualityScore;
  final DateTime dataQualityUpdatedAt;

  const RegionProfile({
    required this.id,
    required this.name,
    required this.rank,
    required this.rankTotal,
    required this.score,
    required this.change,
    required this.priority,
    required this.population,
    required this.areaKm2,
    required this.domains,
    required this.historyRegion,
    required this.historyNational,
    required this.aiInsight,
    required this.dataQualityScore,
    required this.dataQualityUpdatedAt,
  });

  factory RegionProfile.fromJson(JsonMap json) {
    final history = json.object('history');
    final quality = json.object('data_quality');
    return RegionProfile(
      id: json.string('id'),
      name: LocalizedText.read(json, 'name'),
      rank: json.integer('rank'),
      rankTotal: json.integer('rank_total'),
      score: json.number('score'),
      change: json.number('change'),
      priority: parsePriority(json['priority']),
      population: json.integer('population'),
      areaKm2: json.number('area_km2'),
      domains: json.listOf('domains', DomainScore.fromJson),
      historyRegion: TrendPoint.readList(history, 'region'),
      historyNational: TrendPoint.readList(history, 'national'),
      aiInsight: LocalizedText.read(json.object('ai_insight'), 'text'),
      dataQualityScore: quality.number('score'),
      dataQualityUpdatedAt: DateTime.parse(quality.string('updated_at')),
    );
  }
}
