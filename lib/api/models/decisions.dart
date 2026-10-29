import 'common.dart';
import 'json.dart';

/// What the user sends to the simulator: money per domain, in whole USD.
class SimulationRequest {
  final String regionId;
  final Map<Domain, double> allocations;

  const SimulationRequest({required this.regionId, required this.allocations});

  Map<String, dynamic> toJson() => {
    'region_id': regionId,
    'allocations': {
      for (final entry in allocations.entries) wireName(entry.key): entry.value,
    },
  };
}

class SimulationLever {
  final Domain domain;
  final double amount;

  /// Index points this lever adds.
  final double gain;
  final double yieldPerMillion;

  const SimulationLever({
    required this.domain,
    required this.amount,
    required this.gain,
    required this.yieldPerMillion,
  });

  factory SimulationLever.fromJson(JsonMap json) => SimulationLever(
    domain: parseDomain(json['domain']),
    amount: json.number('amount'),
    gain: json.number('gain'),
    yieldPerMillion: json.number('yield_per_million'),
  );
}

class SimulationResult {
  final String regionId;
  final int horizonMonths;
  final double todayScore;
  final double projectedScore;
  final double gain;
  final Money totalPackage;
  final List<SimulationLever> levers;
  final Domain bestLever;
  final double bestYieldPerMillion;
  final LocalizedText note;

  const SimulationResult({
    required this.regionId,
    required this.horizonMonths,
    required this.todayScore,
    required this.projectedScore,
    required this.gain,
    required this.totalPackage,
    required this.levers,
    required this.bestLever,
    required this.bestYieldPerMillion,
    required this.note,
  });

  factory SimulationResult.fromJson(JsonMap json) {
    final best = json.object('best_lever');
    return SimulationResult(
      regionId: json.string('region_id'),
      horizonMonths: json.integer('horizon_months'),
      todayScore: json.number('today_score'),
      projectedScore: json.number('projected_score'),
      gain: json.number('gain'),
      totalPackage: Money.fromJson(json.object('total_package')),
      levers: json.listOf('levers', SimulationLever.fromJson),
      bestLever: parseDomain(best['domain']),
      bestYieldPerMillion: best.number('yield_per_million'),
      note: LocalizedText.read(json.object('note'), 'text'),
    );
  }
}

enum ProjectStatus { planned, inProgress, delayed, completed, unknown }

class Project {
  final String id;
  final LocalizedText title;
  final RegionRef region;
  final ProjectStatus status;

  /// 0 to 100.
  final double progress;
  final Money budget;

  /// Null for a completed project.
  final DateTime? dueDate;

  /// Null until the project is completed.
  final DateTime? completedAt;

  const Project({
    required this.id,
    required this.title,
    required this.region,
    required this.status,
    required this.progress,
    required this.budget,
    required this.dueDate,
    required this.completedAt,
  });

  factory Project.fromJson(JsonMap json) => Project(
    id: json.string('id'),
    title: LocalizedText.read(json, 'title'),
    region: RegionRef.fromJson(json.object('region')),
    status: parseEnum(
      ProjectStatus.values,
      json['status'],
      ProjectStatus.unknown,
    ),
    progress: json.number('progress'),
    budget: Money.fromJson(json.object('budget')),
    dueDate: _date(json.maybeString('due_date')),
    completedAt: _date(json.maybeString('completed_at')),
  );
}

DateTime? _date(String? raw) => raw == null ? null : DateTime.parse(raw);

class ProjectsData {
  final int projectsCount;
  final Money totalBudget;
  final int delayedCount;
  final List<Project> items;
  final PageMeta meta;

  const ProjectsData({
    required this.projectsCount,
    required this.totalBudget,
    required this.delayedCount,
    required this.items,
    required this.meta,
  });

  /// The same totals with a later page of projects added at the end.
  ProjectsData withMore(List<Project> more, PageMeta newMeta) => ProjectsData(
    projectsCount: projectsCount,
    totalBudget: totalBudget,
    delayedCount: delayedCount,
    items: [...items, ...more],
    meta: newMeta,
  );

