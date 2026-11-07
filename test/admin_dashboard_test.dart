import 'package:decidix_app/api/repositories/admin_api.dart';
import 'package:decidix_app/core/auth/auth_controller.dart';
import 'package:decidix_app/core/localization/app_localizations.dart';
import 'package:decidix_app/core/localization/locale_controller.dart';
import 'package:decidix_app/core/network/api_client.dart';
import 'package:decidix_app/features/admin/presentation/screens/admin_dashboard_screen.dart';
import 'package:decidix_app/features/admin/presentation/screens/admin_users_screen.dart';
import 'package:decidix_app/features/admin/presentation/widgets/admin_kpi_card.dart';
import 'package:decidix_app/features/admin/presentation/widgets/admin_period_selector.dart';
import 'package:decidix_app/features/admin/presentation/widgets/must_change_password_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeAdminApi extends AdminApi {
  FakeAdminApi() : super(ApiClient(baseUrl: 'https://test.decidix.gov/v1'));

  @override
  Future<Map<String, dynamic>> getDashboard({String period = '30d'}) async {
    return {
      'period': period,
      'kpis': {
        'users': {
          'total': 42,
          'active': 38,
          'suspended': 4,
          'deleted': 0,
          'newInPeriod': 12,
        },
        'datasets': {
          'total': 18,
          'validated': 15,
          'invalid': 3,
          'pending': 0,
          'totalStorageBytes': 52428800,
          'totalRecords': 4500,
        },
        'activity': {
          'totalEvents': 1250,
          'uniqueUsers': 34,
        },
        'notifications': {
          'totalCampaigns': 5,
          'totalDelivered': 120,
        },
      },
      'analytics': {
        'moduleBreakdown': [
          {'module': 'overview', 'count': 400},
          {'module': 'insights', 'count': 300},
          {'module': 'intelligence', 'count': 250},
          {'module': 'decisions', 'count': 150},
          {'module': 'datasets', 'count': 100},
          {'module': 'assistant', 'count': 50},
        ],
        'dailyTrends': [],
        'totalEvents': 1250,
      },
    };
  }

  @override
  Future<({List<Map<String, dynamic>> users, int total, int page, int perPage})> getUsers({
    String? search,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    return (
      users: [
        {
          'id': 'usr_admin',
          'email': 'admin@decidixapp.tech',
          'name': 'Decidix Admin',
          'arabicName': 'مدير النظام',
          'role': 'admin',
          'status': 'active',
          'emailVerified': true,
          'createdAt': '2026-11-01T10:00:00Z',
          'datasetCount': 5,
          'storageBytes': 1048576,
        },
        {
          'id': 'usr_user2',
          'email': 'analyst@decidix.org',
          'name': 'Policy Analyst',
          'arabicName': null,
          'role': 'analyst',
          'status': 'suspended',
          'emailVerified': false,
          'createdAt': '2026-11-02T12:00:00Z',
          'datasetCount': 1,
          'storageBytes': 2048,
        },
      ],
      total: 2,
      page: page,
      perPage: limit,
    );
  }
}

