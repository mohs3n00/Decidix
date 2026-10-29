import 'dart:io';

import 'package:decidix_app/core/localization/strings/app_strings.dart';
import 'package:flutter_test/flutter_test.dart';

/// A missing translation shows up on screen as a raw key like `btn_retry`.
/// These checks find it before the user does.
void main() {
  final arabic = RegExp(r'[؀-ۿ]');
  final placeholder = RegExp(r'\{[a-zA-Z]+\}');

  test('English and Arabic have exactly the same keys', () {
    final onlyEnglish = appStringsEn.keys.toSet().difference(
      appStringsAr.keys.toSet(),
    );
    final onlyArabic = appStringsAr.keys.toSet().difference(
      appStringsEn.keys.toSet(),
    );
    expect(onlyEnglish, isEmpty, reason: 'missing in Arabic: $onlyEnglish');
    expect(onlyArabic, isEmpty, reason: 'missing in English: $onlyArabic');
  });

  test(
    'every Arabic text has Arabic letters, except the few that are symbols',
    () {
      const symbolsOnly = {'unit_years_symbol'};
      for (final entry in appStringsAr.entries) {
        if (symbolsOnly.contains(entry.key)) continue;
        expect(
          arabic.hasMatch(entry.value),
          isTrue,
          reason: '${entry.key} is not Arabic: "${entry.value}"',
        );
      }
    },
  );

  test('both languages use the same {placeholders}', () {
    for (final key in appStringsEn.keys) {
      final english = placeholder
          .allMatches(appStringsEn[key]!)
          .map((m) => m[0])
          .toSet();
      final translated = placeholder
          .allMatches(appStringsAr[key] ?? '')
          .map((m) => m[0])
          .toSet();
      expect(translated, english, reason: '$key has different placeholders');
    }
  });

  test('every key used in the code has a text', () {
    // tr('key') and fmt.tr('key', ...) with a fixed key. Keys built from a
    // variable (tr('map_sector_$key')) are checked by their screens' tests.
    final used = RegExp(r"""\btr\('([a-z0-9_]+)'""");
    final missing = <String>{};
    for (final file in Directory(
      'lib',
    ).listSync(recursive: true).whereType<File>()) {
      if (!file.path.endsWith('.dart') || file.path.contains('localization')) {
        continue;
      }
      for (final match in used.allMatches(file.readAsStringSync())) {
        final key = match.group(1)!;
        if (!appStringsEn.containsKey(key)) missing.add('$key (${file.path})');
      }
    }
    expect(missing, isEmpty);
  });

  test('keys that are built from a prefix and a code all exist', () {
    // The prefixes the code builds keys from, and every value it can use.
    const families = {
      'priority_': ['critical', 'high', 'medium', 'low'],
      'band_': ['low', 'moderate_low', 'moderate', 'moderate_high', 'high'],
      'quality_': ['poor', 'fair', 'good', 'excellent'],
      'label_domain_': ['education', 'healthcare', 'economy', 'infrastructure'],
      'map_sector_': [
        'overall',
        'education',
        'healthcare',
        'economy',
        'infrastructure',
      ],
      'in_title_': ['education', 'healthcare', 'economy', 'infrastructure'],
      'proj_status_': ['planned', 'in_progress', 'delayed', 'completed'],
      'rep_cat_': ['roads', 'health', 'schools', 'water'],
      'rep_status_': ['under_review', 'escalated', 'resolved'],
      'asst_prompt_': ['1', '2', '3'],
      'month_short_': [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
      ],
    };
    for (final family in families.entries) {
      for (final code in family.value) {
        expect(appStringsEn, contains('${family.key}$code'));
      }
    }
  });
}
