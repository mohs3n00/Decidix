import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/api/models/common.dart';
import 'package:decidix_app/api/repositories/overview_api.dart';
import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/core/errors/app_exception.dart';
import 'package:decidix_app/core/network/api_client.dart';

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.handler);

  final ResponseBody Function(RequestOptions options) handler;
  RequestOptions? last;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    last = options;
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object body, [int status = 200]) => ResponseBody.fromString(
  jsonEncode(body),
  status,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  },
);

ApiClient _client(
  _FakeAdapter adapter, {
  String language = 'en',
  String? token,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local/v1'))
    ..httpClientAdapter = adapter;
  return ApiClient(
    dio: dio,
    languageCode: () => language,
    authToken: () => token,
    logRequests: false,
  );
}

DioTransport _transport(ResponseBody Function(RequestOptions) handler) =>
    DioTransport(_client(_FakeAdapter(handler)));

void main() {
  group('success', () {
    test('returns data and meta from the envelope', () async {
      final transport = _transport(
        (_) => _json({
          'data': [1, 2],
          'meta': {'page': 1, 'per_page': 20, 'total': 2},
        }),
      );
      final response = await transport.get('/regions');
      expect(response.data, [1, 2]);
      expect(response.meta?['total'], 2);
    });

    test('meta is null when the server sends none', () async {
      final response = await _transport((_) => _json({'data': {}}))
          .get('/overview');
      expect(response.meta, isNull);
    });

    test('sends query parameters and a JSON body', () async {
      final adapter = _FakeAdapter((_) => _json({'data': {}}));
      final transport = DioTransport(_client(adapter));

      await transport.get('/regions', query: {'priority': 'high', 'page': 2});
      expect(adapter.last!.queryParameters, {'priority': 'high', 'page': 2});

      await transport.post(
        '/decisions/simulate',
        body: {'region_id': 'frontier'},
      );
      expect(adapter.last!.method, 'POST');
      expect(adapter.last!.data, {'region_id': 'frontier'});
    });
  });

  group('headers', () {
    test('waits for a token that is fetched asynchronously', () async {
      final adapter = _FakeAdapter((_) => _json({'data': {}}));
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local/v1'))
        ..httpClientAdapter = adapter;
      final client = ApiClient(
        dio: dio,
        logRequests: false,
        // Like a Clerk session token: it takes a moment to arrive.
        authToken: () async {
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return 'fresh-token';
        },
      );
      await DioTransport(client).get('/overview');

      expect(adapter.last!.headers['Authorization'], 'Bearer fresh-token');
    });

    test(
      'a token that cannot be fetched sends the request without one',
      () async {
        final adapter = _FakeAdapter((_) => _json({'data': {}}));
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local/v1'))
          ..httpClientAdapter = adapter;
        final client = ApiClient(
          dio: dio,
          logRequests: false,
          authToken: () => throw StateError('no session'),
        );
        await DioTransport(client).get('/overview');

        expect(adapter.last!.headers.containsKey('Authorization'), isFalse);
      },
    );

    test('sends the app language and the token', () async {
      final adapter = _FakeAdapter((_) => _json({'data': {}}));
      await DioTransport(_client(adapter, language: 'ar', token: 'abc'))
          .get('/overview');

      expect(adapter.last!.headers['Accept-Language'], 'ar');
      expect(adapter.last!.headers['Authorization'], 'Bearer abc');
    });

    test('sends no Authorization header when nobody is signed in', () async {
      final adapter = _FakeAdapter((_) => _json({'data': {}}));
      await DioTransport(_client(adapter)).get('/overview');

      expect(adapter.last!.headers.containsKey('Authorization'), isFalse);
    });
  });

  group('errors', () {
    Future<Object?> failure(
      ResponseBody Function(RequestOptions) handler,
    ) async {
      try {
        await _transport(handler).get('/x');
      } on Object catch (e) {
        return e;
      }
      return null;
    }

    test('401 is unauthorized and keeps the server message', () async {
      final error = await failure(
        (_) => _json({
          'error': {'code': 'token_expired', 'message': 'Session expired'},
        }, 401),
      );
      expect(error, isA<UnauthorizedException>());
      expect((error as AppException).message, 'Session expired');
    });

    test('404 is not found', () async {
      final error = await failure(
        (_) => _json({
          'error': {'message': 'No such region'},
        }, 404),
      );
      expect(error, isA<NotFoundException>());
    });

    test('422 carries the field errors', () async {
      final error = await failure(
        (_) => _json({
          'error': {
            'code': 'invalid',
            'message': 'Invalid request',
            'fields': {'allocations.education': 'must not be negative'},
          },
        }, 422),
      );
      expect(error, isA<ValidationException>());
      expect((error as ValidationException).fields, {
        'allocations.education': 'must not be negative',
      });
    });

    test('5xx is a server error with its status', () async {
      final error = await failure(
        (_) => _json({
          'error': {'message': 'Boom'},
        }, 503),
      );
      expect(error, isA<ServerException>());
      expect((error as ServerException).statusCode, 503);
    });

    test('another status is a plain AppException with its status', () async {
      final error = await failure((_) => _json({}, 400));
      expect(error, isA<AppException>());
      expect(error, isNot(isA<ServerException>()));
      expect((error as AppException).statusCode, 400);
    });

    test('a timeout is a network error', () async {
      final error = await failure(
        (options) => throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionTimeout,
        ),
      );
      expect(error, isA<NetworkException>());
    });

    test('no connection is a network error', () async {
      final error = await failure(
        (options) => throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
          message: 'offline',
        ),
      );
      expect(error, isA<NetworkException>());
    });

    test('a body that is not the envelope is a parse error', () async {
      expect(await failure((_) => _json({'foo': 1})), isA<ParseException>());
      expect(await failure((_) => _json([1, 2])), isA<ParseException>());
      expect(
        await failure(
          (_) => ResponseBody.fromString(
            '<html>Bad gateway</html>',
            200,
            headers: {
              Headers.contentTypeHeader: ['text/html'],
            },
          ),
        ),
        isA<ParseException>(),
      );
    });

    test('a cancelled request is reported as cancelled', () async {
      final transport = _transport((_) => _json({'data': {}}));
      final token = CancelToken()..cancel();
      expect(
        () => transport.get('/x', cancelToken: token),
        throwsA(isA<RequestCancelledException>()),
      );
    });
  });

  test(
    'the real transport parses the same contract file the mock serves',
    () async {
      final regions = File('assets/mock/overview/regions.json')
          .readAsStringSync();
      final adapter = _FakeAdapter(
        (_) => ResponseBody.fromString(
          regions,
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        ),
      );
      final api = OverviewApi(DioTransport(_client(adapter)));

      final page = await api.getRegions(priority: Priority.high, perPage: 50);

      expect(adapter.last!.path, '/regions');
      expect(adapter.last!.queryParameters, {
        'priority': 'high',
        'page': 1,
        'per_page': 50,
      });
      expect(page.items, hasLength(12));
      expect(page.meta.total, 12);
      expect(page.items.first.name.ar, 'العاصمة المركزية');
    },
  );
}
