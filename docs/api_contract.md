# Decidix Mobile API Contract (v1, proposal)

For the backend team. Every response in this document has a matching example file in
[`assets/mock/`](../assets/mock). The Flutter app runs on those files today, so **the real API must
return the same shapes**. If you need to change a shape, change the example file and this document in
the same pull request.

The examples use the data shown in the Figma design (12 fictional regions, USD).

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `https://<host>/v1`. The app takes it from `--dart-define=API_BASE_URL=...` |
| Format | JSON, UTF-8. `Content-Type: application/json` and `Accept: application/json` |
| Keys | `snake_case`, always |
| Success | `200` with `{ "data": ..., "meta": { ... } }`. `meta` only on paginated lists |
| Errors | non-2xx with `{ "error": { "code": "string", "message": "string", "fields": { "field": "reason" } } }`. `fields` only on `422` |
| Numbers | Raw numbers, never formatted strings. `18000000`, not `"$18M"`. The app formats them |
| Percentages | Numbers from **0 to 100**: `94`, not `0.94`. This includes `confidence`, `progress`, `resolved_rate` |
| Money | `{ "amount": 18000000, "currency": "USD" }`. `amount` is in whole currency units |
| Population | Integer people: `2200000` |
| Dates | ISO 8601. Date only for calendar dates (`"2026-03-31"`), full UTC timestamp for moments (`"2025-11-03T10:00:00Z"`) |
| Years | Integers: `2025`. Reporting period as string: `"2025-Q4"` |
| Ids | Lowercase slugs: `"central_capital"`, `"frontier"` |
| Enums | Lowercase snake_case strings. **The app treats an unknown value as a safe default and must not crash**, so adding a value is not a breaking change |
| Auth | `Authorization: Bearer <token>`. Sign-in uses **backend-managed JWT** (standard `HS256` signed by backend) with refresh token rotation. The client sends the Bearer token in the header. Requests on public endpoints require no token |

### Language

Two kinds of text, two rules:

1. **Stored content** (region names, titles, summaries, insights, milestones, sources) comes as a pair:
   `name` + `arabic_name`, `text` + `arabic_text`. The app shows one or the other, so switching language
   needs no new request.
   - Rule: if a key starts with `arabic_`, the same key without the prefix must exist next to it.
   - Technical identifiers (ids, enum values, currency codes) are never translated.
