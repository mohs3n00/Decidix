import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/api/models/common.dart';
import 'package:decidix_app/api/models/decisions.dart';
import 'package:decidix_app/api/models/intelligence.dart';
import 'package:decidix_app/api/models/json.dart';
import 'package:decidix_app/api/models/overview.dart';
import 'package:decidix_app/core/errors/app_exception.dart';

Matcher _parseError(String mentioning) => throwsA(
      isA<ParseException>().having((e) => e.message, 'message', contains(mentioning)),
    );

void main() {
  group('LocalizedText', () {
    test('reads the English and Arabic fields', () {
      final text = LocalizedText.read({'name': 'Delta', 'arabic_name': 'الدلتا'}, 'name');
      expect(text.resolve(const Locale('en')), 'Delta');
      expect(text.resolve(const Locale('ar')), 'الدلتا');
    });

    test('falls back to English when there is no Arabic', () {
      final text = LocalizedText.read({'text': 'Hello'}, 'text');
      expect(text.resolve(const Locale('ar')), 'Hello');
    });
  });

  group('enums', () {
    test('wire names match the Dart names', () {
      expect(parseEnum(ProjectStatus.values, 'in_progress', ProjectStatus.unknown),
          ProjectStatus.inProgress);
      expect(parseEnum(ReportStatus.values, 'under_review', ReportStatus.unknown),
          ReportStatus.underReview);
      expect(parseEnum(MetricUnit.values, 'score_100', MetricUnit.unknown), MetricUnit.score100);
      expect(parseEnum(MetricUnit.values, 'per_mille', MetricUnit.unknown), MetricUnit.perMille);
    });

    test('an unknown value does not crash, it falls back', () {
      expect(parseEnum(ProjectStatus.values, 'archived', ProjectStatus.unknown),
          ProjectStatus.unknown);
      expect(parseEnum(ProjectStatus.values, null, ProjectStatus.unknown), ProjectStatus.unknown);
      expect(parsePriority('urgent'), Priority.medium);
      expect(parseDomain('transport'), Domain.unknown);
    });

    test('wireName turns Dart names into what the server expects', () {
      expect(wireName(ProjectStatus.inProgress), 'in_progress');
      expect(wireName(ReportStatus.underReview), 'under_review');
      expect(wireName(Domain.education), 'education');
    });
  });

  group('safe reading', () {
    test('a missing field names the field', () {
      expect(() => Metric.fromJson({'key': 'x'}), _parseError('"label"'));
    });

    test('a wrong type names the field and the type', () {
      expect(() => TrendPoint.fromJson({'year': '2025', 'value': 1}), _parseError('"year"'));
      expect(() => TrendPoint.fromJson({'year': 2025, 'value': null}), _parseError('"value"'));
    });

    test('a list where an object is expected is a parse error, not a crash', () {
      expect(() => asMap([], 'data'), _parseError('data'));
      expect(() => asMapList({}, 'data'), _parseError('data'));
    });

    test('an integer is accepted where the contract says a number', () {
      final money = Money.fromJson({'amount': 18000000, 'currency': 'USD'});
      expect(money.amount, 18000000.0);
    });
  });

  group('models', () {
    test('metric improvement follows higher_is_better, not the sign', () {
      Metric metric(double change, bool higherIsBetter) => Metric.fromJson({
            'key': 'k',
            'label': 'K',
            'value': 1,
            'unit': 'percent',
            'change': change,
            'higher_is_better': higherIsBetter,
          });

      expect(metric(1.8, true).isImprovement, isTrue); // education up
      expect(metric(-0.4, false).isImprovement, isTrue); // unemployment down
      expect(metric(2.0, false).isImprovement, isFalse); // unemployment up
      expect(metric(-1.0, true).isImprovement, isFalse);
    });

    test('region rank is optional', () {
      final item = RegionListItem.fromJson({
        'id': 'frontier',
        'name': 'Frontier',
        'score': 44,
        'change': -1.7,
        'priority': 'high',
        'population': 1200000,
      });
      expect(item.rank, isNull);
      expect(item.priority, Priority.high);
    });

    test('a completed project has no due date', () {
      final project = Project.fromJson({
        'id': 'p',
        'title': 'Metro',
        'region': {'region_id': 'central_capital', 'name': 'Central Capital'},
        'status': 'completed',
        'progress': 100,
        'budget': {'amount': 1, 'currency': 'USD'},
        'due_date': null,
        'completed_at': '2025-09-30',
      });
      expect(project.dueDate, isNull);
      expect(project.completedAt, DateTime.parse('2025-09-30'));
      expect(project.status, ProjectStatus.completed);
    });

    test('a chat reply without a table has a null table', () {
      final reply = ChatReply.fromJson({
        'conversation_id': 'c1',
        'reply': {'text': 'Hi', 'table': null, 'sources': []},
        'suggested_prompts': ['a', 'b'],
      });
      expect(reply.table, isNull);
      expect(reply.suggestedPrompts, ['a', 'b']);
    });

    test('forecast points keep the confidence band only for forecasts', () {
      final past = ForecastPoint.fromJson(
          {'year': 2025, 'value': 68.4, 'kind': 'actual', 'lower': null, 'upper': null});
      final future = ForecastPoint.fromJson(
          {'year': 2026, 'value': 70, 'kind': 'forecast', 'lower': 69, 'upper': 71});
      expect(past.isForecast, isFalse);
      expect(past.lower, isNull);
      expect(future.isForecast, isTrue);
      expect(future.upper, 71.0);
    });

    test('without meta a list is one page', () {
      final meta = PageMeta.read(null, itemCount: 5);
      expect(meta.total, 5);
      expect(meta.hasMore, isFalse);
    });

    test('a simulation request is sent with wire names and amounts', () {
      const request = SimulationRequest(
        regionId: 'frontier',
        allocations: {Domain.education: 30000000, Domain.healthcare: 45000000},
      );
      expect(request.toJson(), {
        'region_id': 'frontier',
        'allocations': {'education': 30000000.0, 'healthcare': 45000000.0},
      });
    });
  });
}
