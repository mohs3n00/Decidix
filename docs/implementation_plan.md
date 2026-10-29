# Decidix — خطة تنفيذ الـ UI في Flutter (جاهز لربط الـ API)

> المرجع: ملف Figma «Decidix – Mobile App UI (Editable)» بعد التعديلات (18 شاشة + Chip/Badge/Avatar + 23 text style).
> النطاق: جزء Flutter بس. الـ Backend مسؤولية فريق تاني، وبينّا **عقد API** (القسم 3).

---

## الحالة (اتحدّثت 2026-10-28)

| المرحلة | الحالة |
|---|---|
| 1. Design tokens + shared widgets | ✅ |
| 2. عقد الـ API + ملفات mock JSON (`docs/api_contract.md`) | ✅ |
| 3. طبقة الـ data (`lib/api/`: models, transports, repositories, flag `USE_MOCK`) | ✅ |
| 4. الشاشات: الـ 18 شاشة على `lib/api/`، والطبقة القديمة اتمسحت | ✅ |
| 5. الاختبارات: 147 test، و`flutter analyze` من غير أي issue | ✅ |
| 6. الربط الفعلي مع staging | ⏳ مستني الباك والقرارات المفتوحة في §6 |

> القسم 0 تحت وصف الوضع **قبل** البدء.

---

## 0. الوضع الحالي للمشروع (اتشيّك 2026-10-28)

| البند | الحالة |
|---|---|
| الهيكل | feature-first: `overview / insights / intelligence / decisions` وكل feature فيها `data/` و `presentation/` ✅ |
| State / Routing / HTTP | Riverpod 3 + go_router 18 + dio 5 ✅ |
| الشاشات | الـ 18 شاشة موجودين ومتوصّلين بالـ router ✅ |
| الترجمة | EN/AR + تبديل اللغة (Outfit للإنجليزي، Cairo للعربي) ✅ |
| الاختبارات | 9 widget tests كلهم ناجحين ✅ |
| `flutter analyze` | 24 info بس (`withOpacity` deprecated) |
| Repositories | فيه abstract class لكل feature، بس **كل الـ providers راجعة Mock** ⚠️ |
| `ApiClient` | موجود بس **مش مستخدم في أي مكان**، ومفيهوش error mapping ولا auth ولا `Accept-Language` ⚠️ |
| Models | بعضها فيه `fromJson` (Sector, Projects, Reports, Comparison)، والباقي لأ (`DashboardData`, `NationalIndex`, `KpiMetric`, `RegionSummary`, `TrendPoint`, Predictions, Assistant, …) ⚠️ |
| `runSimulation` | **synchronous** ومحسوب محلياً، لازم يبقى `Future` من السيرفر ⚠️ |
| البيانات الـ mock | سعودية (Riyadh, Jazan, SAR)، والـ Figma بيعرض مناطق تانية (Frontier, Delta, Steppe…) و `$` ⚠️ |
| نصوص الشاشات | مختلفة عن الـ Figma (مثلاً `Education & Talent Index` بدل `Education Analytics`) ⚠️ |
| بعض الـ models | فيها قيم متنسّقة كـ String (`'SAR 780M'`, `'Q4 2027'`) بدل أرقام وتواريخ ⚠️ |

**الخلاصة:** مش هنبدأ من الصفر. الشغل هو **(أ)** نطابق الـ UI مع الـ Figma، و**(ب)** نجهّز طبقة الـ data عشان تقلب من Mock لـ API بـ flag واحد.

---

## 1. Design System (من الـ Figma للكود) — يومين تقريباً

### 1.1 Tokens
- `AppColors`: مطابقة الـ 11 variable اللي في `Decidix Colors`:
  - `warning` في الكود `#F59E0B` وفي الـ Figma `#F5A524` → نخليه زي الـ Figma.
  - نضيف `track = #EAF0F8` (خلفية الـ progress bars والـ rings).
  - نشيل الـ aliases المكررة (`secondaryText` = `ink`، `borderSubtle` = `line`) أو نخليها تشاور عليهم.
- `AppTypography`: نعمل getter لكل واحد من الـ 23 text style بنفس الأسامي:
  `headingPage 34/36 Light -2.5%`، `numberL 28 Medium -2.5%`، `headingSection 17 SemiBold`، `titleM 16/22`، `titleS 15`، `bodyM 14/22.75`، `labelL 14 Medium`، `bodyS 13`، `labelM 13 Medium`، `caption 12`، `overlineM 12 Medium +14% UPPER`، `micro 11`… إلخ.
  - في العربي نفس الأحجام بخط Cairo. الـ letterSpacing والـ UPPER يتلغوا في العربي.
