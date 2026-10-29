import 'package:flutter/foundation.dart' show LicenseEntryWithLineBreaks, LicenseRegistry;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config/provider_retry.dart';
import 'core/localization/app_localizations.dart';
import 'core/localization/locale_controller.dart';
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
      yield LicenseEntryWithLineBreaks(
        [name],
        await rootBundle.loadString('assets/fonts/$file'),
      );
    }
  });
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  _registerFontLicenses();
  runApp(
    ProviderScope(
      retry: noAutomaticRetry,
      child: const DecidixApp(),
    ),
  );
}

class DecidixApp extends ConsumerWidget {
  const DecidixApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeNotifierProvider);

    return MaterialApp.router(
      title: 'Decidix',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getTheme(locale),
      locale: locale,
      supportedLocales: const [
        Locale('en'),
        Locale('ar'),
      ],
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: router,
    );
  }
}
