import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/api/models/common.dart';
import 'package:decidix_app/api/models/decisions.dart';
import 'package:decidix_app/api/models/insights.dart';
import 'package:decidix_app/api/models/intelligence.dart';
import 'package:decidix_app/api/repositories/decisions_api.dart';
import 'package:decidix_app/api/repositories/insights_api.dart';
import 'package:decidix_app/api/repositories/intelligence_api.dart';
import 'package:decidix_app/api/repositories/overview_api.dart';
import 'package:decidix_app/api/transport/mock_transport.dart';
import 'package:decidix_app/core/errors/app_exception.dart';

/// The mock files go through the same repositories and models as the real API,
/// so these tests also prove every contract example parses.

final _now = DateTime.utc(2025, 11, 3, 14);

MockTransport _mock() => MockTransport(latency: Duration.zero, now: () => _now);

SimulationRequest _request({
  String region = 'frontier',
  double education = 30e6,
  double healthcare = 45e6,
  double infrastructure = 20e6,
  double economy = 25e6,
}) =>
    SimulationRequest(regionId: region, allocations: {
      Domain.education: education,
      Domain.healthcare: healthcare,
      Domain.infrastructure: infrastructure,
      Domain.economy: economy,
    });

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('overview', () {
    test('dashboard parses', () async {
      final data = await OverviewApi(_mock()).getOverview();
      expect(data.index.score, 68.4);
      expect(data.kpis, hasLength(4));
      expect(data.trend, hasLength(7));
      expect(data.needsAttention.first.id, 'frontier');
      expect(data.needsAttention.first.rank, isNull);
    });

    test('range trims the trend to the last points', () async {
      final data = await OverviewApi(_mock()).getOverview(range: '3Y');
      expect(data.trendRange, '3Y');
      expect(data.trend.map((p) => p.year), [2023, 2024, 2025]);
    });

    test('map has one point per region', () async {
      final points = await OverviewApi(_mock()).getMapPoints();
      expect(points, hasLength(12));
    });
  });

  group('regions', () {
    late OverviewApi api;
    setUp(() => api = OverviewApi(_mock()));

    test('lists all 12 regions', () async {
      final page = await api.getRegions();
      expect(page.items, hasLength(12));
      expect(page.meta.total, 12);
      expect(page.items.first.rank, 1);
    });

    test('filters by priority', () async {
      final page = await api.getRegions(priority: Priority.high);
      expect(page.items, hasLength(4));
      expect(page.items.every((r) => r.priority == Priority.high), isTrue);
      expect(page.meta.total, 4);
    });

    test('searches names in English and Arabic', () async {
      expect((await api.getRegions(query: 'del')).items.map((r) => r.id), ['delta']);
      expect((await api.getRegions(query: 'الدلتا')).items.map((r) => r.id), ['delta']);
      expect((await api.getRegions(query: 'nowhere')).items, isEmpty);
    });

    test('paginates', () async {
      final first = await api.getRegions(perPage: 5);
      final last = await api.getRegions(page: 3, perPage: 5);
      expect(first.items, hasLength(5));
      expect(first.meta.hasMore, isTrue);
      expect(last.items, hasLength(2));
      expect(last.meta.hasMore, isFalse);
      expect(last.meta.total, 12);
    });

    test('profile of the example region', () async {
      final profile = await api.getRegion('delta');
      expect(profile.score, 52);
      expect(profile.rank, 10);
      expect(profile.historyNational.last.value, 68.4);
    });

    test('profile of another region follows its own numbers', () async {
      final profile = await api.getRegion('frontier');
      expect(profile.name.en, 'Frontier');
      expect(profile.score, 44);
      expect(profile.rank, 12);
      expect(profile.rankTotal, 12);
      expect(profile.historyRegion.last.value, 44.0);
      expect(profile.domains, hasLength(4));
      expect(profile.domains.every((d) => d.score >= 0 && d.score <= 100), isTrue);
    });

    test('an unknown region is not found', () async {
      expect(() => api.getRegion('atlantis'), throwsA(isA<NotFoundException>()));
    });
  });

  group('insights', () {
    late InsightsApi api;
    setUp(() => api = InsightsApi(_mock()));

    test('the four sectors share one shape', () async {
      for (final sector in [
        Domain.education,
        Domain.healthcare,
        Domain.economy,
        Domain.infrastructure,
      ]) {
        final data = await api.getSector(sector);
        expect(data.sector, sector);
        expect(data.kpis, hasLength(4));
        expect(data.breakdown.bars, hasLength(5));
        expect(data.rankingTop, hasLength(5));
        expect(data.rankingBottom, hasLength(5));
      }
    });

    test('comparison of the example pair', () async {
      final data = await api.getComparison('central_capital', 'steppe');
      expect(data.metrics, hasLength(5));
      expect(data.metrics.first.key, 'overall');
      expect(data.gapAnalysis.en, contains('39'));
    });

    test('comparison of another pair is built from the regions', () async {
      final data = await api.getComparison('lakeside', 'frontier');
      expect(data.a.score, 72);
      expect(data.b.score, 44);
      expect(data.metrics, hasLength(5));
      expect(data.gapAnalysis.en, contains('Lakeside leads Frontier by 28'));
      expect(data.gapAnalysis.ar, contains('28'));
    });

    test('historical, priority and data quality parse', () async {
      final history = await api.getHistorical();
      expect(history.milestones, hasLength(3));
      expect(history.milestones.last.impactValue, -2.2);

      final priority = await api.getPriority(limit: 3);
      expect(priority.queue, hasLength(3));
      expect(priority.high + priority.medium + priority.low, 12);

      final quality = await api.getDataQuality();
      expect(quality.sources, hasLength(3));
      expect(quality.sources.last.status, SourceStatus.overdue);
    });
  });

  group('intelligence', () {
    late IntelligenceApi api;
    setUp(() => api = IntelligenceApi(_mock()));

    test('predictions parse', () async {
      final data = await api.getPredictions();
      expect(data.projectedIndex, 73.5);
      expect(data.series.where((p) => p.isForecast), hasLength(3));
      expect(data.models, hasLength(3));
    });

    test('the assistant answers with a table and keeps the conversation id', () async {
      final reply = await api.sendMessage(
        message: 'Which region needs help most?',
        language: 'en',
        conversationId: 'conv_x',
      );
      expect(reply.conversationId, 'conv_x');
      expect(reply.table, hasLength(3));
      expect(reply.sources.single.period, '2025-Q4');
      expect(reply.suggestedPrompts, isNotEmpty);
    });

    test('an empty message is rejected like the server would', () async {
      expect(
        () => api.sendMessage(message: '   ', language: 'en'),
        throwsA(isA<ValidationException>()
            .having((e) => e.fields.keys, 'fields', contains('message'))),
      );
    });

    test('recommendations can be filtered by priority', () async {
      expect(await api.getRecommendations(), hasLength(4));
      final high = await api.getRecommendations(priority: Priority.high);
      expect(high, hasLength(2));
      expect(high.every((r) => r.priority == Priority.high), isTrue);
    });

    test('adding to the plan or dismissing removes the suggestion', () async {
      final added = await api.acceptRecommendation('rec_frontier_mobile_clinics');
      expect(added.status, RecommendationStatus.inPlan);
      expect(await api.getRecommendations(), hasLength(3));

      final dismissed = await api.dismissRecommendation('rec_delta_harbor_rail');
      expect(dismissed.status, RecommendationStatus.dismissed);
      final left = await api.getRecommendations();
      expect(left.map((r) => r.id), isNot(contains('rec_delta_harbor_rail')));
      expect(left, hasLength(2));
    });

    test('an unknown recommendation is not found', () async {
      expect(() => api.acceptRecommendation('nope'), throwsA(isA<NotFoundException>()));
    });
  });

  group('decisions', () {
    late DecisionsApi api;
    setUp(() => api = DecisionsApi(_mock()));

    test('the simulator adds up the lever gains', () async {
      final result = await api.simulate(_request());
      expect(result.todayScore, 44);
      expect(result.gain, closeTo(7.0, 0.05));
      expect(result.projectedScore, closeTo(51.0, 0.1));
      expect(result.totalPackage.amount, 120e6);
      expect(result.levers, hasLength(4));
      expect(result.bestLever, Domain.healthcare);
    });

    test('with no money the score does not move', () async {
      final result = await api.simulate(
        _request(education: 0, healthcare: 0, infrastructure: 0, economy: 0),
      );
      expect(result.gain, 0);
      expect(result.projectedScore, 44);
      expect(result.levers.every((l) => l.amount == 0), isTrue);
    });

    test('more healthcare money gives a bigger gain', () async {
      final base = await api.simulate(_request());
      final more = await api.simulate(_request(healthcare: 60e6));
      expect(more.gain, greaterThan(base.gain));
    });

    test('a negative amount is rejected and names the field', () async {
      expect(
        () => api.simulate(_request(education: -1)),
        throwsA(isA<ValidationException>()
            .having((e) => e.fields.keys, 'fields', contains('allocations.education'))),
      );
    });

    test('an unknown region is rejected', () async {
      expect(() => api.simulate(_request(region: 'atlantis')),
          throwsA(isA<ValidationException>()));
    });

    test('projects can be filtered by status and keep their summary', () async {
      final all = await api.getProjects();
      expect(all.items, hasLength(5));

      final delayed = await api.getProjects(status: ProjectStatus.delayed);
      expect(delayed.items.single.status, ProjectStatus.delayed);
      expect(delayed.meta.total, 1);
      expect(delayed.projectsCount, 5);
      expect(delayed.totalBudget.amount, 528e6);

      final done = (await api.getProjects(status: ProjectStatus.completed)).items.single;
      expect(done.dueDate, isNull);
      expect(done.completedAt, isNotNull);
    });

    test('citizen reports can be filtered by category', () async {
      final roads = await api.getCitizenReports(category: ReportCategory.roads);
      expect(roads.items, hasLength(2));
      expect(roads.items.every((r) => r.category == ReportCategory.roads), isTrue);

      final escalated = await api.getCitizenReports(status: ReportStatus.escalated);
      expect(escalated.items, hasLength(2));
    });

    test('report times are moved to the real now', () async {
      final data = await api.getCitizenReports();
      expect(_now.difference(data.items.first.createdAt), const Duration(hours: 2));
      expect(_now.difference(data.items[2].createdAt), const Duration(days: 1));
    });

    test('liking toggles and is remembered', () async {
      final liked = await api.toggleLike('rep_delta_bridge_cracks');
      expect(liked.likes, 129);
      expect(liked.likedByMe, isTrue);

      final list = await api.getCitizenReports();
      expect(list.items.first.likes, 129);
      expect(list.items.first.likedByMe, isTrue);

      final unliked = await api.toggleLike('rep_delta_bridge_cracks');
      expect(unliked.likes, 128);
      expect(unliked.likedByMe, isFalse);
    });

    test('an unknown report is not found', () async {
      expect(() => api.toggleLike('nope'), throwsA(isA<NotFoundException>()));
    });
  });

  test('an unknown route is not found', () async {
    expect(() => _mock().get('/nope'), throwsA(isA<NotFoundException>()));
    expect(() => _mock().post('/nope'), throwsA(isA<NotFoundException>()));
  });
}