Widget createTestApp({required Widget child, AdminApi? adminApi, DecidixUser? user}) {
  return ProviderScope(
    overrides: [
      adminApiProvider.overrideWithValue(adminApi ?? FakeAdminApi()),
      localeNotifierProvider.overrideWith(() => LocaleNotifier()..setLocale(const Locale('en'))),
      if (user != null)
        authNotifierProvider.overrideWith(() {
          final notifier = AuthNotifier();
          return notifier;
        }),
    ],
    child: MaterialApp(
      locale: const Locale('en'),
      supportedLocales: const [Locale('en'), Locale('ar')],
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(body: child),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('DecidixUser Admin Fields Suite', () {
    test('serializes and deserializes admin status and mustChangePassword correctly', () {
      const admin = DecidixUser(
        id: 'usr_admin',
        name: 'System Admin',
        email: 'admin@decidixapp.tech',
        role: 'admin',
        status: 'active',
        mustChangePassword: true,
      );

      expect(admin.isAdmin, isTrue);
      expect(admin.isSuspended, isFalse);
      expect(admin.mustChangePassword, isTrue);

      final json = admin.toJson();
      expect(json['status'], 'active');
      expect(json['must_change_password'], isTrue);

      final decoded = DecidixUser.fromJson(json);
      expect(decoded.isAdmin, isTrue);
      expect(decoded.status, 'active');
      expect(decoded.mustChangePassword, isTrue);
    });

    test('correctly detects suspended status', () {
      const suspendedUser = DecidixUser(
        id: 'usr_suspended',
        name: 'Suspended Account',
        email: 'suspended@decidix.org',
        role: 'viewer',
        status: 'suspended',
      );

      expect(suspendedUser.isSuspended, isTrue);
      expect(suspendedUser.isAdmin, isFalse);
    });
  });

  group('Admin Widgets Suite', () {
    testWidgets('renders AdminKpiCard with title, value, and subtitle', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AdminKpiCard(
              title: 'Total Users',
              value: '1,234',
              subtitle: '1,200 active accounts',
              icon: Icons.people,
            ),
          ),
        ),
      );

      expect(find.text('Total Users'), findsOneWidget);
      expect(find.text('1,234'), findsOneWidget);
      expect(find.text('1,200 active accounts'), findsOneWidget);
      expect(find.byIcon(Icons.people), findsOneWidget);
    });

    testWidgets('renders AdminPeriodSelector and invokes callback on selection', (tester) async {
      String selected = '30d';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminPeriodSelector(
              selectedPeriod: selected,
              onSelected: (p) => selected = p,
            ),
          ),
        ),
      );

      expect(find.text('7 Days'), findsOneWidget);
      expect(find.text('30 Days'), findsOneWidget);
      expect(find.text('90 Days'), findsOneWidget);
      expect(find.text('All Time'), findsOneWidget);

      await tester.tap(find.text('7 Days'));
      await tester.pumpAndSettle();
      expect(selected, '7d');
    });

    testWidgets('MustChangePasswordDialog validates minimum password length', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          child: const MustChangePasswordDialog(),
        ),
      );

      expect(find.text('Set Permanent Password'), findsOneWidget);

      // Tap submit with empty fields
      await tester.tap(find.text('Save & Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Current password required'), findsOneWidget);
    });
  });

  group('Admin Dashboard & Users Screens Suite', () {
    testWidgets('renders AdminDashboardScreen with live KPI values', (tester) async {
      await tester.pumpWidget(
        createTestApp(child: const AdminDashboardScreen()),
      );

      // Wait for future to settle
      await tester.pumpAndSettle();

      expect(find.text('Platform Overview'), findsOneWidget);
      expect(find.text('SYSTEM ADMINISTRATION'), findsOneWidget);
      expect(find.text('Privacy Assured: Displays operational metadata and aggregated stats only. Dataset contents and AI chat records are strictly omitted.'), findsOneWidget);

      // Check rendered KPI cards
      expect(find.text('Total Accounts'), findsOneWidget);
      expect(find.text('42'), findsOneWidget);
      expect(find.text('Platform Datasets'), findsOneWidget);
      expect(find.text('18'), findsOneWidget);
      expect(find.text('Module Events'), findsOneWidget);
      expect(find.text('1250'), findsOneWidget);

      // Check subsystems links
      expect(find.text('User Accounts Management'), findsOneWidget);
      expect(find.text('Feature Usage & Platform Analytics'), findsOneWidget);
      expect(find.text('Dataset Storage & Formats'), findsOneWidget);
      expect(find.text('Push Notification Campaigns'), findsOneWidget);
    });

    testWidgets('renders AdminUsersScreen with user list and status chips', (tester) async {
      await tester.pumpWidget(
        createTestApp(child: const AdminUsersScreen()),
      );

      await tester.pumpAndSettle();

      expect(find.text('User Accounts'), findsOneWidget);
      expect(find.text('Total accounts: 2'), findsOneWidget);
      expect(find.text('Decidix Admin'), findsOneWidget);
      expect(find.text('admin@decidixapp.tech'), findsOneWidget);
      expect(find.text('Policy Analyst'), findsOneWidget);
      expect(find.text('analyst@decidix.org'), findsOneWidget);

      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.text('SUSPENDED'), findsOneWidget);
    });
  });
}