- `AppRadius`: `12` (عناصر داخلية)، `18` (كروت)، `22`، `44` (avatar)، `999` (pill).
- `AppSpacing`: gutter الشاشة 20، المسافة بين الأقسام 20، بين عنوان القسم والكارت 12، padding الكارت 16–17.
- `AppShadows`: shadow الكارت والـ chip المختار والـ nav bar.
- نصلّح الـ 24 `withOpacity` → `withValues(alpha:)`.

### 1.2 Shared widgets (`lib/shared/widgets/`)
كل widget هنا **بيستقبل data جاهزة بس**، ومفيهوش أي منطق تحميل.

| Widget | من الـ Figma | ملاحظات |
|---|---|---|
| `DecidixChip` + `ChipScrollRow` | Chip (Active/Inactive) | ارتفاع ثابت 32. الصف فيه horizontal scroll و fade على الأطراف، و **auto-scroll للـ chip المختار** (`Scrollable.ensureVisible`) |
| `StatusBadge` | Badge (High/Medium/Low/Info) | enum `Tone` |
| `AccountAvatar` | Avatar | |
| `ScoreRing` | Ring · NN | progress + لون حسب الـ tone |
| `GaugeCard` | Development Index | arc + الرقم + الـ subtitle **تحت** الـ arc |
| `KpiCard` | KPI · Education… | value + unit + `DeltaPill` + sparkline |
| `DeltaPill` | Delta | سهم فوق/تحت + لون |
| `Sparkline` / `TrendChart` / `BarChart` | Line chart / Enrolment bars | باستخدام `fl_chart` |
| `ProgressRow` | Key indicators | |
| `RankingList` | Regional ranking | مع toggle Top/Bottom |
| `AiInsightCard` | AI insight / Gap analysis / Simulation note | الـ label بيتغير حسب الشاشة |
| `SectionHeader` | Section header | عنوان + action اختياري ("See all") |
| `DecidixBottomNav` | Tab bar (notch) | موجود، بس لازم نطابقه |
| `SelectField` | Region select / Picker A/B | فيه chevron |
| **States** | — | `LoadingSkeleton`، `ErrorView(onRetry)`، `EmptyView` — **ضروري عشان الـ API** |

---

## 2. طبقة الـ Data (جاهزة للـ API) — 3 أيام تقريباً

### 2.1 الهيكل لكل feature
```
features/<feature>/data/
  models/            ← كل model فيه fromJson / toJson
  sources/
    <feature>_remote_source.dart   ← بيكلّم ApiClient
    <feature>_mock_source.dart     ← بيقرا assets/mock/<feature>/*.json
  repositories/
    <feature>_repository.dart      ← abstract (موجود)
    <feature>_repository_impl.dart ← بياخد source واحد وبيرجّع models
```
- **الـ mock بيقرا JSON من assets** وبيعمل parse بنفس `fromJson`. يعني الـ parsing بيتختبر من أول يوم، ولما الـ API يجهز مفيش كود جديد.
- التبديل بـ flag واحد:
  ```bash
  flutter run --dart-define=USE_MOCK=true
  flutter run --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://staging.api...
  ```
  ```dart
  const useMock = bool.fromEnvironment('USE_MOCK', defaultValue: true);
  final overviewSourceProvider = Provider<OverviewSource>((ref) =>
      useMock ? OverviewMockSource() : OverviewRemoteSource(ref.watch(apiClientProvider)));
  ```

### 2.2 `ApiClient`
- **Interceptors:**
  - `AuthInterceptor`: يحط `Authorization: Bearer <token>` (الـ token متخزن بعيد عن الـ UI. هنحدد التخزين لما الـ auth يتقرر، شوف §6).
  - `LocaleInterceptor`: يحط `Accept-Language: ar|en` من `localeNotifierProvider`.
  - `ErrorInterceptor`: يحوّل `DioException` لـ `AppException`:
    `NetworkException` (مفيش نت / timeout)، `UnauthorizedException` (401)، `NotFoundException` (404)، `ValidationException` (422 + field errors)، `ServerException` (5xx)، `ParseException` (الـ JSON غلط).
  - `LogInterceptor` في الـ debug بس.
- Helper واحد بيفك الـ envelope:
  ```dart
  Future<T> getData<T>(String path, T Function(Object? json) parse, {Map<String, dynamic>? query});
  ```

