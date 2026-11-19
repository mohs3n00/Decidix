# DECIDIX — Google Play Console Submission Checklist & Store Listing Reference

**Application Name:** Decidix (ديسيدكس)  
**Package Name / Application ID:** `com.decidixteam.app`  
**Target API:** Android 16 (API Level 36)  
**Min API:** Android 7.0 (API Level 24)  
**Privacy Policy URL:** `https://web.decidixapp.tech/privacy`  
**Account Deletion URL:** `https://web.decidixapp.tech/delete-account`  

---

## 1. App Information & Category

- **App Name:** `Decidix`
- **Default Language:** English (United States) — `en-US`
- **Additional Translation:** Arabic — `ar`
- **App or Game:** App
- **Free or Paid:** Free
- **Category:** Tools / Business / Productivity
- **Tags:** Productivity, Decision Support, Data Analytics, Public Sector, Dashboard

---

## 2. Store Listing Metadata & Copy

### English (`en-US`)

**Title (Max 30 characters):**  
`Decidix Intelligence`

**Short Description (Max 80 characters):**  
`National development intelligence, regional analytics, and decision support.`

**Full Description (Max 4000 characters):**  
```text
Decidix is a bilingual national-development intelligence and decision-support platform designed to assist researchers, analysts, and institutional planners in evaluating socioeconomic development indicators across regions.

KEY CAPABILITIES:

• Integrated Development Overview:
Track composite national performance metrics across key pillars including education, healthcare, economy, and infrastructure with transparent data provenance.

• Regional Comparative Analytics:
Explore regional profiles, evaluate indicator trends, compare governorates side-by-side, and identify localized development priorities.

• Evidence-Based Decision Simulator:
Model hypothetical resource allocations and examine projected impacts across sectors with diminishing-returns simulation curves.

• Grounded AI Assistant:
Ask complex questions about regional indicators and receive responses strictly grounded in verified platform datasets with transparent source citations.

• Dataset Lifecycle Management:
Inspect indicators, review data quality metrics, upload standardized datasets, and verify regional metrics.

• Fully Bilingual & RTL Native:
Crafted with first-class Arabic and English interfaces, complete Right-to-Left (RTL) ergonomics, and high-contrast typography.

PRIVACY & DATA GOVERNANCE:
Decidix prioritizes user privacy and data minimization. We do not track user location, sell personal data, or serve third-party advertisements. Users retain full control over their account data and can request self-service account deletion at any time directly in-app or via our public deletion portal.

NOTE:
Decidix is an independent academic research and development platform created as a university graduation project. Data presented for evaluation purposes reflects illustrative indicators and research models.
```

---

### Arabic (`ar`)

**Title (Max 30 characters):**  
`منصة ديسيدكس التنموية`

**Short Description (Max 80 characters):**  
`ذكاء تنموي وطني، تحليلات إقليمية، ونظم دعم اتخاذ القرار باللغتين.`

**Full Description (Max 4000 characters):**  
```text
ديسيدكس هي منصة ذكاء تنموي وطني ونظام دعم اتخاذ القرار باللغتين العربية والإنجليزية، صُممت لمساعدة الباحثين والمحللين ومخططي السياسات التنموية في متابعة وتقييم مؤشرات التنمية المجتمعية عبر مختلف المناطق والمحافظات.

أبرز المزايا والوظائف:

• لوحة مؤشرات التنمية الوطنية:
متابعة المؤشرات الوطنية المركبة عبر القطاعات التنموية الحيوية (التعليم، الرعاية الصحية، الاقتصاد، والبنية التحتية) مع شفافية كاملة لمصادر البيانات.

• تحليلات المقارنة الإقليمية:
استعراض ملفات المناطق، دراسة الاتجاهات التاريخية للمؤشرات، وإجراء مقارنات مباشرة بين المحافظات لتحديد أولويات التدخل التنموي.

• محاكي القرارات القائم على الأدلة:
نمذجة سيناريوهات تخصيص الموارد الاستثمارية واختبار الأثر المتوقع عبر القطاعات التنموية باستخدام خوارزميات العوائد المتناقصة.

• المساعد الذكي المدعوم بالأدلة:
طرح الاستفسارات حول مؤشرات التنمية وتلقي إجابات دقيقة وموثقة تستند حصرياً إلى مجموعات البيانات المعتمدة في المنصة مع إسناد كامل للمصادر.

• إدارة وحوكمة البيانات:
متابعة مقاييس جودة واكتمال البيانات، ورفع وتفعيل مجموعات البيانات المعيارية وتدقيقها.

• واجهة عربية أصيلة:
تصميم مخصص بالكامل لدعم اتجاه القراءة من اليمين إلى اليسار (RTL) مع خطوط عربية عالية الوضوح وهوية بصرية موحدة.

الخصوصية وحوكمة البيانات:
تلتزم منصة ديسيدكس بحماية خصوصية المستخدمين وتطبيق مبادئ تقليل البيانات. لا يقوم التطبيق بتتبع الموقع الجغرافي أو بيع بيانات المستخدمين أو عرض أي إعلانات تجارية. يمتلك المستخدمون حق حذف حساباتهم وبياناتهم بالكامل في أي وقت مباشرة من داخل التطبيق أو عبر بوابة الحذف الإلكترونية.

ملاحظة توضيحية:
منصة ديسيدكس هي مشروع بحثي وتطبيقي مستقل أُعد كإطار تخرج جامعي. البيانات والمؤشرات المعروضة لأغراض التقييم تعكس نماذج تحليلية وتدريبية.
```

