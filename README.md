# Decidix

National development intelligence for decision makers. A mobile app (Android
and iOS) in Flutter, in English and Arabic (right to left).

It runs today on **mock data** in `assets/mock`, shaped exactly like the API in
[docs/api_contract.md](docs/api_contract.md). Moving to the real backend is a
setting, not a rewrite (see below).

## Run

Needs Flutter (stable) and Dart 3.13 or newer.

    flutter pub get
    flutter run --dart-define-from-file=env/dev.json

| Command | What it does |
|---|---|
| `flutter analyze` | Static checks. Must be clean |
| `flutter test` | All tests (about 185) |
| `dart format lib test` | Formatting. CI fails on unformatted code |
| `flutter build appbundle --release --dart-define-from-file=env/prod.json` | Store build (needs the signing key) |

Environments, the settings they hold and the signing key are explained in
[env/README.md](env/README.md).

## Use the real API

1. Put the real addresses in `env/staging.json` and `env/prod.json` (they hold
   placeholders) and set `USE_MOCK` to `false`.
2. Run against it. The app does not change: every screen reads from a
   repository in `lib/api`, and only the transport behind them differs.
3. If a response differs from the contract, the parsing in `lib/api/models`
   fails with a clear `ParseException` naming the field. Fix the contract or
   the model, then the mock file next to it.

## Where things are

    lib/
      api/            models (safe parsing), transports (Dio / mock), repositories
      core/           colours, radii, type, theme, routing, localization, network
      features/       overview, insights, intelligence, decisions
                      each with presentation/{controllers,screens,widgets}
      shared/         widgets used by more than one feature, paging
    assets/           fonts (bundled, nothing is downloaded), icons, mock JSON
    docs/             API contract, design system, plans
    env/              one settings file per environment
    test/             unit, screen, contract, localization and layout tests

State is Riverpod, navigation is go_router, HTTP is Dio, the map is flutter_map.

## Design

The visual language is in [docs/design_system.md](docs/design_system.md):
tokens (colour, radius, shadow, type), the shared widgets and how to look at a
screen without a device:

    RENDER_OUT=some/folder flutter test test/tool/render_screens_test.dart
    RENDER_LANG=ar RENDER_OUT=some/folder flutter test test/tool/render_screens_test.dart

That writes a PNG per screen. The launcher icon and splash screen are drawn
from the logo the same way (`test/tool/render_icon_test.dart`, then
`dart run flutter_launcher_icons` and `dart run flutter_native_splash:create`).

## What is not here yet

- Login (planned with Clerk), notifications and the account page.
- The real API addresses, and a map tile provider for a launched app (the
  public OpenStreetMap server is for development only).
- Crash reporting (decided against for now).
- Release signing: create the key and `android/key.properties` as described in
  [env/README.md](env/README.md).

The text size follows the system setting up to 1.3x.