### 2.3 Models — قواعد ثابتة
- **أرقام خام من السيرفر، والتنسيق في الـ UI:** `budget: 24000000` + `currency: "USD"` بدل `'$24M'`، و `due_date: "2026-03-01"` بدل `'Mar 2026'`. نعمل `Formatters` (compact number, currency, percent, date) باستخدام `intl` وحسب اللغة.
- الـ enums (`tone`, `status`, `sector`, `priority`) تتعمل parse بـ fallback آمن (`unknown`) عشان قيمة جديدة من السيرفر ما توقعش التطبيق.
- الـ models اللي محتاجة `fromJson`: `DashboardData`, `NationalIndex`, `KpiMetric`, `TrendPoint`, `RegionSummary`, `RegionDetail`, `RegionMapPoint`, `MlPredictionData`, `ChatMessage`, `Recommendation`, `SimulationScenario`/`SimulationResult`, `HistoricalAnalysisData`, `PriorityRegionItem`, `DataQualityReport`.
- هنكتب الـ `fromJson` يدوي زي الموجود حالياً (من غير build_runner). لو عدد الـ models زاد كتير ممكن ننقل لـ `json_serializable` بعدين.

### 2.4 Controllers
- كل شاشة بـ `AsyncNotifier` / `FutureProvider.family` (بالـ filter أو الـ range أو الـ id).
- الـ UI بيستعمل `AsyncValue.when(loading: Skeleton, error: ErrorView(retry: ref.invalidate), data: …)`.
- Pull-to-refresh على كل شاشة فيها بيانات.
- **Simulator:** `runSimulation` يبقى `Future<SimulationResult>` + debounce 300ms على الـ sliders + نلغي الطلب القديم (`CancelToken`).
- **Citizen Reports like:** optimistic update، ولو فشل نرجّع القيمة.
- **Assistant:** `sendMessage` بيضيف رسالة المستخدم فوراً + typing indicator لحد ما الرد يوصل.

---

## 3. عقد الـ API مع الـ Backend — يتعمل **أول حاجة** ويتبعت لهم

هنعمل `docs/api_contract.md` + ملفات `assets/mock/**/*.json`، وهي نفسها الأمثلة اللي في العقد.

**قواعد عامة نتفق عليها:**
- Envelope: `{ "data": ..., "meta": { "page": 1, "per_page": 20, "total": 120 } }`. والأخطاء: `{ "error": { "code": "...", "message": "...", "fields": {} } }`.
- `snake_case` في الـ JSON، والتواريخ ISO-8601، والأرقام أرقام مش نصوص.
- اللغة: إما `Accept-Language` والسيرفر يرجّع نص واحد، أو السيرفر يرجّع `name` و `name_ar`. **قرار مطلوب** (الكود الحالي ماشي بالطريقة التانية).
- Pagination في `regions` و `projects` و `citizen-reports`.

| الشاشة | Method & Path | Params | بيرجع |
|---|---|---|---|
| 01 Dashboard | `GET /overview` | `range=3Y\|5Y\|7Y` | index, stats, 4 KPIs + sparkline, trend, needs-attention (3), ai_insight |
| 02 Map | `GET /regions/map-points` | `sector=overall\|education\|…` | id, name, score, lat/lng أو x/y, tone |
| 03 Regions | `GET /regions` | `q`, `priority=all\|high\|medium\|low`, `page` | قائمة RegionSummary |
| 04 Region Profile | `GET /regions/{id}` | — | header, sector bars, history (region + national), ai_insight, data_quality |
| 05–08 Sectors | `GET /insights/{sector}` | — | 4 KPIs, trend, breakdown bars, key indicators, ranking (top/bottom), ai_insight |
| 09 Compare | `GET /insights/comparison` | `a`, `b` | scores + 5 metrics + gap_analysis |
| 10 Historical | `GET /insights/historical` | `sector`, `range` | trend, annual change, milestones |
| 11 Priority | `GET /insights/priority` | — | counts + priority queue |
| 12 Data Quality | `GET /insights/data-quality` | — | score, completeness/timeliness/accuracy, coverage, sources |
| 13 Predictions | `GET /intelligence/predictions` | `year` | forecast + confidence band, model performance, likely improvers |
| 14 Assistant | `POST /intelligence/assistant/chat` | `{message, conversation_id?}` | `{reply, table?, sources[]}` *(streaming؟ §6)* |
| 15 Recommendations | `GET /intelligence/recommendations` + `POST …/{id}/accept` + `POST …/{id}/dismiss` | `filter` | قائمة + impact, cost, confidence |
| 16 Simulator | `POST /decisions/simulate` | `{region_id, allocations{}}` | today, projected, delta, note |
| 17 Projects | `GET /decisions/projects` | `status`, `page` | counts + قائمة |
| 18 Citizen Reports | `GET /decisions/citizen-reports` + `POST …/{id}/like` | `category`, `status`, `page` | stats + قائمة |

---

## 4. تنفيذ الشاشات على الـ Figma — 6 لـ 8 أيام

