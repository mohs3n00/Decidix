import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'strings/app_strings.dart';

/// The app's own texts in English and Arabic. They live in strings/, one file
/// per screen group; test/localization_test.dart checks that both languages
/// have the same keys and that every key used in the code exists.
class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('en'));
  }

  static const _values = <String, Map<String, String>>{
    'en': appStringsEn,
    'ar': appStringsAr,
  };

  /// The text for [key] in the current language; English if it is missing in
  /// that language, and the key itself if it is missing everywhere.
  String tr(String key) {
    return _values[locale.languageCode]?[key] ?? appStringsEn[key] ?? key;
  }
}

class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ar'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(AppLocalizations(locale));
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}

extension LocalizationExtension on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String tr(String key) => l10n.tr(key);
  bool get isRtl => Directionality.of(this) == TextDirection.rtl;
}
