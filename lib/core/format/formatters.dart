import 'package:flutter/widgets.dart';

import '../../api/models/common.dart';
import '../../api/models/insights.dart';
import '../../api/models/json.dart';
import '../../api/models/overview.dart';
import '../constants/app_assets.dart';
import '../localization/app_localizations.dart';

/// A KPI value split into the big number and the small unit next to it.
class KpiText {
  final String value;
  final String unit;

  const KpiText(this.value, this.unit);
}

extension FormatContext on BuildContext {
  Fmt get fmt => Fmt(AppLocalizations.of(this));
}

/// Turns the raw numbers and dates of the API into the text on screen.
///
/// The API sends plain numbers (`18000000`, `"2026-03-31"`); every screen
/// formats them here, so "$18M" looks the same everywhere and follows the
/// language. Digits stay Western in both languages, as in the Figma file.
class Fmt {
  final AppLocalizations _l10n;

  const Fmt(this._l10n);

  bool get isArabic => _l10n.locale.languageCode == 'ar';

  /// Translated text; each `{name}` is replaced by its value in [args].
  String tr(String key, [Map<String, Object> args = const {}]) {
    var text = _l10n.tr(key);
    args.forEach((name, value) => text = text.replaceAll('{$name}', '$value'));
    return text;
  }

  /// `1820` becomes `1,820`; `74.20` becomes `74.2`; `6.0` becomes `6`.
  String number(num value, {int decimals = 1}) {
    final fixed = value.abs().toStringAsFixed(decimals);
    final parts = fixed.split('.');
    final grouped = parts[0].replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => ',',
    );
    final fraction = parts.length > 1
        ? parts[1].replaceFirst(RegExp(r'0+$'), '')
        : '';
    final sign = value < 0 ? '-' : '';
    return fraction.isEmpty ? '$sign$grouped' : '$sign$grouped.$fraction';
  }

  /// `9200000` becomes `9.2M`; `1200` becomes `1.2K`.
  String compact(num value) {
    final abs = value.abs();
    if (abs >= 1e9) return '${number(value / 1e9)}${tr('fmt_billion')}';
    if (abs >= 1e6) return '${number(value / 1e6)}${tr('fmt_million')}';
    if (abs >= 1e3) return '${number(value / 1e3)}${tr('fmt_thousand')}';
    return number(value, decimals: 0);
  }

  String people(num count) => tr('fmt_people', {'n': compact(count)});

  String residents(num count) => tr('fmt_residents', {'n': compact(count)});

  /// `18000000 USD` becomes `$18M`.
  String money(Money money) {
    final amount = compact(money.amount);
    if (money.currency == 'USD') return isArabic ? '$amount \$' : '\$$amount';
    return '$amount ${money.currency}';
  }

  /// `94` becomes `94%`.
  String percent(num value, {int decimals = 0}) =>
      '${number(value, decimals: decimals)}%';

  /// A change without its sign: the arrow and the colour show the direction.
  String percentChange(num change) => '${number(change.abs())}%';

  String points(num change) => number(change.abs());

  /// With a sign: `+2.3`, `-0.8`.
  String signed(num change, {String suffix = ''}) {
    final sign = change > 0 ? '+' : (change < 0 ? '-' : '');
    return '$sign${number(change.abs())}$suffix';
  }

  /// The big number and the unit of a KPI card.
  KpiText metric(Metric metric) {
    final value = metric.value;
    switch (metric.unit) {
      case MetricUnit.percent:
        return KpiText(number(value), '%');
      case MetricUnit.score100:
        return KpiText(number(value), '/100');
      case MetricUnit.years:
        return KpiText(number(value), tr('unit_years'));
      case MetricUnit.perMille:
        return KpiText(number(value), '‰');
      case MetricUnit.perThousand:
      case MetricUnit.unknown:
        return KpiText(number(value), '');
      case MetricUnit.pupilsPerTeacher:
        return KpiText('1:${number(value, decimals: 0)}', '');
      case MetricUnit.usd:
        return KpiText(number(value, decimals: 0), '\$');
    }
  }

  /// A bar or indicator value, with `%` when the unit is a percentage.
  String indicator(double value, MetricUnit unit) =>
      unit == MetricUnit.percent ? percent(value) : number(value);

  /// `2026-03-31` becomes `Mar 2026`.
  String monthYear(DateTime date) =>
      '${tr('month_short_${date.month}')} ${date.year}';

  /// `2h ago`, `1d ago`.
  String timeAgo(DateTime moment, DateTime now) {
    final age = now.difference(moment);
    if (age.inMinutes < 1) return tr('fmt_just_now');
    if (age.inMinutes < 60) return tr('fmt_ago_minutes', {'n': age.inMinutes});
    if (age.inHours < 24) return tr('fmt_ago_hours', {'n': age.inHours});
    return tr('fmt_ago_days', {'n': age.inDays});
  }

  String priority(Priority priority) => tr('priority_${priority.name}');

  String indexBand(IndexBand band) =>
      band == IndexBand.unknown ? '' : tr('band_${wireName(band)}');

  String qualityBand(QualityBand band) =>
      band == QualityBand.unknown ? '' : tr('quality_${wireName(band)}');

  /// `2025-Q4` becomes `2025 Q4`.
  String period(String period) => period.replaceAll('-', ' ');
}

/// The icon the dashboard shows next to a KPI, by its `key`.
String? metricIcon(String key) {
  switch (key) {
    case 'education':
      return AppAssets.icEducation;
    case 'healthcare':
      return AppAssets.icHealthcare;
    case 'unemployment':
    case 'economy':
      return AppAssets.icEconomy;
    case 'infrastructure':
      return AppAssets.icInfrastructure;
  }
  return null;
}
