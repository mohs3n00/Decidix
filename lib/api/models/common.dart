import 'dart:ui';
import 'json.dart';

/// Text that the server sends in both languages (`name` and `arabic_name`).
class LocalizedText {
  final String en;
  final String ar;

  /// [ar] falls back to [en] when the server did not send a translation.
  const LocalizedText(this.en, [String? ar]) : ar = ar ?? en;

  factory LocalizedText.read(JsonMap json, String key) =>
      LocalizedText(json.string(key), json.maybeString('arabic_$key'));

  String resolve(Locale locale) => locale.languageCode == 'ar' ? ar : en;
}

class Money {
  final double amount;
  final String currency;

  const Money(this.amount, this.currency);

  factory Money.fromJson(JsonMap json) =>
      Money(json.number('amount'), json.string('currency'));
}

class TrendPoint {
  final int year;
  final double value;

  const TrendPoint(this.year, this.value);

  factory TrendPoint.fromJson(JsonMap json) =>
      TrendPoint(json.integer('year'), json.number('value'));

  static List<TrendPoint> readList(JsonMap json, String key) =>
      json.listOf(key, TrendPoint.fromJson);
}

class PageMeta {
  final int page;
  final int perPage;
  final int total;

  const PageMeta({required this.page, required this.perPage, required this.total});

  /// [meta] is null when the server did not paginate; then everything is one page.
  factory PageMeta.read(JsonMap? meta, {required int itemCount}) {
    if (meta == null) return PageMeta(page: 1, perPage: itemCount, total: itemCount);
    return PageMeta(
      page: meta.integer('page'),
      perPage: meta.integer('per_page'),
      total: meta.integer('total'),
    );
  }

  bool get hasMore => page * perPage < total;
}

class Paged<T> {
  final List<T> items;
  final PageMeta meta;

  const Paged(this.items, this.meta);
}

/// How urgently a region needs help. A well developed region is `low`.
enum Priority { critical, high, medium, low }

Priority parsePriority(Object? raw) => parseEnum(Priority.values, raw, Priority.medium);

enum Domain { education, healthcare, economy, infrastructure, unknown }

Domain parseDomain(Object? raw) => parseEnum(Domain.values, raw, Domain.unknown);

enum MetricUnit {
  score100,
  percent,
  years,
  perMille,
  perThousand,
  pupilsPerTeacher,
  usd,
  unknown,
}

/// A KPI card or a sector figure.
class Metric {
  final String key;
  final LocalizedText label;
  final double value;
  final MetricUnit unit;

  /// Percent change against the previous period.
  final double change;
  final bool higherIsBetter;
  final List<double> sparkline;

  const Metric({
    required this.key,
    required this.label,
    required this.value,
    required this.unit,
    required this.change,
    required this.higherIsBetter,
    this.sparkline = const [],
  });

  factory Metric.fromJson(JsonMap json) => Metric(
        key: json.string('key'),
        label: LocalizedText.read(json, 'label'),
        value: json.number('value'),
        unit: parseEnum(MetricUnit.values, json['unit'], MetricUnit.unknown),
        change: json.number('change'),
        higherIsBetter: json.flag('higher_is_better'),
        sparkline: json.numberList('sparkline'),
      );

  /// True when the change is good news (colours the delta green).
  bool get isImprovement => change == 0 || (change > 0) == higherIsBetter;
}

/// A region named inside another resource (a project, a recommendation).
class RegionRef {
  final String id;
  final LocalizedText name;

  const RegionRef(this.id, this.name);

  factory RegionRef.fromJson(JsonMap json) =>
      RegionRef(json.string('region_id'), LocalizedText.read(json, 'name'));
}
