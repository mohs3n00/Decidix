import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

/// Checks the mock files in assets/mock against docs/api_contract.md.
/// If a rule here fails, either the file or the contract is wrong.

const _mockRoot = 'assets/mock';

/// Endpoint -> mock file. Keep in sync with section 2 of the contract.
const _endpoints = <String, String>{
  'GET /overview': 'overview/overview.json',
  'GET /regions/map-points': 'overview/map_points.json',
  'GET /regions': 'overview/regions.json',
  'GET /regions/{id}': 'overview/region_delta.json',
  'GET /insights/education': 'insights/education.json',
  'GET /insights/healthcare': 'insights/healthcare.json',
  'GET /insights/economy': 'insights/economy.json',
  'GET /insights/infrastructure': 'insights/infrastructure.json',
  'GET /insights/comparison': 'insights/comparison.json',
  'GET /insights/historical': 'insights/historical.json',
  'GET /insights/priority': 'insights/priority.json',
  'GET /insights/data-quality': 'insights/data_quality.json',
  'GET /intelligence/predictions': 'intelligence/predictions.json',
  'POST /intelligence/assistant/chat': 'intelligence/assistant_chat.json',
  'GET /intelligence/recommendations': 'intelligence/recommendations.json',
  'POST /intelligence/recommendations/{id}/accept':
      'intelligence/recommendation_accept.json',
  'POST /decisions/simulate': 'decisions/simulate.json',
  'GET /decisions/projects': 'decisions/projects.json',
  'GET /decisions/citizen-reports': 'decisions/citizen_reports.json',
  'POST /decisions/citizen-reports/{id}/like':
      'decisions/citizen_report_like.json',
};

final _snakeCase = RegExp(r'^[a-z][a-z0-9]*(_[a-z0-9]+)*$');
final _arabicLetter = RegExp(r'[؀-ۿ]');

// "$18M", "9.2M", "64%", "1,284": numbers must be sent as numbers.
final _formattedNumber = RegExp(r'^[\$€£]\s?\d|^\d[\d,.]*\s?[MKB%]$');

Map<String, dynamic> _load(String file) =>
    jsonDecode(File('$_mockRoot/$file').readAsStringSync())
        as Map<String, dynamic>;

dynamic _data(String file) => _load(file)['data'];

/// Calls [visit] for every map found anywhere inside [node].
void _eachMap(Object? node, String path, void Function(String, Map<String, dynamic>) visit) {
  if (node is Map<String, dynamic>) {
    visit(path, node);
    node.forEach((key, value) => _eachMap(value, '$path.$key', visit));
  } else if (node is List) {
    for (var i = 0; i < node.length; i++) {
      _eachMap(node[i], '$path[$i]', visit);
    }
  }
}

void _eachString(Object? node, String path, void Function(String, String) visit) {
  if (node is String) {
    visit(path, node);
  } else if (node is Map<String, dynamic>) {
    node.forEach((key, value) => _eachString(value, '$path.$key', visit));
  } else if (node is List) {
    for (var i = 0; i < node.length; i++) {
      _eachString(node[i], '$path[$i]', visit);
    }
  }
}

num _n(Object? value) => value as num;

