---
name: flutter-development
description: Develop and validate the Decidix Android/iOS Flutter application while preserving its repository, API-contract, and Arabic RTL conventions.
---

# Decidix Flutter Development

Use for the mobile app only.

- Inspect `pubspec.yaml`, `lib/`, `test/`, `env/`, and `docs/api_contract.md` before changes.
- Preserve feature-first organization, repository-based data access, Riverpod, go_router, and Dio unless an approved architecture decision changes them.
- Treat API data as untrusted: parse safely, display loading/error/empty states, and keep formatting in the UI layer.
- Verify English and Arabic/RTL behavior, localization, accessibility, and supported text scaling.
- Never embed backend, OpenRouter, database, Appwrite, or ML secrets in the application.
- Run focused Flutter analysis/tests for changed behavior; do not create web or admin interfaces.