  factory ProjectsData.fromJson(JsonMap json, JsonMap? meta) {
    final summary = json.object('summary');
    final items = json.listOf('items', Project.fromJson);
    return ProjectsData(
      projectsCount: summary.integer('projects_count'),
      totalBudget: Money.fromJson(summary.object('total_budget')),
      delayedCount: summary.integer('delayed_count'),
      items: items,
      meta: PageMeta.read(meta, itemCount: items.length),
    );
  }
}

enum ReportCategory { roads, health, schools, water, unknown }

enum ReportStatus { underReview, escalated, resolved, unknown }

class CitizenReport {
  final String id;
  final ReportCategory category;
  final LocalizedText title;
  final RegionRef region;
  final DateTime createdAt;
  final int likes;
  final bool likedByMe;
  final Priority priority;
  final ReportStatus status;

  const CitizenReport({
    required this.id,
    required this.category,
    required this.title,
    required this.region,
    required this.createdAt,
    required this.likes,
    required this.likedByMe,
    required this.priority,
    required this.status,
  });

  CitizenReport copyWith({int? likes, bool? likedByMe}) => CitizenReport(
    id: id,
    category: category,
    title: title,
    region: region,
    createdAt: createdAt,
    likes: likes ?? this.likes,
    likedByMe: likedByMe ?? this.likedByMe,
    priority: priority,
    status: status,
  );

  factory CitizenReport.fromJson(JsonMap json) => CitizenReport(
    id: json.string('id'),
    category: parseEnum(
      ReportCategory.values,
      json['category'],
      ReportCategory.unknown,
    ),
    title: LocalizedText.read(json, 'title'),
    region: RegionRef.fromJson(json.object('region')),
    createdAt: DateTime.parse(json.string('created_at')),
    likes: json.integer('likes'),
    likedByMe: json.flag('liked_by_me'),
    priority: parsePriority(json['priority']),
    status: parseEnum(
      ReportStatus.values,
      json['status'],
      ReportStatus.unknown,
    ),
  );
}

/// A headline number with its change ("Open this week", "Resolved rate").
class ReportStat {
  final double value;
  final double change;
  final bool higherIsBetter;

  const ReportStat({
    required this.value,
    required this.change,
    required this.higherIsBetter,
  });

  factory ReportStat.fromJson(JsonMap json) => ReportStat(
    value: json.number('value'),
    change: json.number('change'),
    higherIsBetter: json.flag('higher_is_better'),
  );
}

class ReportsData {
  final ReportStat openThisWeek;
  final ReportStat resolvedRate;
  final List<CitizenReport> items;
  final PageMeta meta;

  const ReportsData({
    required this.openThisWeek,
    required this.resolvedRate,
    required this.items,
    required this.meta,
  });

  ReportsData withItems(List<CitizenReport> items, {PageMeta? newMeta}) =>
      ReportsData(
        openThisWeek: openThisWeek,
        resolvedRate: resolvedRate,
        items: items,
        meta: newMeta ?? meta,
      );

  factory ReportsData.fromJson(JsonMap json, JsonMap? meta) {
    final summary = json.object('summary');
    final items = json.listOf('items', CitizenReport.fromJson);
    return ReportsData(
      openThisWeek: ReportStat.fromJson(summary.object('open_this_week')),
      resolvedRate: ReportStat.fromJson(summary.object('resolved_rate')),
      items: items,
      meta: PageMeta.read(meta, itemCount: items.length),
    );
  }
}

class LikeResult {
  final String id;
  final int likes;
  final bool likedByMe;

  const LikeResult({
    required this.id,
    required this.likes,
    required this.likedByMe,
  });

  factory LikeResult.fromJson(JsonMap json) => LikeResult(
    id: json.string('id'),
    likes: json.integer('likes'),
    likedByMe: json.flag('liked_by_me'),
  );
}
