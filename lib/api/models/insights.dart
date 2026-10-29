import 'common.dart';
import 'json.dart';
import 'overview.dart';

class ChartBar {
  final String key;
  final LocalizedText label;
  final double value;

  const ChartBar({required this.key, required this.label, required this.value});

  factory ChartBar.fromJson(JsonMap json) => ChartBar(
        key: json.string('key'),
        label: LocalizedText.read(json, 'label'),
        value: json.number('value'),
      );
}

class Breakdown {
  final LocalizedText title;
  final MetricUnit unit;
  final List<ChartBar> bars;

  const Breakdown({required this.title, required this.unit, required this.bars});

  factory Breakdown.fromJson(JsonMap json) => Breakdown(
        title: LocalizedText.read(json, 'title'),
        unit: parseEnum(MetricUnit.values, json['unit'], MetricUnit.unknown),
        bars: json.listOf('bars', ChartBar.fromJson),
      );
}

/// A "Key indicators" row.
class Indicator {
  final String key;
  final LocalizedText label;

  /// 0 to 100 when [unit] is percent.
  final double value;
  final MetricUnit unit;

  const Indicator({
    required this.key,
    required this.label,
    required this.value,
    required this.unit,
  });

  factory Indicator.fromJson(JsonMap json) => Indicator(
        key: json.string('key'),
        label: LocalizedText.read(json, 'label'),
        value: json.number('value'),
        unit: parseEnum(MetricUnit.values, json['unit'], MetricUnit.unknown),
      );
}

class RankedRegion {
  final int rank;
  final String regionId;
  final LocalizedText name;
  final double score;

  const RankedRegion({
    required this.rank,
    required this.regionId,
    required this.name,
    required this.score,
  });

  factory RankedRegion.fromJson(JsonMap json) => RankedRegion(
        rank: json.integer('rank'),
        regionId: json.string('region_id'),
        name: LocalizedText.read(json, 'name'),
        score: json.number('score'),
      );
}

/// One shape for the Education, Healthcare, Economy and Infrastructure screens.
class SectorInsights {
  final Domain sector;
  final double indexScore;
  final double indexChange;
  final List<Metric> kpis;
  final List<TrendPoint> trend;
  final Breakdown breakdown;
  final List<Indicator> indicators;

  /// Best first.
  final List<RankedRegion> rankingTop;

  /// Worst first.
  final List<RankedRegion> rankingBottom;
  final LocalizedText aiInsight;

  const SectorInsights({
    required this.sector,
    required this.indexScore,
    required this.indexChange,
    required this.kpis,
    required this.trend,
    required this.breakdown,
    required this.indicators,
    required this.rankingTop,
    required this.rankingBottom,
    required this.aiInsight,
  });

  factory SectorInsights.fromJson(JsonMap json) {
    final index = json.object('index');
    final ranking = json.object('ranking');
    return SectorInsights(
      sector: parseDomain(json['sector']),
      indexScore: index.number('score'),
      indexChange: index.number('change'),
      kpis: json.listOf('kpis', Metric.fromJson),
      trend: TrendPoint.readList(json.object('trend'), 'points'),
      breakdown: Breakdown.fromJson(json.object('breakdown')),
      indicators: json.listOf('indicators', Indicator.fromJson),
      rankingTop: ranking.listOf('top', RankedRegion.fromJson),
      rankingBottom: ranking.listOf('bottom', RankedRegion.fromJson),
      aiInsight: LocalizedText.read(json.object('ai_insight'), 'text'),
    );
  }
}

class ComparedRegion {
  final String id;
  final LocalizedText name;
  final double score;

  const ComparedRegion({required this.id, required this.name, required this.score});

  factory ComparedRegion.fromJson(JsonMap json) => ComparedRegion(
        id: json.string('id'),
        name: LocalizedText.read(json, 'name'),
        score: json.number('score'),
      );
}

class ComparisonMetric {
  final String key;
  final LocalizedText label;
  final double scoreA;
  final double scoreB;

  const ComparisonMetric({
    required this.key,
    required this.label,
    required this.scoreA,
    required this.scoreB,
  });

  factory ComparisonMetric.fromJson(JsonMap json) => ComparisonMetric(
        key: json.string('key'),
        label: LocalizedText.read(json, 'label'),
        scoreA: json.number('score_a'),
        scoreB: json.number('score_b'),
      );
}

class RegionComparison {
  final ComparedRegion a;
  final ComparedRegion b;

  /// `overall` first, then the four domains.
  final List<ComparisonMetric> metrics;
  final LocalizedText gapAnalysis;

  const RegionComparison({
    required this.a,
    required this.b,
    required this.metrics,
    required this.gapAnalysis,
  });

  factory RegionComparison.fromJson(JsonMap json) => RegionComparison(
        a: ComparedRegion.fromJson(json.object('a')),
        b: ComparedRegion.fromJson(json.object('b')),
        metrics: json.listOf('metrics', ComparisonMetric.fromJson),
        gapAnalysis: LocalizedText.read(json.object('gap_analysis'), 'text'),
      );
}

