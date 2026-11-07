import 'package:decidix_app/core/auth/auth_controller.dart';
import 'package:decidix_app/core/localization/app_localizations.dart';
import 'package:decidix_app/core/localization/locale_controller.dart';
import 'package:decidix_app/core/network/api_client.dart';
import 'package:decidix_app/features/auth/presentation/screens/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('DecidixUser & AuthState models', () {
    test('DecidixUser json serialization and deserialization', () {
      final user = const DecidixUser(
        id: 'usr_123',
        name: 'Evaluation User',
        arabicName: 'المستخدم التقييمي',
        email: 'evaluator@decidix.org',
        role: 'viewer',
      );

      final json = user.toJson();
      expect(json['id'], 'usr_123');
      expect(json['email'], 'evaluator@decidix.org');
      expect(json['role'], 'viewer');

      final parsed = DecidixUser.fromJson(json);
      expect(parsed.id, user.id);
      expect(parsed.name, user.name);
      expect(parsed.arabicName, user.arabicName);
      expect(parsed.email, user.email);
      expect(parsed.role, user.role);
      expect(parsed.emailVerified, isTrue);

      final unverifiedJson = {...json, 'email_verified': false};
      final unverifiedUser = DecidixUser.fromJson(unverifiedJson);
      expect(unverifiedUser.emailVerified, isFalse);
    });

    test('AuthState defaults and copyWith', () {
      const state = AuthState();
      expect(state.isAuthenticated, isFalse);
      expect(state.isLoading, isFalse);
      expect(state.user, isNull);
      expect(state.accessToken, isNull);

      final updated = state.copyWith(
        accessToken: 'mock_jwt_token',
        user: const DecidixUser(
          id: 'u1',
          name: 'Test',
          email: 'test@example.com',
          role: 'viewer',
        ),
      );
      expect(updated.isAuthenticated, isTrue);
      expect(updated.accessToken, 'mock_jwt_token');
      expect(updated.user?.name, 'Test');

      final cleared = updated.copyWith(clearAuth: true);
      expect(cleared.isAuthenticated, isFalse);
      expect(cleared.user, isNull);
      expect(cleared.accessToken, isNull);
    });
  });

  group('LoginScreen Widget Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    Widget createWidgetUnderTest({AuthState? authOverride}) {
      return ProviderScope(
        overrides: [
          if (authOverride != null)
            authNotifierProvider.overrideWith(
              () => _MockAuthNotifier(authOverride),
            ),
        ],
        child: Consumer(
          builder: (context, ref, _) {
            final locale = ref.watch(localeNotifierProvider);
            return MaterialApp(
              locale: locale,
              supportedLocales: const [Locale('en'), Locale('ar')],
              localizationsDelegates: const [
                AppLocalizationsDelegate(),
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              home: const LoginScreen(),
            );
          },
        ),
      );
    }

    testWidgets('renders brand title, Google button and demo button', (
      tester,
    ) async {
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pumpAndSettle();

      expect(find.text('Decidix'), findsOneWidget);
      expect(find.text('National Development Intelligence'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
      expect(find.text('Demo Google Sign-In (Evaluator)'), findsOneWidget);
      expect(find.text('عربي'), findsOneWidget);
    });

    testWidgets('toggles language to Arabic', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pumpAndSettle();

      // Tap language switch button
      await tester.tap(find.text('عربي'));
      await tester.pumpAndSettle();

      // Now strings should be in Arabic
      expect(find.text('ديسيديكس'), findsOneWidget);
      expect(find.text('ذكاء التنمية الوطنية'), findsOneWidget);
      expect(find.text('المتابعة باستخدام Google'), findsOneWidget);
      expect(find.text('دخول تجريبي بحساب Google (للمقيّم)'), findsOneWidget);
      expect(find.text('English'), findsOneWidget);
    });

    testWidgets('displays error banner when errorMessage is present', (
      tester,
    ) async {
      await tester.pumpWidget(
        createWidgetUnderTest(
          authOverride: const AuthState(
            errorMessage: 'Google Sign-In requires SHA-1 certificate',
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Google Sign-In requires SHA-1 certificate'),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('shows forgot password dialog when button is tapped', (
      tester,
    ) async {
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pumpAndSettle();

      final forgotButton = find.byKey(const ValueKey('forgot_password_button'));
      expect(forgotButton, findsOneWidget);

      await tester.tap(forgotButton);
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('reset_email_field')), findsOneWidget);
      expect(find.byKey(const ValueKey('send_reset_link_button')), findsOneWidget);
    });
  });

  group('Backend address validation before authentication', () {
    test('requireAbsoluteBaseUrl accepts an absolute https URL', () {
      expect(
        ApiClient.requireAbsoluteBaseUrl(
          ' https://decidix-backend-staging.example.com/v1 ',
        ),
        'https://decidix-backend-staging.example.com/v1',
      );
    });

    test('requireAbsoluteBaseUrl rejects a missing address', () {
      expect(
        () => ApiClient.requireAbsoluteBaseUrl('  '),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('API_BASE_URL is not set'),
          ),
        ),
      );
    });

    test('requireAbsoluteBaseUrl rejects a relative address', () {
      // This is the value that used to reach Dio and fail with
      // "No host specified in URI /auth/google".
      expect(
        () => ApiClient.requireAbsoluteBaseUrl('/auth/google'),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('absolute http(s) URL'),
          ),
        ),
      );
    });

    test('a client that builds its own transport rejects an empty base URL', () {
      expect(
        () => ApiClient(baseUrl: '', logRequests: false),
        throwsA(isA<StateError>()),
      );
    });

    test('Google sign-in reports the configuration instead of sending a request', () async {
      SharedPreferences.setMockInitialValues({});
      // Tests compile without --dart-define, so API_BASE_URL is empty: the
      // pre-flight check must fail before the Google account picker or Dio run.
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(authNotifierProvider.notifier);
      final signedIn = await notifier.signInWithGoogle();

      expect(signedIn, isFalse);
      expect(
        container.read(authNotifierProvider).errorMessage,
        contains('API_BASE_URL is not set'),
      );
      expect(container.read(authNotifierProvider).isLoading, isFalse);
    });
  });
}

class _MockAuthNotifier extends AuthNotifier {
  final AuthState _initial;
  _MockAuthNotifier(this._initial);

  @override
  AuthState build() => _initial;
}
