# Decidix — خطة التنفيذ الشاملة

## الغرض والنطاق

هذه الخطة تؤسس التنفيذ المتدرّج لمنصة Decidix: تطبيق Flutter للجوال، Backend بـ Node.js/TypeScript، PostgreSQL كمصدر البيانات الأساسي، خدمات Appwrite مساندة فقط، Python للبيانات وML، ومساعد OpenRouter مبني على RAG من بيانات معتمدة. لا تشمل الخطة إنشاء Web Frontend أو Admin Dashboard.

## ما تم التحقق منه في المستودع

- يوجد تطبيق Flutter منظم في `lib/` مع اختبارات في `test/`، وإعدادات بيئية في `env/`.
- التطبيق يعمل حالياً على mock JSON؛ ويوثق `README.md` و`docs/api_contract.md` عقد API مبدئياً.
- لا يظهر في المستودع الحالي Backend Node.js أو مخطط/ترحيلات PostgreSQL أو تهيئة Appwrite أو Pipeline Python/ML/RAG أو إعداد Heroku.
- لا تعني هذه الملاحظات أن تلك الأنظمة غير موجودة خارج المستودع؛ يلزم تأكيد ذلك قبل البدء في كل مسار.

## الافتراضات والقرارات التي تحتاج تأكيداً

| الموضوع | افتراض التخطيط | قرار مطلوب قبل التنفيذ |
| --- | --- | --- |
| نطاق المنتج | الشاشات والـAPI الحاليان أساس أولي، لا مواصفة نهائية | أدوار المستخدمين، الدول/المناطق، ومؤشرات النجاح ذات الأولوية. |
| الهوية | مصادقة وصلاحيات ستضافان عبر Backend | مزود الهوية، الأدوار، SSO/MFA، وسياسة الجلسات. |
| البيانات | مصادر وطنية/قطاعية متباينة ستدخل عبر Pipeline | قائمة المصادر، التراخيص، ملاك البيانات، ودورية التحديث. |
| Appwrite | خدمة مساندة محددة لا تخزن الكيانات الأساسية | المسؤولية الدقيقة: إشعارات/ملفات/وظيفة أخرى، وحدودها. |
| ML | التنبؤات الحالية تحتاج منهجاً وبيانات معتمدة | حالات الاستخدام، أهداف النماذج، عتبات الاعتماد، ومسؤول المراجعة. |
| RAG | معرفة موثقة وموافق عليها فقط | corpus المعتمد، مستويات الوصول، قواعد الاستشهاد، وسياسة الرفض. |
| النشر | Heroku يستضيف Backend | التطبيقات/الـpipelines، PostgreSQL المدارة، المناطق، DNS، والميزانية. |

## المعمارية المستهدفة

```text
Flutter Android/iOS
        │ HTTPS + versioned API contract
        ▼
Node.js / TypeScript API on Heroku ──► PostgreSQL (authoritative data)
        │                 │
        │                 ├──► Appwrite (approved supporting service only)
        │                 ├──► Python ML inference service/jobs
        │                 └──► OpenRouter API (server-side only)
        │
        └──► RAG retrieval over approved, versioned knowledge index

Python data pipelines ──► governed curated datasets ──► PostgreSQL / ML / RAG index
```

المبادئ: PostgreSQL هو النظام المرجعي للبيانات؛ Node.js هو بوابة الثقة للأجهزة والخدمات؛ Python يعالج البيانات وML؛ وRAG لا يسترجع إلا البيانات المعتمدة بعد تطبيق صلاحيات الوصول.

## تنظيم المستودع المستهدف

اعتمد monorepo تدريجياً بعد مراجعة أثره على Flutter الحالي:

```text
apps/mobile/                 # نقل Flutter فقط عند وجود خطة هجرة آمنة
services/api/                # Node.js + TypeScript
packages/contracts/          # OpenAPI/JSON schemas ومصادر التوليد إن اعتمدت
data/                        # Python ingestion, validation, transformations
ml/                          # training, evaluation, inference contracts
infra/                       # Heroku process/config templates, no secrets
docs/                        # ADRs, contracts, runbooks, data governance
```

إلى أن تقرر الهجرة، يبقى Flutter في جذر المستودع ولا يُنقل لمجرد التنظيم. استخدم `docs/api_contract.md` كمرجع انتقالي، ثم انقل العقد إلى حزمة مشتركة فقط بعد توافق Flutter وBackend.

## المراحل ومعايير القبول

### 0. تحليل المتطلبات وحوكمة القرار

المخرجات: PRD مختصر، user journeys للجوال، مصفوفة الأدوار، قاموس KPI، NFRs، سجل المخاطر، وADRs للقرارات الجوهرية.

معايير القبول:

- مالك المنتج يعتمد نطاق الإصدار الأول وما هو خارج النطاق.
- لكل KPI تعريف، مصدر، دورية، مالك، وصيغة حساب.
- توثق القرارات المفتوحة في جدول مالك/موعد، ولا تبدأ ميزات مبنية على افتراضات غير معتمدة.

### 1. تصميم Architecture وRepository

المخرجات: ADR للحدود، رسم تدفق، اتفاقية versioning، استراتيجية بيئات، وهيكل Repository مع قواعد الملكية.

معايير القبول:

- لكل خدمة مسؤولية واحدة وواجهة واضحة.
- تثبت الوثائق أن PostgreSQL هو مصدر الحقيقة وAppwrite لا يكرر بياناته المرجعية.
- مراجعة هندسية توافق على مسار Flutter ↔ API ↔ بيانات/ML/RAG وخطة الهجرة للـrepo إن لزم.

### 2. Database Schema وData Governance

المخرجات: ERD، migrations أولية، سياسة IDs/audit/retention، roles، وفهارس مبررة.

