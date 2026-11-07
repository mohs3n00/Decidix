import 'package:decidix_app/core/auth/auth_controller.dart';
import 'package:decidix_app/core/config/provider_retry.dart';
import 'package:decidix_app/features/datasets/presentation/screens/dataset_upload_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TestAuthNotifier extends AuthNotifier {
  final AuthState _initial;
  TestAuthNotifier(this._initial);

  @override
  AuthState build() => _initial;
}

Future<void> _scrollTo(WidgetTester tester, Finder finder) async {
  final scrollable = find.byType(Scrollable).first;
  await tester.scrollUntilVisible(finder, 200, scrollable: scrollable);
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('dataset upload screen requires an authorized role', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        retry: noAutomaticRetry,
        child: const MaterialApp(home: DatasetUploadScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Upload dataset'), findsOneWidget);
    expect(find.textContaining('Only administrators and analysts'), findsOneWidget);

    await _scrollTo(tester, find.byType(FilledButton));

    expect(find.text('Upload and process'), findsOneWidget);
    // The submit button is disabled without an authorized user.
    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('labels the synthetic classification honestly', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        retry: noAutomaticRetry,
        child: const MaterialApp(home: DatasetUploadScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Synthetic demo data is not official statistics'), findsOneWidget);
    expect(find.textContaining('This upload will be treated as synthetic'), findsOneWidget);
  });

  testWidgets('authorized admin sees form fields and warning disappears', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    addTearDown(tester.view.resetPhysicalSize);

    final adminUser = const DecidixUser(
      id: 'usr_admin',
      name: 'Admin Tester',
      email: 'admin@decidix.gov.sa',
      role: 'admin',
    );

    await tester.pumpWidget(
      ProviderScope(
        retry: noAutomaticRetry,
        overrides: [
          authNotifierProvider.overrideWith(
            () => TestAuthNotifier(
              AuthState(user: adminUser, accessToken: 'test_token', isInitialized: true),
            ),
          ),
        ],
        child: const MaterialApp(home: DatasetUploadScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Upload dataset'), findsOneWidget);
    // Warning banner about missing role must NOT be visible for admin
    expect(find.textContaining('Only administrators and analysts'), findsNothing);
    // Form fields are present
    expect(find.textContaining('Source / publisher'), findsOneWidget);
    expect(find.textContaining('License'), findsOneWidget);
    expect(find.textContaining('Geographic & temporal coverage'), findsOneWidget);
  });

  testWidgets('renders Arabic interface in RTL mode', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        retry: noAutomaticRetry,
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: DatasetUploadScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('رفع مجموعة بيانات'), findsOneWidget);
    expect(find.textContaining('هذه الشاشة متاحة للمسؤولين والمحللين فقط'), findsOneWidget);
    expect(find.textContaining('بيانات العرض التوضيحي ليست إحصاءات رسمية'), findsOneWidget);

    await _scrollTo(tester, find.byType(FilledButton));

    expect(find.text('رفع ومعالجة'), findsOneWidget);
  });

  testWidgets('explains the CSV template requirement and shows the template', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        retry: noAutomaticRetry,
        child: const MaterialApp(home: DatasetUploadScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.textContaining('CSV files must follow the Decidix template'),
      findsOneWidget,
    );

    await tester.tap(find.text('View CSV template'));
    await tester.pumpAndSettle();

    expect(find.text('Decidix dataset CSV template'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is SelectableText &&
            (widget.data ?? '').contains('#decidix-csv: v1'),
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is SelectableText &&
            (widget.data ?? '').contains('region_id,region_name'),
      ),
      findsOneWidget,
    );

    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
    expect(find.text('Decidix dataset CSV template'), findsNothing);
  });

  testWidgets('offers the CSV template in Arabic', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        retry: noAutomaticRetry,
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: DatasetUploadScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('عرض قالب CSV'), findsOneWidget);
    expect(
      find.textContaining('ملفات CSV يجب أن تتبع قالب Decidix'),
      findsOneWidget,
    );
  });
}
