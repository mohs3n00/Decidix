import 'package:flutter/foundation.dart'
    show LicenseEntryWithLineBreaks, LicenseRegistry;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/provider_retry.dart';
import 'core/localization/app_localizations.dart';
import 'core/localization/locale_controller.dart';
import 'core/notifications/notification_service.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

/// The fonts are under the SIL Open Font License, which asks for the licence
/// to travel with them: it is listed on the app's licences page.
void _registerFontLicenses() {
  LicenseRegistry.addLicense(() async* {
    for (final (name, file) in const [
      ('Outfit', 'OFL-Outfit.txt'),
      ('Cairo', 'OFL-Cairo.txt'),
    ]) {
      yield LicenseEntryWithLineBreaks([
        name,
      ], await rootBundle.loadString('assets/fonts/$file'));
    }
  });
}

/// The largest text scale the app follows from the system setting.
const double maxTextScale = 1.3;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  _registerFontLicenses();
  runApp(ProviderScope(retry: noAutomaticRetry, child: const DecidixApp()));
}

class DecidixApp extends ConsumerStatefulWidget {
  const DecidixApp({super.key});

  @override
  ConsumerState<DecidixApp> createState() => _DecidixAppState();
}

class _DecidixAppState extends ConsumerState<DecidixApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final router = ref.read(appRouterProvider);
      ref.read(notificationServiceProvider).initialize(
        onNavigate: (route) {
          router.go(route);
        },
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeNotifierProvider);

    return MaterialApp.router(
      title: 'Decidix',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getTheme(locale),
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('ar')],
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: router,
      // The user's text size is followed up to 1.3x; beyond that the layouts
      // (chips, tab bar, stat tiles) would break.
      builder: (context, child) => MediaQuery.withClampedTextScaling(
        maxScaleFactor: maxTextScale,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
