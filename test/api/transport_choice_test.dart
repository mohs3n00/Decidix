import 'dart:convert';
import 'dart:io';

import 'package:decidix_app/api/api_providers.dart';
import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/api/transport/mock_transport.dart';
import 'package:decidix_app/core/config/app_config.dart';
import 'package:decidix_app/core/network/api_client.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('createTransport', () {
    ApiClient client() =>
        ApiClient(baseUrl: 'https://x.test/v1', logRequests: false);

    test('the mock needs no address', () {
      final transport = createTransport(
        useMock: true,
        baseUrl: '',
        client: client,
      );
      expect(transport, isA<MockTransport>());
    });

    test('the real server with an address uses Dio', () {
      final transport = createTransport(
        useMock: false,
        baseUrl: 'https://x.test/v1',
        client: client,
      );
      expect(transport, isA<DioTransport>());
    });

    test('the real server with no address fails and says what to do', () {
      expect(
        () => createTransport(useMock: false, baseUrl: '  ', client: client),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('API_BASE_URL'),
          ),
        ),
      );
    });
  });

  group('release configuration', () {
    ApiClient client() =>
        ApiClient(baseUrl: 'https://x.test/v1', logRequests: false);

    StateError failure(String baseUrl, {bool useMock = false}) {
      try {
        createTransport(
          useMock: useMock,
          baseUrl: baseUrl,
          client: client,
          isRelease: true,
        );
      } on StateError catch (e) {
        return e;
      }
      fail('expected $baseUrl to be rejected in a release build');
    }

    test('a release build can never serve mock data', () {
      expect(AppConfig.resolveUseMock(requested: true, isRelease: true), isFalse);
      expect(
        AppConfig.resolveUseMock(requested: true, isRelease: false),
        isTrue,
      );
      expect(
        AppConfig.resolveUseMock(requested: false, isRelease: false),
        isFalse,
      );
      expect(failure('', useMock: true).message, contains('release'));
    });

    test('a release build with no API_BASE_URL fails with instructions', () {
      expect(failure('  ').message, contains('API_BASE_URL'));
    });

    test('a release build rejects plain HTTP and development hosts', () {
      for (final url in [
        'http://api.decidix.app/v1',
        'https://localhost:5000/v1',
        'https://127.0.0.1:5000/v1',
        'https://10.0.2.2:5000/v1',
      ]) {
        expect(failure(url).message, isNotEmpty, reason: url);
      }
    });

    test('a release build accepts an HTTPS production origin', () {
      expect(
        createTransport(
          useMock: false,
          baseUrl: 'https://api.decidix.app/v1',
          client: client,
          isRelease: true,
        ),
        isA<DioTransport>(),
      );
    });

    test('development still allows a loopback http server', () {
      expect(
        createTransport(
          useMock: false,
          baseUrl: 'http://localhost:5000/v1',
          client: client,
          isRelease: false,
        ),
        isA<DioTransport>(),
      );
    });

    test('malformed and non-http URLs are rejected', () {
      for (final url in [
        'not a url',
        'api.decidix.app',
        'ftp://api.decidix.app/v1',
      ]) {
        expect(failure(url).message, isNotEmpty, reason: url);
      }
    });
  });

  group('env files', () {
    Map<String, dynamic> read(String name) =>
        jsonDecode(File('env/$name.json').readAsStringSync())
            as Map<String, dynamic>;

    test('dev runs on the mock', () {
      expect(read('dev')['USE_MOCK'], isTrue);
    });

    test(
      'staging and prod call a server over https, with no trailing slash',
      () {
        for (final name in ['staging', 'prod']) {
          final env = read(name);
          expect(env['USE_MOCK'], isFalse, reason: name);
          final url = env['API_BASE_URL'] as String;
          expect(url, startsWith('https://'), reason: name);
          expect(url, isNot(endsWith('/')), reason: name);
        }
      },
    );
  });
}