---

## 3. Store Listing Graphic Assets Specification

| Asset | Dimensions | Format | Requirement | Status |
| :--- | :--- | :--- | :--- | :--- |
| **App Icon** | 512 × 512 px | 32-bit PNG, max 1MB | High resolution, no alpha (transparency) | Source available at `assets/icon/splash_mark_512.png` |
| **Feature Graphic** | 1024 × 500 px | PNG or JPEG, max 15MB | No text branding cut-off, horizontal format | Needs export from Figma design assets |
| **Phone Screenshots** | Min 320px, Max 3840px | 16:9 or 9:16 aspect ratio (e.g. 1080 × 2400) | At least 4 screenshots (Dashboard, Regions, Simulator, AI Assistant) | Captured in `frontend/docs/evidence/` |
| **Tablet Screenshots** | 7-inch & 10-inch | Optional but recommended | Screen captures on tablet viewport | Optional |

---

## 4. App Content Declarations (Play Console Policy)

### A. Privacy Policy
- URL: `https://web.decidixapp.tech/privacy`
- Meets all Play Console requirements: public, secure (HTTPS), describes all collected data types, discloses third-party processors.

### B. Ads Declaration
- Question: "Does your app contain ads?"
- Answer: **No, my app does not contain ads.**

### C. App Access (Reviewer Credentials)
- Question: "Are some parts of your app restricted?"
- Answer: **Yes, some features require credentials.**
- **Reviewer Instructions Entry:**
  - **Account Name / Title:** `Google Reviewer Demo Account`
  - **Email / Username:** `evaluator@decidix.org`
  - **Password:** *(Use dedicated evaluation password configured on staging)*
  - **Sign-in notes:**  
    `Reviewers can test full app capabilities by signing in with the provided email/password credentials on the Login screen, or by using the built-in "Continue with Demo Account" option. No SMS OTP or physical device hardware is required.`

### D. Content Ratings Questionnaire
- Violence / Blood: No
- Sexual Content: No
- Profanity: No
- Controlled Substances: No
- User-to-User Communication: Yes (Citizen Reports community feature)
- Personal Data Shared: Yes (Email and user name for account management)
- Expected Rating: **Everyone / PEGI 3 / USK 0**

### E. Target Audience and Content
- Target Age Group: **18 and over**
- Could this app appeal to children?: **No**

### F. Government Apps Policy
- Question: "Is your app developed by or on behalf of a government entity?"
- Answer: **No.**
- Note: Decidix is an independent academic graduation project. Do NOT select "Yes" unless official government authorization documentation is issued.

### G. Financial Features
- Does your app provide financial services or advice?: **No.** (The investment simulator is an illustrative analytical decision tool, not financial advice).

---

## 5. Data Safety Form Answers (Field-by-Field)

| Data Category | Data Type | Collected? | Shared? | Purpose | Ephemeral? | Required/Optional |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **Personal Info** | Name | **Yes** | **No** | Account management, personalized greetings | No | Required |
| **Personal Info** | Email address | **Yes** | **No** | Account authentication, verification, password reset | No | Required |
| **Personal Info** | User IDs | **Yes** | **No** | Account identification | No | Required |
| **App Info & Performance** | Diagnostics / Crash logs | **Yes** | **No** | App performance and stability debugging | No | Optional |
| **Device Identifiers** | Device Token (FCM) | **Yes** | **No** | Push notifications delivery (deactivated on logout) | No | Optional |
| **Location** | Approximate or Precise | **No** | **No** | N/A (Static geo-coordinates used) | N/A | N/A |
| **Financial Info** | Payment/Bank details | **No** | **No** | N/A (Free application) | N/A | N/A |
| **Photos & Videos** | Photos / Videos | **No** | **No** | N/A | N/A | N/A |
| **Contacts** | Phone contacts | **No** | **No** | N/A | N/A | N/A |

### Security Practices
- Data encrypted in transit: **Yes (Strict HTTPS / TLS 1.3)**
- User data deletion request: **Yes** (Users can request account deletion in-app or via `https://web.decidixapp.tech/delete-account`).

---

## 6. Pre-Submission Verification Steps

- [x] Flutter SDK 3.47.6 and toolchain audited.
- [x] Target SDK set to 36 (Android 16).
- [x] 16 KB page size ELF compatibility verified (100% PASS).
- [x] In-app account deletion implemented and verified.
- [x] External account deletion web portal live at `https://web.decidixapp.tech/delete-account`.
- [x] Privacy policy live at `https://web.decidixapp.tech/privacy`.
- [x] `flutter analyze` completed with 0 errors.
- [x] `flutter test` passed (251 tests).
- [x] Release AAB built and verified signed with genuine upload key (`SHA1: F8:02:17:BD:4D:0D:6C:B1:30:84:53:C0:8F:A9:6F:4E:4A:53:D1:C4`).
- [x] Real-device 16 KB runtime tested on Android 16/17 emulator (`16384` page size, 0 crashes).
- [ ] **OWNER ACTION:** Register SHA-1 fingerprint (`F8:02:17:BD:4D:0D:6C:B1:30:84:53:C0:8F:A9:6F:4E:4A:53:D1:C4`) in Firebase and Google Cloud Console.
- [ ] **OWNER ACTION:** Upload signed AAB to Google Play Console Internal / Closed Testing track.

