import 'dart:convert';
import 'dart:io';

import 'package:decidix_app/api/api_providers.dart';
import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/api/transport/mock_transport.dart';
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
