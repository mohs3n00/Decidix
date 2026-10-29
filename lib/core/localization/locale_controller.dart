import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String _prefLocaleKey = 'app_locale';

final localeNotifierProvider = NotifierProvider<LocaleNotifier, Locale>(
  LocaleNotifier.new,
);

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    _loadPersistedLocale();
    return const Locale('en');
  }

  Future<void> _loadPersistedLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_prefLocaleKey);
      if (code != null && (code == 'en' || code == 'ar')) {
        state = Locale(code);
      }
    } catch (_) {
      // Fallback to default en
    }
  }

  Future<void> setLocale(Locale newLocale) async {
    if (state.languageCode == newLocale.languageCode) return;
    state = newLocale;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefLocaleKey, newLocale.languageCode);
    } catch (_) {}
  }

  Future<void> toggleLocale() async {
    final next = state.languageCode == 'ar'
        ? const Locale('en')
        : const Locale('ar');
    await setLocale(next);
  }
}
