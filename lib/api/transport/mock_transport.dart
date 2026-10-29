import 'dart:convert';
import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

import '../../core/errors/app_exception.dart';
import '../models/json.dart';
import 'api_transport.dart';

/// Answers API calls from the contract examples in assets/mock.
///
/// It does what the server would do for the cases a screen can reach: filters,
/// search, pagination, the trend range, the simulator maths, validation errors
/// and the state of likes and recommendations (kept in memory). It throws the
/// same exception types the real transport throws.
///
/// Shortcuts, because it is only a stand-in:
/// - region profiles and comparisons for regions without their own file are
///   built from the Delta example and the region list;
/// - the assistant always gives the same answer;
/// - the map ignores `sector`, the history ignores `sector` and `range`, and
///   predictions ignore `target_year`.
class MockTransport implements ApiTransport {
  MockTransport({
    AssetBundle? bundle,
    DateTime Function()? now,
    this.latency = const Duration(milliseconds: 150),
  }) : _bundle = bundle ?? rootBundle,
       _now = now ?? DateTime.now;

  static const _root = 'assets/mock';

  /// "Now" inside the report examples; timestamps are moved to the real now.
  static final _reportAnchor = DateTime.utc(2025, 11, 3, 12);

  static final _sectorPath = RegExp(
    r'^/insights/(education|healthcare|economy|infrastructure)$',
  );
  static final _regionPath = RegExp(r'^/regions/([a-z0-9_]+)$');
  static final _recommendationPath = RegExp(
    r'^/intelligence/recommendations/([^/]+)/(accept|dismiss)$',
  );
  static final _likePath = RegExp(r'^/decisions/citizen-reports/([^/]+)/like$');

  final AssetBundle _bundle;
  final DateTime Function() _now;
  final Duration latency;

  final Set<String> _likedReports = {};
  final Set<String> _plannedRecommendations = {};
  final Set<String> _dismissedRecommendations = {};

  // ---------------------------------------------------------------- GET

