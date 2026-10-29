class AppConfig {
  AppConfig._();

  /// `true` (default) serves the files in assets/mock; `false` calls the real API.
  ///
  /// flutter run --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://...
  static const bool useMock = bool.fromEnvironment('USE_MOCK', defaultValue: true);

  /// Where the map tiles come from. The default is the public OpenStreetMap
  /// server, which is fine for development but not for a launched app. For a
  /// style like Google's, use a provider such as MapTiler or Mapbox:
  ///
  /// --dart-define=MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY
  /// --dart-define=MAP_ATTRIBUTION="© MapTiler © OpenStreetMap contributors"
  static const String mapTileUrl = String.fromEnvironment(
    'MAP_TILE_URL',
    defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  );

  /// Shown on the map. Every tile provider requires it.
  static const String mapAttribution = String.fromEnvironment(
    'MAP_ATTRIBUTION',
    defaultValue: '© OpenStreetMap contributors',
  );
}