class Milestone {
  final int year;
  final LocalizedText title;

  /// Index points; negative for a setback.
  final double impactValue;
  final LocalizedText impactLabel;

  const Milestone({
    required this.year,
    required this.title,
    required this.impactValue,
    required this.impactLabel,
  });

  factory Milestone.fromJson(JsonMap json) {
    final impact = json.object('impact');
    return Milestone(
      year: json.integer('year'),
      title: LocalizedText.read(json, 'title'),
      impactValue: impact.number('value'),
      impactLabel: LocalizedText.read(impact, 'label'),
    );
  }
}

class HistoricalData {
  final String sector;
  final double current;
  final double changeSinceStart;
  final int startYear;
  final List<TrendPoint> trend;
  final List<TrendPoint> annualChange;
  final List<Milestone> milestones;

  const HistoricalData({
    required this.sector,
    required this.current,
    required this.changeSinceStart,
    required this.startYear,
    required this.trend,
    required this.annualChange,
    required this.milestones,
  });

  factory HistoricalData.fromJson(JsonMap json) {
    final summary = json.object('summary');
    return HistoricalData(
      sector: json.string('sector'),
      current: summary.number('current'),
      changeSinceStart: summary.number('change_since_start'),
      startYear: summary.integer('start_year'),
      trend: TrendPoint.readList(json.object('trend'), 'points'),
      annualChange: TrendPoint.readList(json, 'annual_change'),
      milestones: json.listOf('milestones', Milestone.fromJson),
    );
  }
}

class PriorityEntry {
  final int rank;
  final String regionId;
  final LocalizedText name;
  final Priority priority;
  final double needScore;
  final DomainScore weakestDomain;

  const PriorityEntry({
    required this.rank,
    required this.regionId,
    required this.name,
    required this.priority,
    required this.needScore,
    required this.weakestDomain,
  });

  factory PriorityEntry.fromJson(JsonMap json) => PriorityEntry(
        rank: json.integer('rank'),
        regionId: json.string('region_id'),
        name: LocalizedText.read(json, 'name'),
        priority: parsePriority(json['priority']),
        needScore: json.number('need_score'),
        weakestDomain: DomainScore.fromJson(json.object('weakest_domain')),
      );
}

class PriorityOverview {
  final int high;
  final int medium;
  final int low;

  /// Highest need first.
  final List<PriorityEntry> queue;

  const PriorityOverview({
    required this.high,
    required this.medium,
    required this.low,
    required this.queue,
  });

  factory PriorityOverview.fromJson(JsonMap json) {
    final summary = json.object('summary');
    return PriorityOverview(
      high: summary.integer('high'),
      medium: summary.integer('medium'),
      low: summary.integer('low'),
      queue: json.listOf('queue', PriorityEntry.fromJson),
    );
  }
}

enum QualityBand { poor, fair, good, excellent, unknown }

enum SourceStatus { synced, overdue, unknown }

class CoverageEntry {
  final String regionId;
  final LocalizedText name;
  final double coverage;

  const CoverageEntry({
    required this.regionId,
    required this.name,
    required this.coverage,
  });

  factory CoverageEntry.fromJson(JsonMap json) => CoverageEntry(
        regionId: json.string('region_id'),
        name: LocalizedText.read(json, 'name'),
        coverage: json.number('coverage'),
      );
}

class DataSource {
  final String id;
  final LocalizedText name;
  final SourceStatus status;

  /// Days since the last sync.
  final int ageDays;

  const DataSource({
    required this.id,
    required this.name,
    required this.status,
    required this.ageDays,
  });

  factory DataSource.fromJson(JsonMap json) => DataSource(
        id: json.string('id'),
        name: LocalizedText.read(json, 'name'),
        status: parseEnum(SourceStatus.values, json['status'], SourceStatus.unknown),
        ageDays: json.integer('age_days'),
      );
}

class DataQuality {
  final double score;
  final QualityBand band;
  final double completeness;
  final double timeliness;
  final double accuracy;
  final List<CoverageEntry> lowestCoverage;
  final List<DataSource> sources;

  const DataQuality({
    required this.score,
    required this.band,
    required this.completeness,
    required this.timeliness,
    required this.accuracy,
    required this.lowestCoverage,
    required this.sources,
  });

  factory DataQuality.fromJson(JsonMap json) {
    final overall = json.object('overall');
    final dimensions = json.object('dimensions');
    return DataQuality(
      score: overall.number('score'),
      band: parseEnum(QualityBand.values, overall['band'], QualityBand.unknown),
      completeness: dimensions.number('completeness'),
      timeliness: dimensions.number('timeliness'),
      accuracy: dimensions.number('accuracy'),
      lowestCoverage: json.listOf('lowest_coverage_regions', CoverageEntry.fromJson),
      sources: json.listOf('sources', DataSource.fromJson),
    );
  }
}
