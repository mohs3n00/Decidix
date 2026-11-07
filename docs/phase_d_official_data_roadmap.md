# Decidix Phase D — Official Data Acquisition Roadmap

**Status:** Planning only. **No data has been downloaded, ingested, or licensed.** Nothing on this
page is an acquisition record.

**Purpose.** Define what must be true before Decidix can replace its synthetic datasets with
official ones, and for each candidate source record the publisher, direct URL, licence, coverage,
indicators, update cadence and quality characteristics **as verified on the publisher's own pages**.

**Hard preconditions (block ingestion).**

1. **P0-3 — geography does not exist yet.** Decidix's 12 regions are fictional names with
   placeholder coordinates and no official codes or boundary geometry. No subnational dataset can be
   joined until the owner names a real country and its administrative levels. Country-level datasets
   can be ingested before that, but they cannot produce a regional index.
2. **P0-1 — no licensed extract exists.** No official file, API response, licence text, or checksum
   is in the repository.
3. **Zero-cost policy.** Only sources that are free to reuse under a stated licence qualify. A source
   that requires payment, registration gated on payment, or per-request billing is out of scope.
4. **Licence evidence is mandatory.** For every source, store the licence URL, the retrieval date,
   and the exact clause relied on. A source whose terms are not confirmed is not ingested.

---

## 1. Verified candidate sources

All entries below were checked against publisher pages on 2026-11-04. Where a publisher does not
state something, the cell says so rather than inferring it.

### 1.1 World Bank — World Development Indicators (WDI)

| Field | Value |
| --- | --- |
| Publisher | The World Bank (World Bank Open Data / Indicators API) |
| Direct URL | API `https://api.worldbank.org/v2/` — docs https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation |
| Licence | CC BY 4.0 **plus mandatory additional terms** (mediation/arbitration) per https://data.worldbank.org/summary-terms-of-use. Some indicators are third-party and "may not be redistributed or reused without the consent of the original data provider". |
| Geographic coverage | Global; API exposes multiple databases including WDI (`country/all`). Exact WDI economy count: **not stated** on the pages read. |
| Historical coverage | "Many data series date back over 50 years." Per-indicator start year: **not stated** on the API page; indicator metadata lives in DataBank. |
| Indicators | WDI indicator set, addressed by code (e.g. `SP.POP.TOTL`). Full list: **not enumerated** on the pages read. |
| Update frequency | Quarterly, with dated release notes (e.g. 2026-04-08); country-income reclassification each July. |
| Quality / missingness | No per-country–indicator coverage statistic stated. Release notes record indicator additions/removals and errata; **missingness must be computed by Decidix.** |
| Projections | **Not stated** — treat WDI as historical only. |

**Role in Decidix.** Primary historical backbone for education, health, economy and infrastructure
proxies (e.g. school enrolment, mortality, GDP per capita, electricity access). Attribution string
required: "The World Bank: *dataset name*: *data source*".

### 1.2 UNDP — Human Development Report Data Center (HDI and components)

| Field | Value |
| --- | --- |
| Publisher | Human Development Report Office (HDRO), UNDP |
| Direct URL | https://hdr.undp.org/data-center ; downloads https://hdr.undp.org/data-center/documentation-and-downloads ; API 2.0 at https://hdrdata.org (**API key required**) |
| Licence | **CC BY 3.0 IGO** (share/adapt including commercially, with credit + licence link + change indication) per https://hdr.undp.org/copyright-and-terms-use |
| Geographic coverage | 193 countries and territories (Country Insights). Regional groups enumerated by count (Arab States 20, etc.). |
| Historical coverage | HDI trends table covers **1990–2023** on the page read; time-series download 1990–2023. MPI from 2010. |
| Indicators | HDI plus component indices and underlying indicators (life expectancy, expected/mean years of schooling, GNI per capita, MPI). |
| Update frequency | Annual recalculation; dated data updates (HDR 2025 update 2025-05-06; MPI 2026 update 2026-10-12). |
| Quality / missingness | No per-country coverage statistic stated. |
| Projections | **Not stated** on the data pages read. |

**Critical constraint.** HDRO recalculates the entire HDI series every year and warns that values
"cannot therefore be compared directly to indices published in previous Reports." **Pin one vintage
and never mix releases.**

### 1.3 UN Statistics Division — SDG Indicators Database / SDMX API