معايير القبول:

- الكيانات والعلاقات والقيود تغطي نطاق الإصدار الأول مع دعم الترجمة حيث يلزم.
- migrations قابلة للتطبيق والرجوع في staging مع اختبار بيانات واقعي آمن.
- تفويض الوصول وaudit trail وخطة backup/restore موثقة ومجربة.

### 3. Dataset Pipeline

المخرجات: Python pipeline للـingest والتحقق والتحويل والنشر، كتالوج بيانات، وتقارير جودة/lineage.

معايير القبول:

- كل dataset يحمل source/licence/approval/version/owner/freshness.
- فشل الجودة أو schema drift يحجر البيانات ولا ينشرها.
- curated dataset قابل لإعادة الإنتاج، ولا يصل ML أو RAG إلى بيانات غير معتمدة.

### 4. Backend APIs

المخرجات: خدمة TypeScript، OpenAPI/عقد مراجع، authN/authZ، PostgreSQL repositories، health/readiness، وcontract tests.

معايير القبول:

- تتطابق endpoints ذات الأولوية مع العقد المتفق عليه، مع validation وpagination وأخطاء مستقرة.
- جميع الاستعلامات parameterized وتنفذ الصلاحيات قبل القراءة/الكتابة.
- اختبار تكاملي يغطي قواعد العمل، المعاملات، 401/403/422/5xx، وتوافق Flutter.

### 5. تطوير Flutter App

المخرجات: ربط تدريجي للـrepositories الحالية بالـAPI الحقيقي، إدارة جلسة، حالات تحميل/خطأ/فارغ، ودعم RTL.

معايير القبول:

- يبقى `USE_MOCK` صالحاً للتطوير المحلي حتى اكتمال staging.
- يعمل المسار الأساسي بالإنجليزية والعربية مع text scale المدعوم ودون أسرار في العميل.
- تنجح اختبارات الوحدة/widget/contract والتحليل الساكن للبنية المتغيرة.

### 6. ML Models

المخرجات: تعريف مسألة لكل نموذج، datasets/features versioned، تدريب وتقييم، artifact registry، وعقد inference.

معايير القبول:

- وثق baseline وmetrics وcalibration وdrift/fairness المناسبة للحالة.
- inference يعيد model version/confidence وفشل آمن، مع latency target.
- مراجعة مالك المجال توافق على النموذج قبل عرضه للمستخدمين.

### 7. AI Assistant وRAG

المخرجات: ingestion/indexing للمعرفة المعتمدة، retrieval service، OpenRouter gateway خادمي، citations، وevaluation suite.

معايير القبول:

- كل إجابة واقعية تستشهد بمصادر مسترجعة مسموحة للمستخدم.
- يفشل المساعد بأمان عند غياب الدليل أو تضاربه، ويقاوم prompt injection الأساسي.
- تقاس groundedness، دقة الاستشهاد، relevance، latency، والتكلفة على مجموعة تقييم معتمدة.

### 8. التكامل الطرفي

المخرجات: staging E2E، feature flags، observability، وإدارة أخطاء مزودي Appwrite/ML/OpenRouter.

معايير القبول:

- يحافظ تغيير العقد على التوافق أو يمر عبر version/deprecation معتمد.
- اختبارات E2E تغطي مسارات الجوال ذات الأولوية والانقطاع/fallback.
- لا يظهر سر أو بيانات حساسة في الـlogs أو تقارير الأعطال.

### 9. Testing وSecurity

المخرجات: test pyramid، CI gates، threat model، dependency/secret scanning، ونموذج صلاحيات واختبارات اختراق مناسبة.

معايير القبول:

- CI يشغل format/lint/types/tests/contract/migration checks حسب المكون.
- التحقق من authorization، rate limiting، input validation، إدارة الأسرار، والـOWASP relevant findings مغلق أو مقبول رسمياً.
- توجد سياسة خصوصية/احتفاظ/حذف وتصنيف بيانات قبل الإنتاج.

### 10. Deployment على Heroku

المخرجات: Heroku apps/Procfile أو بديله، config-var inventory، release migration، CI/CD، runbook rollback.

معايير القبول:

- staging/prod منفصلان، الأسرار في config vars فقط، وhealth checks سليمة.
- نشر migration متوافق مع التطبيق ومرّ باختبار backup/restore وrollback.
- يتمكن فريق التشغيل من النشر والرجوع باستخدام runbook دون معرفة ضمنية.

### 11. Monitoring وMaintenance

المخرجات: dashboards وتنبيهات، SLOs، incident runbooks، مراجعة جودة البيانات/النموذج/RAG، وجدول patching.

معايير القبول:

- مراقبة availability/latency/errors وDB وdata freshness وML drift وRAG quality/cost.
- التنبيهات مرتبطة بمالك وإجراء واضح، وتختبر سيناريوهات incident الأساسية.
- مراجعة دورية للاعتمادات والأسرار والبيانات المعتمدة والنماذج والمصادر المعرفية.

## التسلسل والاعتماديات

0 → 1 → 2 و3 → 4 → 5، مع بدء 6 و7 فقط بعد توفر بيانات معتمدة من 3. المرحلة 8 تعتمد على 4–7 حسب feature flags. المرحلتان 9 و11 مستمرتان عبر جميع المراحل؛ 10 يبدأ تجهيزها مبكراً لكن الإنتاج لا يتم قبل اجتياز 8 و9.

## بوابات البدء

لا يبدأ التنفيذ البرمجي للـBackend/Database/ML/RAG قبل اعتماد القرارات في قسم «الافتراضات». عند البدء، يفتح كل مسار ticket صغيراً بمعايير القبول أعلاه، مالك، ومراجعة للعقد/الأمن عند الحاجة.