2. **Generated content** (the assistant's reply) is written in the language the app sends in the
   request (`"language": "en" | "ar"`). Single `text` field.

Screen titles, tab names, section titles and unit names (for example "Key indicators", "yrs") are **not**
in the API. They live in the app's own translation files and are chosen by `key` / `unit`.

### Meaning of `change`

| Where | Unit | Example |
|---|---|---|
| `index.change`, region `change`, `top_improvers[].delta`, annual change | index **points** | `2.3` |
| KPI / metric `change` | **percent** change against the previous period | `1.8` |

The sign is the direction of the number. Whether that direction is good depends on `higher_is_better`
(unemployment falling is good), so the app never guesses.

### Pagination

Query: `page` (default 1) and `per_page` (default 20, max 100). Response `meta`:
`{ "page": 1, "per_page": 20, "total": 12 }`.

### Shared shapes

```jsonc
// Metric (KPI cards and sector screens)
{ "key": "literacy_rate", "label": "Literacy rate", "arabic_label": "...",
  "value": 96.2, "unit": "percent", "change": 0.6, "higher_is_better": true,
  "sparkline": [65.8, 66.5, 67.9] }          // sparkline only where the design shows one

// unit: score_100 | percent | years | per_mille | per_thousand | pupils_per_teacher | usd

// Trend point
{ "year": 2019, "value": 58.2 }

// Region reference inside other resources
{ "region_id": "frontier", "name": "Frontier", "arabic_name": "..." }

// Text pair
{ "text": "...", "arabic_text": "..." }
```

`priority`: `critical | high | medium | low`. It means how urgently the region needs help, so a well
developed region is `low`.

---

## 2. Endpoints

Screen numbers match the Figma file. **Mock file** is under `assets/mock/`.

### Overview

| # | Screen | Request | Mock file |
|---|---|---|---|
| 01 | Dashboard | `GET /overview?range=3Y\|5Y\|7Y` | `overview/overview.json` |
| 02 | Interactive Map | `GET /regions/map-points?sector=overall\|education\|healthcare\|economy\|infrastructure` | `overview/map_points.json` |
| 03 | Regions | `GET /regions?q=&priority=all\|high\|medium\|low&page=&per_page=` | `overview/regions.json` |
| 04 | Region Profile | `GET /regions/{id}` | `overview/region_delta.json` |

- **Dashboard**: `trend.points` covers the requested `range` (3Y is 3 points, 7Y is 7 points).
  `needs_attention` is the 3 lowest-scoring regions. "See all" opens `GET /regions?priority=high`.
  `index.band` is `low | moderate_low | moderate | moderate_high | high`; the app writes the words.
- **Map**: `sector` changes `score` and `priority` of each point. Coordinates are WGS84.
- **Regions**: search `q` matches `name` and `arabic_name`. Sorted by `rank`.
- **Region Profile**: `history.region` and `history.national` have the same years.
  `domains` has one entry per domain.

### Insights

| # | Screen | Request | Mock file |
|---|---|---|---|
| 05 | Education | `GET /insights/education` | `insights/education.json` |
| 06 | Healthcare | `GET /insights/healthcare` | `insights/healthcare.json` |
| 07 | Economy | `GET /insights/economy` | `insights/economy.json` |
| 08 | Infrastructure | `GET /insights/infrastructure` | `insights/infrastructure.json` |
| 09 | Compare | `GET /insights/comparison?a={id}&b={id}` | `insights/comparison.json` |
| 10 | Historical | `GET /insights/historical?sector=overall\|education\|healthcare\|economy&range=` | `insights/historical.json` |
| 11 | Priority | `GET /insights/priority?limit=` | `insights/priority.json` |
| 12 | Data Quality | `GET /insights/data-quality` | `insights/data_quality.json` |

- The four sector screens share **one shape** (`kpis`, `trend`, `breakdown`, `indicators`, `ranking`,
  `ai_insight`), so the app has one screen template for all of them.
- `ranking.top` is best first, `ranking.bottom` is worst first. 5 items each.
- **Compare**: `metrics` has `overall` first, then the four domains.
- **Priority**: `queue` is sorted by `need_score`, highest first.
- **Data Quality**: `sources[].age_days` is how old the last sync is, so the app needs no clock
  comparison. `status` is `synced | overdue`.

### Intelligence

| # | Screen | Request | Mock file |
|---|---|---|---|
| 13 | ML Predictions | `GET /intelligence/predictions?target_year=2027\|2028\|2030&validation_status=simulated\|experimental` | `intelligence/predictions.json` |
| 14 | AI Assistant | `POST /intelligence/assistant/chat` | `intelligence/assistant_chat.json` |
| 15 | Recommendations | `GET /intelligence/recommendations?priority=` | `intelligence/recommendations.json` |
| 15 | Add to plan | `POST /intelligence/recommendations/{id}/accept` | `intelligence/recommendation_accept.json` |
| 15 | Dismiss (✕) | `POST /intelligence/recommendations/{id}/dismiss` | same shape, `status: "dismissed"` |

- **Predictions**: `series` mixes `actual` and `forecast` points. `lower`/`upper` are `null` for
  actual points. The series ends at `target_year`.
- **Forecast classification (additive):** every predictions response carries
  `forecast_classification: { source, is_simulated, is_official, is_calibrated, validation_status,
  disclaimer_en, disclaimer_ar }`. The scenario series is `source: "simulated_scenario"` with
  `is_simulated: true`, `is_official: false`, `is_calibrated: false`; the ML series stays
  `validation_status: "experimental"`. Clients must render the disclaimer and must not describe
  either series as an official projection.
- **Provenance (additive):** analytical responses may carry `provenance` with
  `data_classification`, source and dataset version, observation period,
  method, verification status, and bilingual disclaimer. Synthetic fixtures
  are `synthetic_demonstration` and are not official observations.
- **Model metrics:** `models[].r2` is nullable. It must be `null` when a
  reproducible out-of-sample evaluation artifact is unavailable; clients must
  display an unavailable state rather than an accuracy claim.
- **Top improvers:** `top_improvers` is empty unless at least two verified
  historical observations exist for each region under comparison. Forecast
  scenarios and synthetic fixture history cannot produce observed rankings.
- **`validation_status` values:** `simulated` (default) and `experimental`. The former `validated`
  value is a **deprecated alias** accepted for backward compatibility and normalised to `simulated`;
  it is never returned.
- **Assistant** request body:
  ```json
  { "message": "Which region needs help most?", "language": "en", "conversation_id": null }
  ```
  `conversation_id` is `null` for the first message; the response returns the id to reuse.
  `reply.table` is optional (`null` when the answer has no table). Replies are not streamed in v1.

  Every answer also carries provenance at the top level. `answer_source` is `model` (a real `:free`
  completion that passed grounded-citation validation), `deterministic_fallback` (the offline answer
  extracted from the retrieved records), or `refusal` (insufficient evidence). `provider_status` explains a
  fallback — `rate_limited`, `payment_required`, `timeout`, `unavailable`, `citations_rejected`,
  `not_configured` — and is `null` when the model answered. Clients must label a deterministic fallback as
  an evidence-extracted summary and never present it as model output.
- **Recommendations**: `status` is `suggested | in_plan | dismissed`. The list returns
  `suggested` items only.

### Decisions

| # | Screen | Request | Mock file |
|---|---|---|---|
| 16 | What-If Simulator | `POST /decisions/simulate` | `decisions/simulate.json` |
| 17 | Development Projects | `GET /decisions/projects?status=all\|in_progress\|planned\|delayed\|completed&page=` | `decisions/projects.json` |
| 18 | Citizen Reports | `GET /decisions/citizen-reports?category=all\|roads\|health\|schools\|water&status=&page=` | `decisions/citizen_reports.json` |
| 18 | Like | `POST /decisions/citizen-reports/{id}/like` (toggles) | `decisions/citizen_report_like.json` |

### System & Authentication

| Screen / Feature | Request | Purpose |
|---|---|---|
| Health Check | `GET /health` | Service uptime and dyno readiness probe |
| Detailed Health | `GET /v1/health` | Subsystem status (DB, ML engine, version) |
| User Registration | `POST /v1/auth/register` | Register new user (`name`, `email`, `password`, `role`) returning access & refresh tokens |
| User Login | `POST /v1/auth/login` | Session login returning access token, refresh token, and user profile |
| Token Refresh | `POST /v1/auth/refresh` | Rotate expired access token using refresh token (with reuse detection) |
| User Profile | `GET /v1/auth/me` | Current authenticated user profile and roles (requires `Authorization: Bearer <token>`) |
| User Logout | `POST /v1/auth/logout` | Revoke session and refresh token |
| Admin User List | `GET /v1/admin/users` | List system users (requires `admin` role) |
| Admin Session Revocation | `POST /v1/admin/users/{id}/revoke-sessions` | Revoke all sessions for a user (requires `admin` role) |
| Device Token Registration | `POST /v1/notifications/device-token` | Register or update device push token (`token`, `platform`, `device_model`) |
| Device Token Deactivation | `DELETE /v1/notifications/device-token` | Deactivate device push token on logout (`token`) |
| Send Test Push | `POST /v1/notifications/send-test` | Dispatch test push notification to user (`user_id`, `title`, `body`) (requires `admin` role) |

- **Simulate** request body (amounts in USD, one entry per domain):
  ```json
  { "region_id": "frontier",
    "allocations": { "education": 30000000, "healthcare": 45000000,
                     "infrastructure": 20000000, "economy": 25000000 } }
  ```
  The app calls it on every slider change (debounced by 300 ms), so it should answer in well under a
  second. The app's "Jobs & enterprise" slider is the `economy` domain.
- **Projects**: `status` is `planned | in_progress | delayed | completed`. A completed project has
  `due_date: null` and a `completed_at` date.
- **Citizen reports**: `status` is `under_review | escalated | resolved`. `liked_by_me` is per
  signed-in user. Timestamps are absolute; the app shows "2h ago".

---

## 3. Mock files in the app

- The app reads these files through the same models (`lib/api/models`) the real API uses, so a wrong
  shape fails in a test instead of in production.
- One flag picks the source; nothing else changes:
  ```bash
  flutter run                                                     # mock files (default)
  flutter run --dart-define=USE_MOCK=false \
              --dart-define=API_BASE_URL=https://staging.example.com/v1
  ```
- `MockTransport` behaves like the server for what a screen can reach: filters, search, pagination,
  the dashboard `range`, simulator maths, validation errors (`422` with `fields`), `404`, and likes /
  "Add to plan" (kept in memory). It also moves report timestamps to the real "now".
- Shortcuts in the mock: the assistant always gives the same answer; the map ignores `sector`; history
  ignores `sector` and `range`; predictions ignore `target_year`; profiles and comparisons for regions
  without their own file are built from the Delta example.
- Errors reach the screens as one set of types (`NetworkException`, `UnauthorizedException`,
  `NotFoundException`, `ValidationException`, `ServerException`, `ParseException`), whichever source
  is used.
- `test/api_contract_test.dart` checks every file: valid JSON, `data` envelope, `snake_case` keys, no
  formatted numbers (`"$18M"`), Arabic pairs, and cross-file numbers (12 regions, population adds up,
  every `region_id` exists, simulator gains add up).
- The mock example for a list endpoint shows the first page only.

---

## 4. Things found in the Figma data

These do not block the work, but someone should decide.

1. **Population:** the dashboard says `31.4M`, but the 12 regions on the Regions screen add up to
   `39.6M`. The mock follows the regions (`39,600,000`). Fix the design or the numbers.
2. **Rail is "the weakest network"** in the Infrastructure insight, but sanitation (58) is lower than
   rail (66) in the chart on the same screen.
3. **Priority queue order:** Southern Basin has need score 47, ranked below Riverside with 42. The
   queue is sorted by score, so the mock uses 40 for Southern Basin.
4. **"Active 5" on Projects** counts all 5 projects, including one completed and one planned. The mock
   calls the field `projects_count`.
5. **The map screen uses real names** ("Cairo", "Nile", "Sinai", "Egypt") for fictional regions. If the
   regions are fictional, so should the map be.
6. **"Jobs & enterprise"** (simulator) and **"Economy"** / **"Economy & jobs"** (other screens) are one
   domain with three names. The API uses `economy`.

---

## 5. Decisions

Status: **decided**, **default** (assumed, nobody objected) or **open**.

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | Which country and data set? | **open** | A real country (not named yet), so region names, currency and coordinates change. The mock keeps the Figma data until the backend can send a real sample response |
| 2 | Sign-in | **decided** | Backend-managed JWT with refresh tokens and PostgreSQL user management (Clerk and Appwrite eliminated). The app is pre-wired with `AuthInterceptor` to inject `Authorization: Bearer <token>` automatically |
| 3 | Language in responses | default | Stored content as `x` + `arabic_x` pairs; assistant replies follow `language` |
| 4 | Map | **decided** | A ready Flutter map library showing the points the backend sends (`latitude` / `longitude`): `flutter_map`. The tile source is a setting (`MAP_TILE_URL`), so a Google-like style from MapTiler or Mapbox is a key, not a code change. OpenStreetMap's public server is for development only |
| 5 | Assistant: streaming or one response? | default | One response |
| 6 | "Add to plan" | **decided** | Only sets `status: "in_plan"`; the card leaves the suggestions. There is no "My plan" screen in v1: it is not in the design. If it is added later the backend needs `GET /intelligence/recommendations?status=in_plan` and a way to take an item out of the plan |
| 7 | Offline data | default | No. Every request goes to the server |
| 8 | Push Notifications & FCM | **decided** | Device tokens registered via `POST /v1/notifications/device-token` and cleared via `DELETE /v1/notifications/device-token`. Push dispatch handled via official Firebase Cloud Messaging. |