| Field | Value |
| --- | --- |
| Publisher | United Nations Statistics Division (UNSD), UN DESA |
| Direct URL | API catalogue https://unstats.un.org/unsd/api/ ; SDMX-SDGs manual https://unstats.un.org/sdgs/iaeg-sdgs/sdmx-working-group/ ; database UI https://unstats.un.org/sdgs/dataportal/database (JS-only, not machine-read) |
| Licence | **Not confirmed.** The UN site terms grant personal, non-commercial use "without any right to resell or redistribute them or to compile or create derivative works therefrom" (https://www.un.org/en/about-us/terms-of-use), and the API page defers to "terms of usage … each respective API". Treat as **non-redistributable by default** until written confirmation. UNdata's own conditions page could not be read. |
| Geographic coverage | Global member states. Exact count: **not stated** on the pages read. |
| Historical coverage | SDG reference period from 2015; explicit start year **not stated**. |
| Indicators | Global SDG indicator framework (~250 indicators); Tier I/II/III classification reflects methodological maturity. |
| Update frequency | Fixed data cadence **not stated**; the global DSD is published up to four times per year (v1.26 on 2026-09-30). |
| Quality / missingness | Indicator-level metadata and tier classification documented; **no per-country coverage table** on the pages read. |
| Projections | **Not stated.** |

**Role in Decidix.** Potentially valuable for SDG-aligned indicators, but the licence is the blocker.
Do not ingest until a written permission or a confirmed open licence is on file.

### 1.4 IMF — World Economic Outlook (WEO) database

| Field | Value |
| --- | --- |
| Publisher | International Monetary Fund, Research Department |
| Direct URL | https://www.imf.org/en/publications/weo/weo-database/disclaimer ; conventions https://www.imf.org/en/publications/weo/weo-database/assumptions-and-data-conventions |
| Licence | Free reuse with attribution under the IMF Special Terms for Statistical Data (which explicitly name the WEO database) per https://www.imf.org/en/about/copyright-and-terms. Commercial reuse requires permission from copyright@imf.org. |
| Geographic coverage | **196 economies**; group composites computed only when ≥90% of group weights are represented. |
| Historical coverage | Historical results plus staff projections (shading distinguishes them); a Historical WEO Forecasts Database exists. Explicit start year: **not stated**. |
| Indicators | Macro-fiscal series (GDP, inflation, fiscal balance, debt, current account, unemployment). |
| Update frequency | **April and September/October** each year. |
| Quality / missingness | `n/a` marks missing values; blanks mean not available/not applicable. Data are spliced, so values "can differ from other sources with official data". Per-country coverage: **not stated**. |
| Projections | Yes — IMF staff projections, clearly separated from history. |

**Engineering constraint.** "The IMF prohibits bulk download of information by automated technology
without explicit permission." Decidix may not scrape WEO. Options: manual download by the owner, a
small number of targeted requests, or written permission. IMF content also may not be used to train
LLMs.

### 1.5 geoBoundaries — administrative boundaries

| Field | Value |
| --- | --- |
| Publisher | geoBoundaries project, William & Mary geoLab |
| Direct URL | https://www.geoboundaries.org/ ; API https://www.geoboundaries.org/api.html (endpoint pattern `https://www.geoboundaries.org/api/current/{releaseType}/{ISO3}/{ADM}/`) |
| Licence | Project-level CC BY 4.0. **Per-file licences differ:** `gbOpen` is CC BY 4.0; `gbAuthoritative` is mirrored from UN SALB and "cannot be used for commercial purposes"; `gbHumanitarian` may have less open licensure. The API returns `boundaryLicense`, `licenseSource`, `licenseDetail` for each layer — read them per file. |
| Geographic coverage | Over 200 entities including all UN member states; ADM0–ADM5. |
| Historical coverage | Per-layer `boundaryYearRepresented` (e.g. "2021", "1995 to 2021"); no uniform global start year. |
| Indicators | Geometry, names, unit counts (`admUnitCount`), build and source-update dates. |
| Update frequency | Regular releases, irregular cadence (6.0.0 2023-09-14; 5.0.0 2022-12-19; 4.0.0 2021-08-31 …). API uptime not guaranteed. |
| Quality / missingness | Vertex statistics and build dates per layer; a formal per-country availability table is not published. |
| Projections | Not applicable. |

**Role in Decidix.** The only viable path to real ADM1/ADM2 geometry once P0-3 is decided. Requires
Attribution to geoBoundaries and a recorded per-layer licence.

### 1.6 OpenStreetMap — base map data and tiles

| Field | Value |
| --- | --- |
| Publisher | OpenStreetMap Foundation / OSM contributors |
| Direct URL | https://www.openstreetmap.org/copyright ; tile policy https://operations.osmfoundation.org/policies/tiles/ |
| Licence | **Data:** ODbL 1.0 (share-alike) with attribution. **Tiles:** *not* open data — a donation-funded, best-effort service with no SLA. |
| Geographic coverage | Global. |
| Historical coverage | Not offered by the tile service; **not stated** for tiles. |
| Indicators | Basemap imagery only. |
| Update frequency | **Not stated**; tiles reflect current database state. |
| Quality / missingness | **Not stated.** |
| Projections | Not applicable. |

**Compliance risk in the current app.** `flutter_map` points at `tile.openstreetmap.org`. The tile
policy requires the exact HTTPS host, a unique descriptive `User-Agent` (library defaults are
blocked), honouring cache headers, and it **prohibits bulk download, prefetch features, offline tile
archives, and any caching beyond the policy**. A mobile app that ships an offline map, or prefetches
tiles, is non-compliant. Phase D must either configure a compliant tile provider or restrict the map
to online-only usage with a correct `User-Agent`.

---

## 2. What each source can and cannot support

| Decidix need | Suitable source | Limitation |
| --- | --- | --- |
| Historical national indicators | World Bank WDI, UNDP HDR | Country-level only; no region rows |
| Composite development index | WDI + HDR components | Decidix's own weighting must be documented; not an official index |
| Regional (ADM1) indicators | *None verified yet* | Requires a national statistics office dataset, which has not been identified or licensed |
| Administrative geometry | geoBoundaries `gbOpen` | Per-layer licence check; country choice still open |
| Basemap | OSM tiles (online only) or a licensed provider | Offline/prefetch prohibited by OSM policy |
| Forward projections | **None** | WEO publishes projections but is not redistributable in bulk without permission, and its methodology is not Decidix's; official planning targets would require a government plan document |

**Consequence for forecasts.** No source above authorises Decidix's 2026–2030 scenario values. The
five forecast records therefore remain `simulated_scenario` / `simulated` / `is_calibrated: false`
regardless of Phase D. Only an explicit government plan document, licensed for reuse, could justify
`official` labelling — and even then it would be a *plan target*, not a forecast.

---

## 3. Required acquisition protocol (per dataset)

1. **Licence gate.** Save licence URL, retrieval date, quoted clause, and a decision (`approved` /
   `rejected` / `pending`). `pending` blocks ingestion.
2. **Vintage pinning.** Record release identifier and, for HDI/WDI/WEO, the release date. Never mix
   vintages; store one release per dataset version.
3. **Integrity evidence.** SHA-256 of the exact file (or normalised API response), byte size, and the
   request URL with parameters.
4. **Geography resolution.** Map source units to Decidix region codes *only* through an explicit,
   versioned crosswalk file. Unmapped units are rejected, never guessed.
5. **Quality report computed, not assumed.** Produce a coverage matrix (rows = regions, columns =
   indicators) with counts of present / missing / imputed. No source above publishes this for us.
6. **Lineage record.** Extend `datasets/metadata/dataset_catalog.json` with publisher, licence,
   retrieval timestamp, checksum, vintage, and coverage. `accuracy` and `timeliness` stay `null`
   unless measured.
7. **Downstream gating.** RAG and ML training may consume a dataset only if its catalogue entry is
   `approved` **and** the licence permits derived use. Anything else stays synthetic and labelled.
8. **Rollback.** Ingestion writes a new dataset version; the previous version remains available so a
   faulty import can be reverted without data loss.

---

## 4. Phased execution plan

| Step | Deliverable | Exit criterion |
| --- | --- | --- |
| D0 | Owner decisions: target country, administrative levels, index definition, publication intent | Written decision recorded in `docs/` |
| D1 | Licence review of the six sources above | Each source `approved` or `rejected` with evidence |
| D2 | One dataset acquired end-to-end (recommended: World Bank WDI, country-level) | Checksum, vintage, catalogue entry, computed coverage matrix |
| D3 | Geography: ADM boundaries + region crosswalk | Every region maps to an official code; unmapped units rejected |
| D4 | Indicator mapping and index recomputation | Documented weights; no clipping at 95; distribution reported |
| D5 | RAG/ML re-run on approved data | Model cards regenerated from real splits; forecasts relabelled from evidence, not assumption |

**Stop condition.** If D0 or D1 fails, Phase D does not start. Synthetic data stays, labelled as
synthetic.

---

## 5. Explicitly unverified (do not rely on)

- UNdata's "may be copied freely … provided that UN is cited" clause — seen only in a search snippet;
  the official page could not be read. **Unconfirmed.**
- The note that WEO became accessible through the IMF Data portal in October 2025 — snippet only.
- hdrdata.org API schema and authentication terms — the site is JavaScript-only and returned no text.
- geoBoundaries per-country download table — JavaScript-only; use the API instead.
- Any download date, licence, or observation not listed above. None has been recorded.
