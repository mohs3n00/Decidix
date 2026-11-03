# Decidix Flutter-to-Backend API Mapping Specification

This document defines the strict, bidirectional API contract between the Flutter mobile application and the Node.js backend. Every endpoint corresponds to an implemented Flutter controller and model.

---

## 1. Global Conventions

- **Base URL:** `https://<host>/v1`
- **Request Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `Accept-Language: en | ar`
  - `Authorization: Bearer <token>` (optional until sign-in is required)
- **Response Envelope:**
  - Success: `{ "data": <T>, "meta": { "page": int, "per_page": int, "total": int } }` (`meta` on paginated lists only)
  - Error: `{ "error": { "code": string, "message": string, "fields": { [key: string]: string } } }`
- **Number Formats:** Raw integers and floats; percentages as `0` to `100`; money as `{ "amount": number, "currency": "USD" }`.
- **Text Pairs:** Dual bilingual fields for stored content: `name` & `arabic_name`, `label` & `arabic_label`, `text` & `arabic_text`.

---

## 2. Comprehensive Endpoint Specifications

### 2.1 Overview Endpoints

#### 1. Get National Dashboard
- **Feature:** Dashboard Overview ([`DashboardScreen`](file:///e:/decidix_app/lib/features/overview/presentation/screens/dashboard_screen.dart))
- **Method & Route:** `GET /v1/overview`
- **Auth:** Optional
- **Query Parameters:**
  - `range`: `3Y | 5Y | 7Y` (default: `7Y`)
- **Response Body:**
```json
{
  "data": {
    "as_of": "2025-Q4",
    "index": {
      "score": 68.4,
      "max_score": 100,
      "change": 2.3,
      "compared_with": "2024",
      "band": "moderate_high",
      "regions_count": 12,
      "population": 39600000,
      "at_risk_count": 4
    },
    "kpis": [
      {
        "key": "education",
        "label": "Education",
        "arabic_label": "التعليم",
        "value": 74.2,
        "unit": "score_100",
        "change": 1.8,
        "higher_is_better": true,
        "sparkline": [65.8, 66.5, 67.9, 69.6, 71.4, 72.9, 74.2]
      }
    ],
    "trend": {
      "range": "7Y",
      "points": [
        { "year": 2019, "value": 58.2 },
        { "year": 2025, "value": 68.4 }
      ]
    },
    "needs_attention": [
      {
        "id": "frontier",
        "name": "Frontier",
        "arabic_name": "المنطقة الحدودية",
        "score": 44,
        "population": 1200000,
        "priority": "high",
        "change": -1.7
      }
    ],
    "ai_insight": {
      "text": "Delta, Steppe and Frontier have declined for three consecutive periods...",
      "arabic_text": "تراجعت الدلتا والسهوب والمنطقة الحدودية لثلاث فترات متتالية..."
    }
  }
}
```
- **Error Codes:** `500 INTERNAL_ERROR`
- **Dependencies:** PostgreSQL (`national_index_history`, `regions`, `regional_metrics`, `indicators`)

---

#### 2. Get Regional Map Points
- **Feature:** Geospatial Regional Map ([`InteractiveMapScreen`](file:///e:/decidix_app/lib/features/overview/presentation/screens/interactive_map_screen.dart))
- **Method & Route:** `GET /v1/regions/map-points`
- **Auth:** Optional
- **Query Parameters:**
  - `sector`: `overall | education | healthcare | economy | infrastructure` (default: `overall`)
- **Response Body:**
```json
{
  "data": [
    {
      "id": "central_capital",
      "name": "Central Capital",
      "arabic_name": "العاصمة المركزية",
      "score": 86,
      "priority": "low",
      "population": 9200000,
      "latitude": 30.04,
      "longitude": 31.24
    }
  ]
}
```
- **Error Codes:** `400 BAD_REQUEST`, `500 INTERNAL_ERROR`
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`)

---

#### 3. List Regions
- **Feature:** Regions Directory ([`RegionsScreen`](file:///e:/decidix_app/lib/features/overview/presentation/screens/regions_screen.dart))
- **Method & Route:** `GET /v1/regions`
- **Auth:** Optional
- **Query Parameters:**
  - `q`: string (matches `name`, `arabic_name`, `id`)
  - `priority`: `all | high | medium | low` (default: `all`)
  - `page`: int >= 1 (default: `1`)
  - `per_page`: int 1..100 (default: `20`)
- **Response Body:**
```json
{
  "data": [
    {
      "id": "central_capital",
      "name": "Central Capital",
      "arabic_name": "العاصمة المركزية",
      "rank": 1,
      "score": 86,
      "change": 2.9,
      "priority": "low",
      "population": 9200000
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 12
  }
}
```
- **Error Codes:** `422 VALIDATION_ERROR`, `500 INTERNAL_ERROR`
- **Dependencies:** PostgreSQL (`regions`)

---

#### 4. Get Region Profile
- **Feature:** Region Profile Deep-Dive ([`RegionProfileScreen`](file:///e:/decidix_app/lib/features/overview/presentation/screens/region_profile_screen.dart))
- **Method & Route:** `GET /v1/regions/:id`
- **Auth:** Optional
- **Path Parameters:**
  - `id`: string (lowercase slug, e.g. `frontier`, `delta`)
- **Response Body:**
```json
{
  "data": {
    "id": "delta",
    "name": "Delta",
    "arabic_name": "الدلتا",
    "rank": 10,
    "rank_total": 12,
    "score": 52,
    "change": -0.8,
    "priority": "high",
    "population": 2200000,
    "area_km2": 26000,
    "domains": [
      { "key": "education", "label": "Education", "arabic_label": "التعليم", "score": 55 },
      { "key": "healthcare", "label": "Healthcare", "arabic_label": "الرعاية الصحية", "score": 48 },
      { "key": "economy", "label": "Economy & jobs", "arabic_label": "الاقتصاد والوظائف", "score": 50 },
      { "key": "infrastructure", "label": "Infrastructure", "arabic_label": "البنية التحتية", "score": 55 }
    ],
    "history": {
      "region": [{ "year": 2019, "value": 53.4 }, { "year": 2025, "value": 52.0 }],
      "national": [{ "year": 2019, "value": 58.2 }, { "year": 2025, "value": 68.4 }]
    },
    "ai_insight": {
      "text": "Lowest gap is healthcare. Raising it by 8 points would lift the regional index roughly 3.1 points within 24 months.",
      "arabic_text": "أكبر فجوة هي في الرعاية الصحية. رفعها 8 نقاط سيرفع مؤشر المنطقة نحو 3.1 نقطة خلال 24 شهراً."
    },
    "data_quality": {
      "score": 68,
      "updated_at": "2025-10-15T00:00:00Z"
    }
  }
}
```
- **Error Codes:** `404 NOT_FOUND`, `500 INTERNAL_ERROR`
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`, `national_index_history`)

---

### 2.2 Insights Endpoints

#### 5-8. Get Sector Analytics (Education, Healthcare, Economy, Infrastructure)
- **Feature:** Sector Deep-Dive ([`SectorScreen`](file:///e:/decidix_app/lib/features/insights/presentation/screens/sector_screen.dart))
- **Method & Route:**
  - `GET /v1/insights/education`
  - `GET /v1/insights/healthcare`
  - `GET /v1/insights/economy`
  - `GET /v1/insights/infrastructure`
- **Auth:** Optional
- **Response Body:**
```json
{
  "data": {
    "sector": "education",
    "index": { "score": 74.2, "change": 1.8 },
    "kpis": [
      {
        "key": "literacy_rate",
        "label": "Literacy rate",
        "arabic_label": "معدل القراءة والكتابة",
        "value": 96.2,
        "unit": "percent",
        "change": 0.6,
        "higher_is_better": true
      }
    ],
    "trend": {
      "points": [{ "year": 2019, "value": 65.8 }, { "year": 2025, "value": 74.2 }]
    },
    "breakdown": {
      "title": "Enrolment by level",
      "arabic_title": "الالتحاق حسب المرحلة",
      "unit": "percent",
      "bars": [
        { "key": "pre", "label": "Pre", "arabic_label": "ما قبل", "value": 48 },
        { "key": "primary", "label": "Prim", "arabic_label": "ابتدائي", "value": 62 }
      ]
    },
    "indicators": [
      {
        "key": "primary_completion",
        "label": "Primary completion",
        "arabic_label": "إتمام المرحلة الابتدائية",
        "value": 94,
        "unit": "percent"
      }
    ],
    "ranking": {
      "top": [
        { "rank": 1, "region_id": "central_capital", "name": "Central Capital", "arabic_name": "العاصمة المركزية", "score": 89 }
      ],
      "bottom": [
        { "rank": 12, "region_id": "frontier", "name": "Frontier", "arabic_name": "المنطقة الحدودية", "score": 41 }
      ]
    },
    "ai_insight": {
      "text": "Tertiary completion rose 3.2%...",
      "arabic_text": "ارتفع معدل إتمام التعليم العالي بنسبة 3.2%..."
    }
  }
}
```
- **Error Codes:** `500 INTERNAL_ERROR`
- **Dependencies:** PostgreSQL (`indicators`, `regional_metrics`, `sector_breakdowns`, `regions`)

---

#### 9. Get Region Comparison
- **Feature:** Region Comparison ([`RegionComparisonScreen`](file:///e:/decidix_app/lib/features/insights/presentation/screens/region_comparison_screen.dart))
- **Method & Route:** `GET /v1/insights/comparison`
- **Auth:** Optional
- **Query Parameters:**
  - `a`: string (region ID)
  - `b`: string (region ID)
- **Response Body:**
```json
{
  "data": {
    "a": { "id": "central_capital", "name": "Central Capital", "arabic_name": "العاصمة المركزية", "score": 86 },
    "b": { "id": "steppe", "name": "Steppe", "arabic_name": "السهوب", "score": 47 },
    "metrics": [
      { "key": "overall", "label": "Overall", "arabic_label": "الإجمالي", "score_a": 86, "score_b": 47 },
      { "key": "education", "label": "Education", "arabic_label": "التعليم", "score_a": 89, "score_b": 51 },
      { "key": "healthcare", "label": "Healthcare", "arabic_label": "الرعاية الصحية", "score_a": 84, "score_b": 42 },
      { "key": "economy", "label": "Economy", "arabic_label": "الاقتصاد", "score_a": 90, "score_b": 44 },
      { "key": "infrastructure", "label": "Infrastructure", "arabic_label": "البنية التحتية", "score_a": 82, "score_b": 48 }
    ],
    "gap_analysis": {
      "text": "Central Capital leads Steppe by 39 index points. The widest gap is in economy.",
      "arabic_text": "تتقدم العاصمة المركزية على السهوب بفارق 39 نقطة في المؤشر. وأوسع فجوة في الاقتصاد."
    }
  }
}
```
- **Error Codes:** `404 NOT_FOUND` (if either region does not exist), `422 VALIDATION_ERROR`
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`)

---

#### 10. Get Historical Analysis
- **Feature:** Historical Longitudinal Analysis ([`HistoricalAnalysisScreen`](file:///e:/decidix_app/lib/features/insights/presentation/screens/historical_analysis_screen.dart))
- **Method & Route:** `GET /v1/insights/historical`
- **Auth:** Optional
- **Query Parameters:**
  - `sector`: `overall | education | healthcare | economy` (default: `overall`)
  - `range`: `3Y | 5Y | 7Y` (default: `7Y`)
- **Response Body:**
```json
{
  "data": {
    "range": "7Y",
    "points": [{ "year": 2019, "value": 58.2 }, { "year": 2025, "value": 68.4 }],
    "annual_change": 1.8,
    "milestones": [
      {
        "year": 2021,
        "text": "National Healthcare Access Directive enacted",
        "arabic_text": "إقرار التوجيه الوطني للوصول إلى الرعاية الصحية"
      }
    ]
  }
}
```
- **Dependencies:** PostgreSQL (`national_index_history`)

---

#### 11. Get Development Priority Queue
- **Feature:** Development Priority Queue ([`DevelopmentPriorityScreen`](file:///e:/decidix_app/lib/features/insights/presentation/screens/development_priority_screen.dart))
- **Method & Route:** `GET /v1/insights/priority`
- **Auth:** Optional
- **Query Parameters:**
  - `limit`: int (optional limit of returned queue)
- **Response Body:**
```json
{
  "data": {
    "summary": { "high": 4, "medium": 5, "low": 3 },
    "queue": [
      {
        "rank": 1,
        "region_id": "frontier",
        "name": "Frontier",
        "arabic_name": "المنطقة الحدودية",
        "priority": "high",
        "need_score": 56,
        "weakest_domain": {
          "key": "healthcare",
          "label": "Healthcare",
          "arabic_label": "الرعاية الصحية",
          "score": 40
        }
      }
    ]
  }
}
```
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`)

---

#### 12. Get Data Quality Report
- **Feature:** Data Governance & Quality Audit ([`DataQualityScreen`](file:///e:/decidix_app/lib/features/insights/presentation/screens/data_quality_screen.dart))
- **Method & Route:** `GET /v1/insights/data-quality`
- **Auth:** Optional
- **Response Body:**
```json
{
  "data": {
    "score": 96,
    "completeness": 98,
    "timeliness": 94,
    "accuracy": 96,
    "coverage": "12 / 12 regions",
    "sources": [
      {
        "name": "Ministry of Health Registry",
        "arabic_name": "سجل وزارة الصحة",
        "frequency": "Quarterly",
        "status": "synced",
        "age_days": 12
      }
    ]
  }
}
```
- **Dependencies:** PostgreSQL (`dataset_metadata`)

---

### 2.3 Intelligence Endpoints

#### 13. Get ML Predictions
- **Feature:** ML Forecasting ([`PredictionsScreen`](file:///e:/decidix_app/lib/features/intelligence/presentation/screens/predictions_screen.dart))
- **Method & Route:** `GET /v1/intelligence/predictions`
- **Auth:** Optional
- **Query Parameters:**
  - `target_year`: `2027 | 2028 | 2030` (default: `2028`)
- **Response Body:**
```json
{
  "data": {
    "target_year": 2028,
    "available_years": [2027, 2028, 2030],
    "projected_index": 73.5,
    "confidence": 87,
    "series": [
      { "year": 2021, "value": 60.4, "kind": "actual", "lower": null, "upper": null },
      { "year": 2028, "value": 73.5, "kind": "forecast", "lower": 71.4, "upper": 75.6 }
    ],
    "models": [
      { "id": "gradient_boosting", "name": "Gradient boosting", "arabic_name": "التعزيز المتدرج", "r2": 0.91 },
      { "id": "random_forest", "name": "Random forest", "arabic_name": "الغابة العشوائية", "r2": 0.88 },
      { "id": "temporal_ensemble", "name": "Temporal ensemble", "arabic_name": "المجموعة الزمنية", "r2": 0.93 }
    ],
    "top_improvers": [
      { "region_id": "central_capital", "name": "Central Capital", "arabic_name": "العاصمة المركزية", "delta": 8.4 }
    ]
  }
}
```
- **Dependencies:** Python ML inference worker (`ml/inference/predict.py`)

---

#### 14. AI Assistant Chat
- **Feature:** Grounded Decision Assistant ([`AssistantScreen`](file:///e:/decidix_app/lib/features/intelligence/presentation/screens/assistant_screen.dart))
- **Method & Route:** `POST /v1/intelligence/assistant/chat`
- **Auth:** Optional
- **Request Body:**
```json
{
  "message": "Which region needs help most?",
  "language": "en",
  "conversation_id": null
}
```
- **Response Body:**
```json
{
  "data": {
    "conversation_id": "conv_7f3a91",
    "reply": {
      "text": "Frontier needs help most. Its index is 44...",
      "table": {
        "rows": [
          { "region_id": "frontier", "name": "Frontier", "arabic_name": "المنطقة الحدودية", "score": 44, "change": -1.7 }
        ]
      },
      "sources": [
        { "name": "Ministry of Health registry", "arabic_name": "سجل وزارة الصحة", "period": "2025-Q4" }
      ]
    },
    "suggested_prompts": [
      "Compare Delta and Lakeside",
      "Why did Delta decline?",
      "Summarise education trends"
    ]
  }
}
```
- **Error Codes:** `422 VALIDATION_ERROR` (if message is empty)
- **Dependencies:** Grounded RAG knowledge retriever, OpenRouter API

---

#### 15. Recommendations Management
- **Feature:** Policy Interventions ([`RecommendationsScreen`](file:///e:/decidix_app/lib/features/intelligence/presentation/screens/recommendations_screen.dart))
- **Routes:**
  - `GET /v1/intelligence/recommendations?priority=all|high|medium|low`
  - `POST /v1/intelligence/recommendations/:id/accept`
  - `POST /v1/intelligence/recommendations/:id/dismiss`
- **GET Response Body:**
```json
{
  "data": [
    {
      "id": "rec_frontier_mobile_clinics",
      "priority": "high",
      "region": { "region_id": "frontier", "name": "Frontier", "arabic_name": "المنطقة الحدودية" },
      "domain": "healthcare",
      "title": "Deploy Hybrid Mobile Clinic Network across Frontier Nomadic Outposts",
      "arabic_title": "نشر شبكة عيادات متنقلة هجينة في بادية المنطقة الحدودية",
      "summary": "Clinic density in Frontier is 38% below national average...",
      "arabic_summary": "كثافة العيادات في المنطقة الحدودية أقل بـ 38% من المتوسط الوطني...",
      "index_impact": 4.2,
      "estimated_cost": { "amount": 18000000, "currency": "USD" },
      "confidence": 94,
      "status": "suggested"
    }
  ]
}
```
- **Accept / Dismiss Response Body:**
```json
{
  "data": {
    "id": "rec_frontier_mobile_clinics",
    "status": "in_plan"
  }
}
```
- **Dependencies:** PostgreSQL (`ai_recommendations`)

---

### 2.4 Decisions Endpoints

#### 16. What-If Simulator
- **Feature:** Policy Simulator Sandbox ([`SimulatorScreen`](file:///e:/decidix_app/lib/features/decisions/presentation/screens/simulator_screen.dart))
- **Method & Route:** `POST /v1/decisions/simulate`
- **Auth:** Optional
- **Request Body:**
```json
{
  "region_id": "frontier",
  "allocations": {
    "education": 30000000,
    "healthcare": 45000000,
    "infrastructure": 20000000,
    "economy": 25000000
  }
}
```
- **Response Body:**
```json
{
  "data": {
    "region_id": "frontier",
    "horizon_months": 24,
    "today_score": 44,
    "projected_score": 51.0,
    "gain": 7.0,
    "total_package": { "amount": 120000000, "currency": "USD" },
    "levers": [
      { "domain": "education", "amount": 30000000, "gain": 1.5, "yield_per_million": 0.05 },
      { "domain": "healthcare", "amount": 45000000, "gain": 3.11, "yield_per_million": 0.069 },
      { "domain": "infrastructure", "amount": 20000000, "gain": 1.16, "yield_per_million": 0.058 },
      { "domain": "economy", "amount": 25000000, "gain": 1.23, "yield_per_million": 0.049 }
    ],
    "best_lever": { "domain": "healthcare", "yield_per_million": 0.069 },
    "note": {
      "text": "Each $1M in healthcare returns 0.069 index points here, the highest yield of the four levers.",
      "arabic_text": "كل مليون دولار في الرعاية الصحية يحقق 0.069 نقطة في المؤشر هنا، وهو أعلى عائد بين الروافع الأربع."
    }
  }
}
```
- **Error Codes:** `422 VALIDATION_ERROR` (negative allocation or unknown region)
- **Dependencies:** Simulation engine, PostgreSQL (`regions`, `regional_metrics`)

---

#### 17. Development Projects Portfolio
- **Feature:** Strategic Projects Tracker ([`DevelopmentProjectsScreen`](file:///e:/decidix_app/lib/features/decisions/presentation/screens/development_projects_screen.dart))
- **Method & Route:** `GET /v1/decisions/projects`
- **Auth:** Optional
- **Query Parameters:**
  - `status`: `all | in_progress | planned | delayed | completed` (default: `all`)
  - `page`: int >= 1 (default: `1`)
  - `per_page`: int 1..100 (default: `20`)
- **Response Body:**
```json
{
  "data": {
    "summary": {
      "projects_count": 5,
      "total_budget": { "amount": 528000000, "currency": "USD" },
      "delayed_count": 1
    },
    "items": [
      {
        "id": "prj_delta_clean_water",
        "title": "Delta Clean Water & Sanitation Upgrade",
        "arabic_title": "مشروع مياه الشرب النظيفة والصرف في الدلتا",
        "region": { "region_id": "delta", "name": "Delta", "arabic_name": "الدلتا" },
        "status": "in_progress",
        "progress": 68,
        "budget": { "amount": 145000000, "currency": "USD" },
        "due_date": "2026-09-30",
        "completed_at": null
      }
    ]
  },
  "meta": { "page": 1, "per_page": 20, "total": 5 }
}
```
- **Dependencies:** PostgreSQL (`development_projects`, `regions`)

---

#### 18. Citizen Reports & Like Toggle
- **Feature:** Citizen Feedback Feed ([`CitizenReportsScreen`](file:///e:/decidix_app/lib/features/decisions/presentation/screens/citizen_reports_screen.dart))
- **Routes:**
  - `GET /v1/decisions/citizen-reports?category=all|roads|health|schools|water&status=&page=1&per_page=20`
  - `POST /v1/decisions/citizen-reports/:id/like`
- **GET Response Body:**
```json
{
  "data": {
    "summary": {
      "open_this_week": { "value": 1284, "change": 6.2, "higher_is_better": false },
      "resolved_rate": { "value": 73, "change": 3.4, "higher_is_better": true }
    },
    "items": [
      {
        "id": "rep_delta_bridge_cracks",
        "category": "roads",
        "title": "Bridge deck cracking near market road",
        "arabic_title": "تشقق في سطح الجسر قرب طريق السوق",
        "region": { "region_id": "delta", "name": "Delta", "arabic_name": "الدلتا" },
        "created_at": "2025-11-03T10:00:00Z",
        "likes": 128,
        "liked_by_me": false,
        "priority": "high",
        "status": "escalated"
      }
    ]
  },
  "meta": { "page": 1, "per_page": 20, "total": 5 }
}
```
- **Like POST Response Body:**
```json
{
  "data": {
    "id": "rep_delta_bridge_cracks",
    "likes": 129,
    "liked_by_me": true
  }
}
```
- **Dependencies:** PostgreSQL (`citizen_reports`, `citizen_report_likes`, `regions`)

---

### 2.5 Auth & Health Endpoints

#### 19. Health Check
- **Route:** `GET /health`
- **Response:** `{ "status": "ok", "service": "decidix-backend", "timestamp": "...", "version": "1.0.0" }`

#### 20. Authentication Endpoints
- `POST /v1/auth/register` (body: `{ name, email, password, role }` -> `{ user, token }`)
- `POST /v1/auth/login` (body: `{ email, password }` -> `{ user, token }`)
- `GET /v1/auth/me` (header: `Authorization: Bearer <token>` -> `{ user }`)