  @override
  Future<ApiEnvelope> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  }) async {
    await _wait();
    final params = query ?? const <String, dynamic>{};
    final route = Uri.parse(path).path;

    switch (route) {
      case '/overview':
        return _overview(params);
      case '/regions':
        return _regions(params);
      case '/regions/map-points':
        return _file('overview/map_points.json');
      case '/insights/comparison':
        return _comparison(params);
      case '/insights/historical':
        return _file('insights/historical.json');
      case '/insights/priority':
        return _priority(params);
      case '/insights/data-quality':
        return _file('insights/data_quality.json');
      case '/intelligence/predictions':
        return _file('intelligence/predictions.json');
      case '/intelligence/recommendations':
        return _recommendations(params);
      case '/decisions/projects':
        return _projects(params);
      case '/decisions/citizen-reports':
        return _reports(params);
    }

    final sector = _sectorPath.firstMatch(route);
    if (sector != null) return _file('insights/${sector[1]}.json');

    final region = _regionPath.firstMatch(route);
    if (region != null) return _regionProfile(region[1]!);

    throw NotFoundException('There is no mock for GET $route');
  }

  Future<ApiEnvelope> _overview(Map<String, dynamic> params) async {
    final data = await _data('overview/overview.json');
    final range = _text(params, 'range') ?? '7Y';
    final count = const {'3Y': 3, '5Y': 5, '7Y': 7}[range] ?? 7;

    final trend = asMap(data['trend'], 'trend');
    final points = trend['points'] as List;
    trend['points'] = points.sublist(math.max(0, points.length - count));
    trend['range'] = range;
    return ApiEnvelope(data);
  }

  Future<ApiEnvelope> _regions(Map<String, dynamic> params) async {
    var rows = await _regionRows();

    final priority = _text(params, 'priority');
    if (priority != null && priority != 'all') {
      rows = rows.where((r) => r['priority'] == priority).toList();
    }
    final search = _text(params, 'q')?.trim().toLowerCase();
    if (search != null && search.isNotEmpty) {
      rows = rows
          .where(
            (r) =>
                (r['name'] as String).toLowerCase().contains(search) ||
                (r['arabic_name'] as String).contains(search),
          )
          .toList();
    }

    final page = _paginate(rows, params);
    return ApiEnvelope(page.items, page.meta);
  }

  /// Region profile: the Delta example moved to the region's own numbers.
  Future<ApiEnvelope> _regionProfile(String id) async {
    final rows = await _regionRows();
    final row = rows.where((r) => r['id'] == id).firstOrNull;
    if (row == null) throw NotFoundException('Region "$id" does not exist');

    final data = await _data('overview/region_delta.json');
    final shift = _number(row['score']) - _number(data['score']);

    for (final key in const [
      'id',
      'name',
      'arabic_name',
      'rank',
      'score',
      'change',
      'priority',
      'population',
    ]) {
      data[key] = row[key];
    }
    data['rank_total'] = rows.length;

    for (final domain in asMapList(data['domains'], 'domains')) {
      domain['score'] = (_number(domain['score']) + shift).round().clamp(
        0,
        100,
      );
    }
    final history = asMap(data['history'], 'history');
    for (final point in asMapList(history['region'], 'history.region')) {
      point['value'] = _round(_number(point['value']) + shift, 1);
    }
    return ApiEnvelope(data);
  }

  Future<ApiEnvelope> _comparison(Map<String, dynamic> params) async {
    final aId = _text(params, 'a') ?? 'central_capital';
    final bId = _text(params, 'b') ?? 'steppe';

    final example = await _data('insights/comparison.json');
    if (asMap(example['a'])['id'] == aId && asMap(example['b'])['id'] == bId) {
      return ApiEnvelope(example);
    }

    final a = asMap((await _regionProfile(aId)).data, 'a');
    final b = asMap((await _regionProfile(bId)).data, 'b');

    final labels = {
      for (final m in asMapList(example['metrics'], 'metrics'))
        m['key'] as String: m,
    };
    JsonMap metric(
      String key,
      Object? scoreA,
      Object? scoreB,
      JsonMap fallback,
    ) {
      final label = labels[key] ?? fallback;
      return {
        'key': key,
        'label': label['label'],
        'arabic_label': label['arabic_label'],
        'score_a': scoreA,
        'score_b': scoreB,
      };
    }

    final domainsA = asMapList(a['domains'], 'a.domains');
    final domainsB = asMapList(b['domains'], 'b.domains');
    final metrics = <JsonMap>[
      metric('overall', a['score'], b['score'], const {}),
      for (var i = 0; i < domainsA.length; i++)
        metric(
          domainsA[i]['key'] as String,
          domainsA[i]['score'],
          domainsB[i]['score'],
          domainsA[i],
        ),
    ];

    final aLeads = _number(a['score']) >= _number(b['score']);
    final leader = aLeads ? a : b;
    final trailer = aLeads ? b : a;
    final gap = (_number(leader['score']) - _number(trailer['score'])).round();
    final widest = metrics
        .skip(1)
        .reduce(
          (x, y) =>
              (_number(x['score_a']) - _number(x['score_b'])).abs() >=
                  (_number(y['score_a']) - _number(y['score_b'])).abs()
              ? x
              : y,
        );

    return ApiEnvelope({
      'a': _side(a),
      'b': _side(b),
      'metrics': metrics,
      'gap_analysis': {
        'text':
            '${leader['name']} leads ${trailer['name']} by $gap index points. '
            'The widest gap is in ${(widest['label'] as String).toLowerCase()}.',
        'arabic_text':
            'تتقدم ${leader['arabic_name']} على ${trailer['arabic_name']} '
            'بفارق $gap نقطة في المؤشر. وأوسع فجوة في ${widest['arabic_label']}.',
      },
    });
  }

  JsonMap _side(JsonMap profile) => {
    'id': profile['id'],
    'name': profile['name'],
    'arabic_name': profile['arabic_name'],
    'score': profile['score'],
  };

  Future<ApiEnvelope> _priority(Map<String, dynamic> params) async {
    final data = await _data('insights/priority.json');
    final limit = _integer(params, 'limit', 0);
    if (limit > 0) data['queue'] = (data['queue'] as List).take(limit).toList();
    return ApiEnvelope(data);
  }

  Future<ApiEnvelope> _recommendations(Map<String, dynamic> params) async {
    var items = asMapList(
      (await _load('intelligence/recommendations.json'))['data'],
    );
    items = items
        .where(
          (r) =>
              !_plannedRecommendations.contains(r['id']) &&
              !_dismissedRecommendations.contains(r['id']),
        )
        .toList();
    final priority = _text(params, 'priority');
    if (priority != null && priority != 'all') {
      items = items.where((r) => r['priority'] == priority).toList();
    }
    return ApiEnvelope(items);
  }

  Future<ApiEnvelope> _projects(Map<String, dynamic> params) async {
    final data = await _data('decisions/projects.json');
    var items = asMapList(data['items'], 'items');
    final status = _text(params, 'status');
    if (status != null && status != 'all') {
      items = items.where((p) => p['status'] == status).toList();
    }
    final page = _paginate(items, params);
    data['items'] = page.items;
    return ApiEnvelope(data, page.meta);
  }

  Future<ApiEnvelope> _reports(Map<String, dynamic> params) async {
    final data = await _data('decisions/citizen_reports.json');
    var items = asMapList(data['items'], 'items');

    final category = _text(params, 'category');
    if (category != null && category != 'all') {
      items = items.where((r) => r['category'] == category).toList();
    }
    final status = _text(params, 'status');
    if (status != null && status != 'all') {
      items = items.where((r) => r['status'] == status).toList();
    }

    final shift = _now().toUtc().difference(_reportAnchor);
    for (final report in items) {
      report['created_at'] = DateTime.parse(report['created_at'] as String)
          .add(shift)
          .toIso8601String();
      if (_likedReports.contains(report['id'])) {
        report['likes'] = _number(report['likes']).toInt() + 1;
        report['liked_by_me'] = true;
      }
    }

    final page = _paginate(items, params);
    data['items'] = page.items;
    return ApiEnvelope(data, page.meta);
  }

  // --------------------------------------------------------------- POST

  @override
  Future<ApiEnvelope> post(
    String path, {
    Object? body,
    CancelToken? cancelToken,
  }) async {
    await _wait();
    final route = Uri.parse(path).path;

    switch (route) {
      case '/intelligence/assistant/chat':
        return _chat(body);
      case '/decisions/simulate':
        return _simulate(body);
    }

    final recommendation = _recommendationPath.firstMatch(route);
    if (recommendation != null) {
      return _answerRecommendation(
        recommendation[1]!,
        accept: recommendation[2] == 'accept',
      );
    }
    final like = _likePath.firstMatch(route);
    if (like != null) return _toggleLike(like[1]!);

    throw NotFoundException('There is no mock for POST $route');
  }

  Future<ApiEnvelope> _chat(Object? body) async {
    final request = _body(body);
    final message = (request['message'] as String?)?.trim() ?? '';
    if (message.isEmpty) {
      throw const ValidationException('Invalid request', {
        'message': 'is required',
      });
    }
    final data = await _data('intelligence/assistant_chat.json');
    final conversation = request['conversation_id'];
    if (conversation is String) data['conversation_id'] = conversation;
    return ApiEnvelope(data);
  }

  Future<ApiEnvelope> _simulate(Object? body) async {
    final request = _body(body);
    final regionId = request['region_id'];
    final allocations = request['allocations'];
    if (allocations is! Map) {
      throw const ValidationException('Invalid request', {
        'allocations': 'is required',
      });
    }
    final row = (await _regionRows())
        .where((r) => r['id'] == regionId)
        .firstOrNull;
    if (row == null) {
      throw const ValidationException('Invalid request', {
        'region_id': 'is not a region',
      });
    }

    final example = await _data('decisions/simulate.json');
    final levers = <JsonMap>[];
    var total = 0.0;
    var gain = 0.0;
    for (final lever in asMapList(example['levers'], 'levers')) {
      final domain = lever['domain'] as String;
      final amount = _number(allocations[domain] ?? 0);
      if (amount < 0) {
        throw ValidationException('Invalid request', {
          'allocations.$domain': 'must not be negative',
        });
      }
      final leverGain = _round(
        amount / 1e6 * _number(lever['yield_per_million']),
        2,
      );
      levers.add({
        'domain': domain,
        'amount': amount,
        'gain': leverGain,
        'yield_per_million': lever['yield_per_million'],
      });
      total += amount;
      gain += leverGain;
    }

    final today = _number(row['score']);
    return ApiEnvelope({
      'region_id': regionId,
      'horizon_months': example['horizon_months'],
      'today_score': today,
      'projected_score': _round(math.min(100, today + gain), 1),
      'gain': _round(gain, 2),
      'total_package': {'amount': total, 'currency': 'USD'},
      'levers': levers,
      'best_lever': example['best_lever'],
      'note': example['note'],
    });
  }

  Future<ApiEnvelope> _answerRecommendation(
    String id, {
    required bool accept,
  }) async {
    final items = asMapList(
      (await _load('intelligence/recommendations.json'))['data'],
    );
    if (!items.any((r) => r['id'] == id)) {
      throw NotFoundException('Recommendation "$id" does not exist');
    }
    if (accept) {
      _dismissedRecommendations.remove(id);
      _plannedRecommendations.add(id);
    } else {
      _plannedRecommendations.remove(id);
      _dismissedRecommendations.add(id);
    }
    return ApiEnvelope({'id': id, 'status': accept ? 'in_plan' : 'dismissed'});
  }

  Future<ApiEnvelope> _toggleLike(String id) async {
    final items = asMapList(
      (await _data('decisions/citizen_reports.json'))['items'],
    );
    final report = items.where((r) => r['id'] == id).firstOrNull;
    if (report == null) throw NotFoundException('Report "$id" does not exist');

    final liked = _likedReports.add(id);
    if (!liked) _likedReports.remove(id);
    return ApiEnvelope({
      'id': id,
      'likes': _number(report['likes']).toInt() + (liked ? 1 : 0),
      'liked_by_me': liked,
    });
  }

  // ------------------------------------------------------------ helpers

  Future<void> _wait() async {
    if (latency > Duration.zero) await Future<void>.delayed(latency);
  }

  Future<JsonMap> _load(String file) async {
    return asMap(jsonDecode(await _bundle.loadString('$_root/$file')), file);
  }

  Future<JsonMap> _data(String file) async =>
      asMap((await _load(file))['data'], '$file data');

  Future<ApiEnvelope> _file(String file) async {
    final json = await _load(file);
    final meta = json['meta'];
    return ApiEnvelope(json['data'], meta is JsonMap ? meta : null);
  }

  Future<List<JsonMap>> _regionRows() async {
    return asMapList((await _load('overview/regions.json'))['data'], 'regions');
  }

  JsonMap _body(Object? body) {
    if (body is JsonMap) return body;
    throw const ValidationException('Invalid request', {
      'body': 'must be a JSON object',
    });
  }

  ({List<JsonMap> items, JsonMap meta}) _paginate(
    List<JsonMap> all,
    Map<String, dynamic> params,
  ) {
    final perPage = _integer(params, 'per_page', 20).clamp(1, 100).toInt();
    final page = math.max(1, _integer(params, 'page', 1));
    final start = (page - 1) * perPage;
    final items = start >= all.length
        ? <JsonMap>[]
        : all.sublist(start, math.min(all.length, start + perPage));
    return (
      items: items,
      meta: {'page': page, 'per_page': perPage, 'total': all.length},
    );
  }

  String? _text(Map<String, dynamic> params, String key) {
    final value = params[key];
    return value == null ? null : '$value';
  }

  int _integer(Map<String, dynamic> params, String key, int fallback) {
    final value = params[key];
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? fallback;
  }

  double _number(Object? value) => (value as num).toDouble();

  double _round(double value, int places) {
    final factor = math.pow(10, places);
    return (value * factor).round() / factor;
  }
}