void main() {
  group('mock files', () {
    test('every endpoint has a file with a data envelope', () {
      _endpoints.forEach((endpoint, file) {
        final path = '$_mockRoot/$file';
        expect(File(path).existsSync(), isTrue, reason: '$endpoint: $path is missing');
        final json = _load(file);
        expect(json.containsKey('data'), isTrue, reason: '$endpoint has no "data"');
        expect(json['data'], isNotNull, reason: '$endpoint has null "data"');
      });
    });

    test('no file is left out of the endpoint list', () {
      final onDisk = Directory(_mockRoot)
          .listSync(recursive: true)
          .whereType<File>()
          .map((f) => f.path.replaceAll('\\', '/').split('$_mockRoot/').last)
          .toSet();
      expect(onDisk, _endpoints.values.toSet());
    });

    test('lists carry pagination meta', () {
      for (final file in [
        'overview/regions.json',
        'decisions/projects.json',
        'decisions/citizen_reports.json',
      ]) {
        final meta = _load(file)['meta'] as Map<String, dynamic>;
        expect(meta.keys, containsAll(['page', 'per_page', 'total']), reason: file);
      }
    });

    test('keys are snake_case', () {
      for (final file in _endpoints.values) {
        _eachMap(_load(file), file, (path, map) {
          for (final key in map.keys) {
            expect(_snakeCase.hasMatch(key), isTrue, reason: '$path has key "$key"');
          }
        });
      }
    });

    test('numbers are numbers, not formatted strings', () {
      for (final file in _endpoints.values) {
        _eachString(_load(file), file, (path, value) {
          expect(_formattedNumber.hasMatch(value), isFalse,
              reason: '$path is the string "$value"');
        });
      }
    });

    test('arabic_ fields pair with an English field and contain Arabic', () {
      for (final file in _endpoints.values) {
        _eachMap(_load(file), file, (path, map) {
          map.forEach((key, value) {
            if (!key.startsWith('arabic_')) return;
            final english = key.substring('arabic_'.length);
            expect(map[english], isA<String>(),
                reason: '$path has "$key" but no "$english"');
            expect(_arabicLetter.hasMatch(value as String), isTrue,
                reason: '$path.$key has no Arabic letters');
          });
        });
      }
    });

    test('percentages stay between 0 and 100', () {
      const percentKeys = {
        'confidence', 'progress', 'coverage', 'need_score',
        'completeness', 'timeliness', 'accuracy',
      };
      for (final file in _endpoints.values) {
        _eachMap(_load(file), file, (path, map) {
          for (final key in percentKeys) {
            if (map[key] == null) continue;
            expect(_n(map[key]), inInclusiveRange(0, 100), reason: '$path.$key');
          }
        });
      }
    });
  });

  group('numbers agree across files', () {
    late List<Map<String, dynamic>> regions;
    late Set<String> regionIds;

    setUpAll(() {
      regions = (_data('overview/regions.json') as List).cast<Map<String, dynamic>>();
      regionIds = regions.map((r) => r['id'] as String).toSet();
    });

    test('the 12 regions are unique and ranked 1 to 12 by score', () {
      expect(regions.length, 12);
      expect(regionIds.length, 12);
      for (var i = 0; i < regions.length; i++) {
        expect(regions[i]['rank'], i + 1);
        if (i > 0) {
          expect(_n(regions[i]['score']), lessThanOrEqualTo(_n(regions[i - 1]['score'])));
        }
      }
    });

    test('dashboard totals match the regions', () {
      final index = (_data('overview/overview.json') as Map)['index'] as Map;
      expect(index['regions_count'], regions.length);
      expect(index['population'],
          regions.fold<num>(0, (sum, r) => sum + _n(r['population'])));
      expect(index['at_risk_count'],
          regions.where((r) => r['priority'] == 'high').length);
    });

    test('needs attention are the lowest scoring regions', () {
      final items = ((_data('overview/overview.json') as Map)['needs_attention'] as List)
          .cast<Map<String, dynamic>>();
      final lowest = [...regions]..sort((a, b) => _n(a['score']).compareTo(_n(b['score'])));
      for (var i = 0; i < items.length; i++) {
        expect(items[i]['id'], lowest[i]['id']);
        expect(items[i]['score'], lowest[i]['score']);
      }
    });

    test('map has one point per region with the same scores', () {
      final points = (_data('overview/map_points.json') as List).cast<Map<String, dynamic>>();
      expect(points.map((p) => p['id']).toSet(), regionIds);
      for (final p in points) {
        final region = regions.firstWhere((r) => r['id'] == p['id']);
        expect(p['score'], region['score']);
        expect(p['priority'], region['priority']);
        expect(_n(p['latitude']), inInclusiveRange(-90, 90));
        expect(_n(p['longitude']), inInclusiveRange(-180, 180));
      }
    });

    test('priority summary counts the regions', () {
      final summary = (_data('insights/priority.json') as Map)['summary'] as Map;
      for (final level in ['high', 'medium', 'low']) {
        expect(summary[level], regions.where((r) => r['priority'] == level).length,
            reason: level);
      }
    });

    test('priority queue is sorted by need score', () {
      final queue = ((_data('insights/priority.json') as Map)['queue'] as List)
          .cast<Map<String, dynamic>>();
      for (var i = 1; i < queue.length; i++) {
        expect(_n(queue[i]['need_score']), lessThanOrEqualTo(_n(queue[i - 1]['need_score'])));
      }
    });

    test('every region reference points to a real region', () {
      for (final file in _endpoints.values) {
        _eachMap(_load(file), file, (path, map) {
          final ref = map['region_id'];
          if (ref != null) {
            expect(regionIds, contains(ref), reason: '$path.region_id');
          }
        });
      }
      final data = _data('overview/overview.json') as Map;
      for (final r in (data['needs_attention'] as List).cast<Map>()) {
        expect(regionIds, contains(r['id']));
      }
      final comparison = _data('insights/comparison.json') as Map;
      expect(regionIds, contains((comparison['a'] as Map)['id']));
      expect(regionIds, contains((comparison['b'] as Map)['id']));
    });

    test('the profile matches its row in the region list', () {
      final profile = _data('overview/region_delta.json') as Map<String, dynamic>;
      final row = regions.firstWhere((r) => r['id'] == profile['id']);
      for (final key in ['name', 'arabic_name', 'rank', 'score', 'change', 'priority', 'population']) {
        expect(profile[key], row[key], reason: key);
      }
      expect(profile['rank_total'], regions.length);
      final history = profile['history'] as Map;
      expect((history['region'] as List).length, (history['national'] as List).length);
      expect(((history['region'] as List).last as Map)['value'], profile['score']);
    });

    test('sector screens share one shape with 4 KPIs, 5 bars and 5 + 5 ranks', () {
      for (final sector in ['education', 'healthcare', 'economy', 'infrastructure']) {
        final data = _data('insights/$sector.json') as Map<String, dynamic>;
        expect(data['sector'], sector);
        expect((data['kpis'] as List).length, 4, reason: sector);
        expect((data['indicators'] as List).length, 4, reason: sector);
        expect(((data['breakdown'] as Map)['bars'] as List).length, 5, reason: sector);
        expect(((data['trend'] as Map)['points'] as List).length, 7, reason: sector);

        final ranking = data['ranking'] as Map;
        final top = (ranking['top'] as List).cast<Map<String, dynamic>>();
        final bottom = (ranking['bottom'] as List).cast<Map<String, dynamic>>();
        expect(top.length, 5, reason: sector);
        expect(bottom.length, 5, reason: sector);
        for (var i = 1; i < 5; i++) {
          expect(_n(top[i]['score']), lessThanOrEqualTo(_n(top[i - 1]['score'])), reason: '$sector top');
          expect(_n(bottom[i]['score']), greaterThanOrEqualTo(_n(bottom[i - 1]['score'])), reason: '$sector bottom');
        }
        // the last trend point is the sector score shown on the dashboard
        final points = (data['trend'] as Map)['points'] as List;
        expect((points.last as Map)['value'], (data['index'] as Map)['score'], reason: sector);
      }
    });

    test('overall trend is the same on the dashboard and the history screen', () {
      final dashboard = ((_data('overview/overview.json') as Map)['trend'] as Map)['points'];
      final history = ((_data('insights/historical.json') as Map)['trend'] as Map)['points'];
      expect(history, dashboard);
    });

    test('annual changes add up to the change since 2019', () {
      final data = _data('insights/historical.json') as Map<String, dynamic>;
      final sum = (data['annual_change'] as List)
          .fold<num>(0, (total, e) => total + _n((e as Map)['value']));
      expect(sum, closeTo(_n((data['summary'] as Map)['change_since_start']), 0.001));
      final points = ((data['trend'] as Map)['points'] as List).cast<Map>();
      expect(_n(points.last['value']) - _n(points.first['value']),
          closeTo(_n((data['summary'] as Map)['change_since_start']), 0.001));
    });

    test('comparison scores add up', () {
      final data = _data('insights/comparison.json') as Map<String, dynamic>;
      final overall = (data['metrics'] as List).cast<Map>().first;
      expect(overall['key'], 'overall');
      expect(overall['score_a'], (data['a'] as Map)['score']);
      expect(overall['score_b'], (data['b'] as Map)['score']);
      for (final side in ['a', 'b']) {
        final id = (data[side] as Map)['id'];
        final row = regions.firstWhere((r) => r['id'] == id);
        expect((data[side] as Map)['score'], row['score'], reason: side);
      }
    });

    test('prediction series ends at the projected index', () {
      final data = _data('intelligence/predictions.json') as Map<String, dynamic>;
      final series = (data['series'] as List).cast<Map<String, dynamic>>();
      expect(series.last['year'], data['target_year']);
      expect(series.last['value'], data['projected_index']);
      expect(data['available_years'], contains(data['target_year']));
      for (final point in series) {
        if (point['kind'] == 'actual') {
          expect(point['lower'], isNull);
          expect(point['upper'], isNull);
        } else {
          expect(_n(point['lower']), lessThanOrEqualTo(_n(point['value'])));
          expect(_n(point['upper']), greaterThanOrEqualTo(_n(point['value'])));
        }
      }
    });

    test('simulator gains and amounts add up', () {
      final data = _data('decisions/simulate.json') as Map<String, dynamic>;
      final levers = (data['levers'] as List).cast<Map<String, dynamic>>();
      expect(levers.map((l) => l['domain']).toSet(),
          {'education', 'healthcare', 'infrastructure', 'economy'});
      expect(levers.fold<num>(0, (s, l) => s + _n(l['amount'])),
          _n((data['total_package'] as Map)['amount']));
      expect(levers.fold<num>(0, (s, l) => s + _n(l['gain'])),
          closeTo(_n(data['gain']), 0.05));
      expect(_n(data['today_score']) + _n(data['gain']),
          closeTo(_n(data['projected_score']), 0.001));
      final best = levers.reduce(
          (a, b) => _n(a['yield_per_million']) >= _n(b['yield_per_million']) ? a : b);
      expect((data['best_lever'] as Map)['domain'], best['domain']);
    });

    test('project summary matches the items', () {
      final data = _data('decisions/projects.json') as Map<String, dynamic>;
      final items = (data['items'] as List).cast<Map<String, dynamic>>();
      final summary = data['summary'] as Map;
      expect(summary['projects_count'], items.length);
      expect(summary['delayed_count'], items.where((p) => p['status'] == 'delayed').length);
      expect(_n((summary['total_budget'] as Map)['amount']),
          items.fold<num>(0, (s, p) => s + _n((p['budget'] as Map)['amount'])));
      for (final p in items) {
        final done = p['status'] == 'completed';
        expect(p['completed_at'] != null, done, reason: '${p['id']} completed_at');
        expect(p['due_date'] == null, done, reason: '${p['id']} due_date');
      }
    });

    test('recommendations are suggestions with a cost in USD', () {
      final items = (_data('intelligence/recommendations.json') as List)
          .cast<Map<String, dynamic>>();
      expect(items, isNotEmpty);
      for (final r in items) {
        expect(r['status'], 'suggested');
        expect((r['estimated_cost'] as Map)['currency'], 'USD');
      }
    });

    test('citizen report like response is consistent', () {
      final like = _data('decisions/citizen_report_like.json') as Map<String, dynamic>;
      final items = ((_data('decisions/citizen_reports.json') as Map)['items'] as List)
          .cast<Map<String, dynamic>>();
      final report = items.firstWhere((r) => r['id'] == like['id']);
      expect(like['likes'], _n(report['likes']) + 1);
      expect(like['liked_by_me'], isTrue);
    });
  });
}