لكل شاشة: **نطابقها مع الـ Figma → نربطها بالـ controller → نعمل loading/error/empty → refresh → نحدّث الـ test.**

| الترتيب | المجموعة | الشاشات | ملاحظات |
|---|---|---|---|
| 1 | Shell | Top bar، Chips، Bottom nav | بتأثر على كل الشاشات، فتتعمل الأول |
| 2 | Overview | 01 Dashboard، 02 Map، 03 Regions، 04 Region Profile | الـ Dashboard هو المرجع لباقي الـ widgets |
| 3 | Insights | 05–08 (**template واحد** `SectorScreen(sector)`)، 09، 10، 11، 12 | الـ 4 شاشات القطاعات نفس الشكل، فنعمل widget واحد ونشيل التكرار |
| 4 | Intelligence | 13 Predictions، 14 Assistant، 15 Recommendations | الـ Assistant فيه state محلي (المحادثة) |
| 5 | Decisions | 16 Simulator، 17 Projects، 18 Citizen Reports | الـ Simulator بيبعت طلبات عالسيرفر مع debounce |

**نقاط لازم ناخد بالنا منها:**
- **RTL:** استعمل `EdgeInsetsDirectional` و `AlignmentDirectional`، والأسهم والـ chevrons تتعكس، والـ charts تفضل LTR.
- الـ chips بتعمل scroll للـ chip المختار (المشكلة اللي اتصلّحت في الـ Figma).
- الأرقام والعملة والتواريخ من `Formatters` بس، ومحدش يكتبها hardcoded في الـ widgets.
- كل النصوص الثابتة تتنقل لـ `AppLocalizations`، والنصوص اللي جاية من السيرفر ما تتترجمش في الكود.
- Tap targets ≥ 44px، و `Semantics` للأيقونات والـ rings.

---

## 5. الاختبارات — شغالة جنب كل مرحلة

- **Unit (models):** كل `fromJson` يتختبر على ملف الـ mock JSON بتاعه، وكمان حالات: حقل ناقص، enum غير معروف، null.
- **Unit (repository/source):** `ApiClient` بـ `HttpClientAdapter` وهمي: نجاح، 401، 500، timeout، JSON بايظ → الـ exception الصح.
- **Widget:** نحدّث الـ 9 الموجودين على نصوص الـ Figma الجديدة، ونضيف لكل شاشة اختبار للـ loading والـ error/retry والـ data.
- **قبل التسليم:** `flutter analyze` = 0 issues، و `flutter test` كله أخضر، وتشغيل بـ `USE_MOCK=false` على staging.

---

## 6. قرارات مطلوبة قبل/أثناء التنفيذ

1. **البلد والبيانات:** الـ mock سعودي (Riyadh, SAR, `api.decidix.gov.sa`) والـ Figma فيه مناطق تانية و `$` على خريطة مصر. نمشي على أنهي؟
2. **الـ Auth:** الـ Figma مفيهوش login. هل فيه تسجيل دخول؟ (OAuth/SSO ولا email/password؟) وده بيحدد `AuthInterceptor` وتخزين الـ token.
3. **اللغة في الـ API:** `Accept-Language` ولا `name` + `name_ar`؟
4. **الخريطة:** `flutter_map` بـ tiles (محتاج lat/lng ومزوّد tiles) ولا خريطة SVG مرسومة زي الـ Figma (محتاج x/y)؟
5. **الـ Assistant:** الرد يوصل مرة واحدة ولا streaming (SSE)؟
6. **Recommendations:** "Add to plan" بيعمل إيه في الـ backend؟ وهل فيه شاشة "My plan"؟
7. **Offline/cache:** هل لازم آخر بيانات تظهر من غير نت؟ (ممكن `shared_preferences` أو cache بسيط على مستوى الـ repository.)

---

## 7. الترتيب والمدة التقريبية

| # | المرحلة | المدة | بيعتمد على |
|---|---|---|---|
| 1 | Design tokens + shared widgets | ~2 يوم | — |
| 2 | العقد + ملفات mock JSON → يتبعت للـ backend | ~1 يوم | قرارات §6 (1، 3) |
| 3 | طبقة الـ data (ApiClient، sources، models، flag) | ~2–3 أيام | المرحلة 2 |
| 4 | الشاشات (5 مجموعات) | ~6–8 أيام | 1 + 3 |
| 5 | الاختبارات (مع كل مرحلة) + تنضيف | ~1–2 يوم | — |
| 6 | الربط الفعلي مع staging | ~1–2 يوم | الـ backend يكون جاهز |

**المجموع:** حوالي 3 أسابيع لمطوّر Flutter واحد. المراحل 1 لـ 5 ما بتستناش الـ backend خالص، لأن كلها شغالة على الـ mock JSON.
