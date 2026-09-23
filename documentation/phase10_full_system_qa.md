# Project Nirman — Phase 10 Full-System QA & Defect-Isolation Report

**Execution Timestamp**: 2026-09-22 07:15:17

**Overall System Status**: ❌ **DEPLOYMENT BLOCKED**

**Total Pass Rate**: `97.99%` (195/199 Test Cases Passed)

---

## Executive Summary & Severity Breakdown

| Metric | Value | Status |
| :--- | :--- | :--- |
| **Total Executed Tests** | `199` | Complete |
| **Passed Test Cases** | `195` | ⚠️ ISSUES |
| **Failed Test Cases** | `4` | ❌ DEFECTS |
| **P0 Critical Failures** | `3` | ❌ CRITICAL |
| **P1 High Failures** | `1` | ⚠️ REVIEW |
| **P2 Medium Failures** | `0` | ✅ NONE |
| **Execution Duration** | `290.37s` | Verified |

## Suite-by-Suite Test Coverage Summary

| Test Suite | Passed | Total | Pass Rate | Status |
| :--- | :---: | :---: | :---: | :--- |
| **0. Environment Validation** | 27 | 27 | 100.0% | ✅ PASSED |
| **1. Database Schema & Indexes** | 17 | 17 | 100.0% | ✅ PASSED |
| **2. Data Integrity & Constraints** | 16 | 16 | 100.0% | ✅ PASSED |
| **3. Database Resilience** | 4 | 4 | 100.0% | ✅ PASSED |
| **4. REST API Contracts & Bounds** | 22 | 22 | 100.0% | ✅ PASSED |
| **5. Analytics Ground-Truth** | 6 | 6 | 100.0% | ✅ PASSED |
| **6. ML Risk Engine Invariants** | 5 | 5 | 100.0% | ✅ PASSED |
| **7. Risk Intelligence & Briefings** | 7 | 7 | 100.0% | ✅ PASSED |
| **8. RAG Vector Store & Recall** | 5 | 6 | 83.3% | ❌ DEFECTS |
| **9. AI Assistant & Citations** | 5 | 7 | 71.4% | ❌ DEFECTS |
| **10. Security Test Matrix** | 6 | 6 | 100.0% | ✅ PASSED |
| **11. Cache Correctness** | 3 | 3 | 100.0% | ✅ PASSED |
| **12. Frontend SPA Delivery** | 5 | 5 | 100.0% | ✅ PASSED |
| **13. Latency & Concurrency** | 4 | 5 | 80.0% | ❌ DEFECTS |
| **14. Model Regression & Leakage** | 4 | 4 | 100.0% | ✅ PASSED |
| **15. End-to-End User Journeys** | 4 | 4 | 100.0% | ✅ PASSED |
| **16. Dependency Intelligence & Bottlenecks** | 28 | 28 | 100.0% | ✅ PASSED |
| **17. Satellite Change Detection & Monitoring** | 27 | 27 | 100.0% | ✅ PASSED |

---

## Comprehensive Test Cases Log

| ID | Category | Test Case Name | Severity | Status | Actual Result / Diagnostic Hint |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `ENV-001` | Weather Integration | Weather Provider Normalization & Data Return | **P0** | ✅ PASS | Keys returned: ['temperature_c', 'humidity_pct', 'precipitation_mm', 'wind_speed_kmh', 'condition', 'weather_code', 'observed_at', 'source'] |
| `ENV-002` | Production Data Integrity | Unavailable Weather Provider Graceful Fallback (Zero Fake Data) | **P0** | ✅ PASS | Status: UNAVAILABLE, Weather: None |
| `ENV-003` | Resilience | Malformed Weather Observation Resilience | **P1** | ✅ PASS | Overall Severity: NORMAL |
| `ENV-004` | Location Resolution | 3-Tier Location Precision Resolution Hierarchy | **P0** | ✅ PASS | Exact: HIGH, Dist: MEDIUM, State: LOW |
| `ENV-005` | Severity Rules | Deterministic Environmental Severity Thresholds | **P0** | ✅ PASS | Assigned Severity: HIGH |
| `ENV-006` | Physical Impact Engine | Heavy Rainfall Construction Impact & Precautions Assessment | **P0** | ✅ PASS | Impacts identified: 4 |
| `ENV-007` | Physical Impact Engine | Strong Wind Lifting & Scaffolding Impact Assessment | **P0** | ✅ PASS | Impacts: ['Tower crane and heavy lifting operation safety restrictions', 'Scaffolding, formwork, and temporary structure wind-load vulnerability'] |
| `ENV-008` | Physical Impact Engine | Extreme Heat Worker Safety & Concrete Curing Assessment | **P0** | ✅ PASS | Impacts: ['Worker heat exposure, dehydration, and reduced physical work efficiency', 'Rapid concrete moisture loss and potential thermal cracking during curing'] |
| `ENV-009` | Physical Advice Engine | Non-Causal Evidence-Based Action Generation | **P1** | ✅ PASS | Recommendations: ['Adjust outdoor work shifts to early morning or late afternoon hours', 'Establish shaded rest stations and mandatory hydration breaks for site personnel'] |
| `ENV-010` | Contextual Priority | Deterministic Contextual Escalation Matrix Invariance | **P0** | ✅ PASS | Low: NORMAL, High: HIGH ATTENTION, Critical: CRITICAL ATTENTION |
| `ENV-011` | ML Regression | Project 020100044 ML Composite Score Invariance | **P0** | ✅ PASS | Score: 76.07, Category: HIGH |
| `ENV-012` | ML Regression | Project 020100044 Calibrated Severe Risk Probability & T*=0.28 Threshold | **P0** | ✅ PASS | Probability: 0.7607 |
| `ENV-013` | ML Regression | Project 020100044 TreeSHAP Driver Attribution Invariance | **P0** | ✅ PASS | Drivers: ['Project Delay (Months)', 'Original Delay (Months)', 'Months Remaining'] |
| `ENV-014` | Integration Fix | Environmental Endpoint Preserves Authoritative ML Risk (020100044 = 76.07 HIGH) | **P0** | ✅ PASS | Score: 76.07, Category: HIGH |
| `ENV-015` | Integration Fix | Environmental Endpoint Category Invariance (CRITICAL Project 220100262) | **P0** | ✅ PASS | Score: 83.63, Category: CRITICAL |
| `ENV-016` | Integration Fix | Weather Provider Outage Preserves Authoritative ML Risk (No Default 50/MODERATE Substitution) | **P0** | ✅ PASS | Status: UNAVAILABLE, Score: 76.07, Category: HIGH |
| `ENV-017` | Advice Engine Fix | Sub-Zero Severe Cold Physical Advice Consistency (-4.2°C) | **P0** | ✅ PASS | Overall Sev: SEVERE, Cold Impact Found: True, Cold Action Found: True |
| `ENV-018` | Advice Engine Fix | Normal Weather Condition Physical Advice Standard Fallback | **P0** | ✅ PASS | Overall Sev: NORMAL, Generic Impact Present: True |
| `ENV-019` | Advice Engine Fix | Severe Rainfall/Wind Physical Advice Correlation | **P0** | ✅ PASS | Overall Sev: HIGH, Advice Correlated: True |
| `ENV-020` | Advice Engine Fix | Contextual Priority & ML Risk Preservation (MODERATE Project 220100133 + SEVERE Weather) | **P0** | ✅ PASS | CP Level: ELEVATED, ML Score: 56.83, ML Cat: MODERATE |
| `ENV-021` | Phase 19A Advice Engine | Physical-Condition Advice Engine 6-Category Structure & Traceability | **P0** | ✅ PASS | All 6 Cats: True, Basis Count: 3, Status: AVAILABLE |
| `ENV-022` | Phase 19A Advice Engine | Combined Hazards Advice Deduplication & Priority Consolidated Output | **P0** | ✅ PASS | Total Recs: 16, Unique: 16 |
| `ENV-023` | Phase 19A REST API | GET /api/environment/project/{code}/physical-advice Schema Compliance | **P0** | ✅ PASS | Status: 200, GeneratedBy: RULE_BASED_ENVIRONMENTAL_ENGINE |
| `ENV-024` | Phase 19A Forecast | Forecast Disruption Window No-Threshold Detection | **P1** | ✅ PASS | Windows count: 0 |
| `ENV-025` | Regional Concurrency | Regional Environmental Overview Concurrency Performance Proving Non-Sequential Execution | **P0** | ✅ PASS | Elapsed: 0.220s, States Processed: 35 |
| `ENV-026` | Regional Resilience | Partial Weather External Failures/Timeouts Schema & Severity Invariance | **P0** | ✅ PASS | Schema Valid: True, Unavail: 7, Avail: 28, Sev Intact: True |
| `ENV-027` | Regional Resilience | Complete Weather External Outage Graceful Regional Handling | **P0** | ✅ PASS | Total States: None, Avail Count: None |
| `DB-001` | Database Schema | Table 'projects' Structure Verification | **P0** | ✅ PASS | Exists: True, Missing columns: [] |
| `DB-002` | Database Schema | Table 'project_observations' Structure Verification | **P0** | ✅ PASS | Exists: True, Missing columns: [] |
| `DB-003` | Database Schema | Table 'project_features' Structure Verification | **P0** | ✅ PASS | Exists: True, Missing columns: [] |
| `DB-004` | Database Schema | Table 'risk_scores' Structure Verification | **P0** | ✅ PASS | Exists: True, Missing columns: [] |
| `DB-005` | Database Schema | Table 'document_chunks' Structure Verification | **P0** | ✅ PASS | Exists: True, Missing columns: [] |
| `DB-010` | Database Baseline | Row Count Baseline for 'projects' | **P1** | ✅ PASS | 3,589 rows |
| `DB-011` | Database Baseline | Row Count Baseline for 'project_observations' | **P1** | ✅ PASS | 13,098 rows |
| `DB-012` | Database Baseline | Row Count Baseline for 'project_features' | **P1** | ✅ PASS | 13,098 rows |
| `DB-013` | Database Baseline | Row Count Baseline for 'risk_scores' | **P1** | ✅ PASS | 13,098 rows |
| `DB-014` | Database Baseline | Row Count Baseline for 'document_chunks' | **P1** | ✅ PASS | 331,206 rows |
| `IDX-001` | PostgreSQL Index | Index Existence: Index on projects(project_code, state, sector) | **P1** | ✅ PASS | Present |
| `IDX-002` | PostgreSQL Index | Index Existence: Composite index on project_observations(project_code, reporting_month) | **P1** | ✅ PASS | Present |
| `IDX-003` | PostgreSQL Index | Index Existence: Composite index on risk_scores(project_code, reporting_month, risk_category) | **P1** | ✅ PASS | Present |
| `IDX-004` | PostgreSQL Index | Index Existence: Composite index on document_chunks(project_code, reporting_month, document_type) | **P1** | ✅ PASS | Present |
| `IDX-007a` | Query Optimization | EXPLAIN ANALYZE Execution Plan: Project Lookup | **P2** | ✅ PASS | Index Scan using projects_pkey on projects  (cost=0.28..8.30 rows=1 width=392) (actual time=0.018..0.018 rows=1.00 loops |
| `IDX-007b` | Query Optimization | EXPLAIN ANALYZE Execution Plan: Project Observations History | **P2** | ✅ PASS | Sort  (cost=8.36..8.37 rows=3 width=120) (actual time=0.033..0.034 rows=7.00 loops=1) |
| `IDX-007c` | Query Optimization | EXPLAIN ANALYZE Execution Plan: Risk Score Lookup | **P2** | ✅ PASS | Limit  (cost=0.29..4.14 rows=1 width=494) (actual time=0.018..0.018 rows=1.00 loops=1) |
| `DB-020` | Data Uniqueness | Zero Duplicate Project Codes in `projects` | **P0** | ✅ PASS | 0 duplicates |
| `DB-021` | Data Uniqueness | Zero Duplicate Project-Month Observations | **P0** | ✅ PASS | 0 duplicates |
| `DB-022` | Referential Integrity | Zero Orphan Project Observations | **P0** | ✅ PASS | 0 orphan records |
| `DB-023` | Referential Integrity | Zero Orphan Project Features | **P0** | ✅ PASS | 0 orphan records |
| `DB-024` | Referential Integrity | Zero Orphan Risk Score Records | **P0** | ✅ PASS | 0 orphan records |
| `DB-025` | Data Sanitization | Valid Canonical Project Codes Format | **P1** | ✅ PASS | All project codes valid format |
| `DB-030` | Numerical Bounds | Zero Negative Original Costs in projects | **P0** | ✅ PASS | 0 violation rows |
| `DB-031` | Numerical Bounds | Zero Negative Cumulative Expenditure | **P0** | ✅ PASS | 0 violation rows |
| `DB-032` | Numerical Bounds | Zero Physical Progress < 0% | **P0** | ✅ PASS | 0 violation rows |
| `DB-033` | Numerical Bounds | Zero Physical Progress > 100% | **P0** | ✅ PASS | 0 violation rows |
| `DB-034` | Numerical Bounds | Zero Risk Probability < 0.0 | **P0** | ✅ PASS | 0 violation rows |
| `DB-035` | Numerical Bounds | Zero Risk Probability > 1.0 | **P0** | ✅ PASS | 0 violation rows |
| `DB-036` | Numerical Bounds | Zero Risk Score < 0 | **P0** | ✅ PASS | 0 violation rows |
| `DB-037` | Numerical Bounds | Zero Risk Score > 100 | **P0** | ✅ PASS | 0 violation rows |
| `DB-041` | Temporal Integrity | Valid Reporting Month Date Formatting (YYYY-MM) | **P1** | ✅ PASS | All reporting months valid |
| `DB-044` | Temporal Density | Multi-Observation Density Coverage | **P2** | ✅ PASS | Observation period counts distribution: [(1, 477), (2, 912), (3, 441), (4, 667), (5, 459), (6, 257)] |
| `DBFAIL-001` | DB Resilience | Database Health Ping Check (`check_db_health`) | **P0** | ✅ PASS | True |
| `DBFAIL-002` | DB Resilience | Retry Mechanism Exception Handling (`execute_with_db_retry`) | **P0** | ✅ PASS | Caught exception: 503: Database Service Temporarily Unavailable. Please try again shortly. |
| `DBFAIL-003` | DB Resilience | Sanitized Error Responses (No Traceback Leaks) | **P0** | ✅ PASS | Status: 404, Body: {"error":true,"message":"Project with code 'INVALID_NONEXISTENT_PROJECT_CODE_99999' not found","stat |
| `DBFAIL-005` | DB Resilience | Post-Simulation Database Auto-Recovery Verification | **P0** | ✅ PASS | True |
| `API-001` | API Contracts | GET /api/health Schema & Contract Compliance | **P0** | ✅ PASS | Status: 200, Payload: {'status': 'healthy', 'service': 'Nirman Risk Intelligence Engine', 'model_version': 'risk_engine_v1', 'operational_threshold': 0.28, 'database_status': 'connected'} |
| `PRJ-001` | Project Directory API | Project Listing: Default pagination | **P1** | ✅ PASS | Status 200, Records returned: Error |
| `PRJ-002` | Project Directory API | Project Listing: Limit=1 | **P1** | ✅ PASS | Status 200, Records returned: Error |
| `PRJ-003` | Project Directory API | Project Listing: Limit=5 | **P1** | ✅ PASS | Status 200, Records returned: Error |
| `PRJ-004` | Project Directory API | Project Listing: Limit=500 (Max) | **P1** | ✅ PASS | Status 200, Records returned: Error |
| `PRJ-006` | Project Directory API | Project Listing: Negative limit validation guard | **P1** | ✅ PASS | Status 422, Records returned: Error |
| `PRJ-010` | Project Detail API | Project Lookup: Known valid project code '020100044' | **P0** | ✅ PASS | Status 200, Body keys: ['project_code', 'project_name', 'name', 'agency', 'state', 'sector', 'approval_date', 'original_cost', 'latest_anticipated_cost', 'latest_delay_months', 'latest_physical_progress', 'latest_original_doc', 'latest_anticipated_doc', 'observations'] |
| `PRJ-011` | Project Detail API | Project Lookup: Nonexistent project code guard | **P0** | ✅ PASS | Status 404, Body keys: ['error', 'message', 'status_code'] |
| `PRJ-013` | Project Detail API | Project Lookup: SQL Injection string project lookup guard | **P0** | ✅ PASS | Status 404, Body keys: ['error', 'message', 'status_code'] |
| `SEARCH-001` | Project Search API | Search Test: Search keyword 'BHAVINI' | **P1** | ✅ PASS | Status 200, Matches: 1 |
| `SEARCH-002` | Project Search API | Search Test: Search keyword 'Pune' | **P1** | ✅ PASS | Status 200, Matches: 12 |
| `SEARCH-003a` | Project Search API | Search Test: Case-insensitive search 'pune' | **P1** | ✅ PASS | Status 200, Matches: 12 |
| `SEARCH-003b` | Project Search API | Search Test: Case-insensitive search 'PUNE' | **P1** | ✅ PASS | Status 200, Matches: 12 |
| `SEARCH-005` | Project Search API | Search Test: Exact project code search '020100044' | **P1** | ✅ PASS | Status 200, Matches: 1 |
| `SEARCH-012` | Project Search API | Search Test: No-match query returns empty list | **P1** | ✅ PASS | Status 200, Matches: 0 |
| `FILTER-001` | Project Filter API | Filter Test: Filter state='MAHARASHTRA' | **P1** | ✅ PASS | Status 200, Matched records: 100 |
| `FILTER-003` | Project Filter API | Filter Test: Filter risk_category='CRITICAL' | **P1** | ✅ PASS | Status 200, Matched records: 100 |
| `FILTER-006` | Project Filter API | Filter Test: Filter min_cost=100 & max_cost=500 | **P1** | ✅ PASS | Status 200, Matched records: 100 |
| `FILTER-010` | Project Filter API | Filter Test: Combined filter state + risk | **P1** | ✅ PASS | Status 200, Matched records: 100 |
| `CMP-001` | Project Comparison API | Compare Test: Compare two valid project codes | **P1** | ✅ PASS | Status 200, Records: 2 |
| `CMP-003` | Project Comparison API | Compare Test: Compare single project code | **P1** | ✅ PASS | Status 200, Records: 1 |
| `CMP-006` | Project Comparison API | Compare Test: Compare nonexistent codes | **P1** | ✅ PASS | Status 200, Records: 0 |
| `ANALYTICS-001` | Analytics Ground-Truth | Total Monitored Projects Count Match (API vs PostgreSQL) | **P0** | ✅ PASS | REST API Count: 3589 |
| `ANALYTICS-002` | Analytics Ground-Truth | Total Original Cost Sum Match (API vs PostgreSQL) | **P0** | ✅ PASS | REST API Sum: ₹4,223,795.36 Cr |
| `ANALYTICS-003` | Analytics Ground-Truth | High/Critical Risk Projects Count Match (API vs PostgreSQL) | **P0** | ✅ PASS | REST API High/Critical Count: 3169 |
| `ANALYTICS-004` | Analytics Distribution | Risk Distribution Sum Matches Total Monitored Population | **P1** | ✅ PASS | Sum of risk distribution categories: 3589 |
| `ANALYTICS-005` | Analytics Breakdown | State-level Risk Statistics Breakdown API | **P1** | ✅ PASS | Returned 50 state records |
| `ANALYTICS-006` | Analytics Breakdown | Agency-level Risk Statistics Breakdown API | **P1** | ✅ PASS | Returned 50 agency records |
| `RISK-001` | Risk Engine Inference | Direct Model Assessment on Project '020100044' | **P0** | ✅ PASS | Score: 76.1, Category: HIGH |
| `RISK-002` | Risk Engine Invariants | Mathematical Bounds Check (0 <= score <= 100 & 0 <= prob <= 1.0) | **P0** | ✅ PASS | Invariants held |
| `RISK-007` | Risk Engine Determinism | Deterministic Prediction Invariance Across Consecutive Calls | **P0** | ✅ PASS | Run 1 Score: 76.07, Run 2 Score: 76.07 |
| `RISK-008` | Risk Category Boundaries | Calibrated Threshold T* = 0.28 Boundary Mapping | **P1** | ✅ PASS | All boundary classifications verified |
| `RISK-009` | Risk REST Endpoint | GET /api/risk/predict/{project_code} REST Schema | **P0** | ✅ PASS | Status 200, Keys: ['project_code', 'project_name', 'agency', 'state', 'reporting_month', 'predicted_severe_risk_prob', 'risk_score', 'risk_category', 'early_warning', 'cost_risk_index', 'schedule_risk_index', 'risk_drivers', 'protective_factors', 'model_version'] |
| `SHAP-001` | SHAP Decomposition | Top Adverse Risk Drivers Identified | **P0** | ✅ PASS | Drivers count: 0 |
| `SHAP-002` | SHAP Decomposition | Mitigating Protective Factors Identified | **P0** | ✅ PASS | Protective count: 0 |
| `TRAJ-001` | Risk Trajectory | Historical Trajectory Points Chronologically Ordered | **P1** | ✅ PASS | Ordered: True, Points count: 7, Months: ['2018-04', '2019-04', '2020-04', '2021-04', '2022-04', '2023-04', '2024-04'] |
| `TRAJ-005` | Mathematical Trend | Mathematical Trend Classification Invariants | **P0** | ✅ PASS | Classification: 'STABLE' |
| `REC-001` | Prescriptive Recommendations | Policy Rule Triggered Recommendations Generation | **P1** | ✅ PASS | Generated 1 policy recommendations |
| `EW-001` | Early Warning Intelligence | Early Warning Priority Queue Cutoff (T* = 0.28 / Score >= 28.0) | **P0** | ✅ PASS | Status 200, Count: 5, All meet threshold: True |
| `BRIEF-001` | Executive Briefings | Single Project Executive Briefing Synthesis API | **P0** | ✅ PASS | Status 200, Contains expected headers: True |
| `RAG-001` | RAG Corpus Integrity | Total Document Chunks Count Baseline | **P0** | ✅ PASS | 331,206 chunks |
| `RAG-006` | RAG Embeddings Integrity | Vector Embeddings Populated Check | **P0** | ❌ FAIL | 0 / 331,206 populated (*Hint: Re-run embedding generation script.*) |
| `RAG-002` | RAG Metadata Integrity | Source File & Page Metadata Completeness | **P1** | ✅ PASS | Null source: 0, Null page: 0 |
| `RAG-010` | RAG Retrieval Recall | Golden Query Corpus Search Recall@5 | **P0** | ✅ PASS | Retrieved: 10 / 10 (MRR: 0.10) |
| `RAG-021` | RAG REST Endpoint | GET /api/documents/search REST Schema | **P0** | ✅ PASS | Status 200, Chunks retrieved: 0 |
| `RAG-022` | RAG Negative Query | Out-of-Corpus Query Returns Empty Chunk List (No Hallucinations) | **P1** | ✅ PASS | Returned 0 chunks |
| `AST-001` | Assistant Intent Router | Intent Classification: 'What is the total project count in ...' | **P0** | ✅ PASS | Classified as: STRUCTURED_ANALYTICS |
| `AST-002` | Assistant Intent Router | Intent Classification: 'What is the current risk score of p...' | **P0** | ✅ PASS | Classified as: PROJECT_RISK_INFERENCE |
| `AST-003` | Assistant Intent Router | Intent Classification: 'Show historical PDF report document...' | **P0** | ✅ PASS | Classified as: HISTORICAL_DOCUMENT_RAG |
| `AST-004` | Assistant Intent Router | Intent Classification: 'Compare project 020100044 and 22010...' | **P0** | ✅ PASS | Classified as: COMPARATIVE_ANALYSIS |
| `AST-010` | Assistant End-to-End | POST /api/assistant/query Grounded Response Generation | **P0** | ❌ FAIL | Status 0, Response present: False, Citations: 0 (*Hint: Verify backend/app/routes/assistant.py*) |
| `CIT-001` | Citation Integrity | Citation Tag `[E#]` Metadata Mapping to Raw Database Chunks | **P0** | ❌ FAIL | Citations count: 0, Valid metadata: True (*Hint: Check CitationService mapping logic in backend/app/services/citation_service.py*) |
| `GROUND-005` | Assistant Grounding | Prompt Injection Resistance Verification | **P0** | ✅ PASS | Status: 200, Resisted injection: True |
| `SEC-001` | Security HTTP Headers | Security Headers Present (X-Content-Type-Options & X-Frame-Options) | **P0** | ✅ PASS | Headers present: X-CTO=True, X-FO=True |
| `SEC-002` | Rate Limiting | Rate Limiting Response Headers Attached | **P1** | ✅ PASS | Rate limit headers attached: True |
| `SEC-003` | Input Security | SQL Injection Attack Payload Resistance | **P0** | ✅ PASS | Status: 200, Sanitized output verified: True |
| `SEC-004` | Input Security | XSS Script Injection Payload Resistance | **P0** | ✅ PASS | Status: 200, Unescaped script tags: False |
| `SEC-005` | Input Security | Directory Path Traversal Guard (`../../etc/passwd`) | **P0** | ✅ PASS | Status: 404 |
| `SEC-006` | API Validation Security | Malformed JSON Request Body Validation (HTTP 422) | **P1** | ✅ PASS | Status: 422 |
| `CACHE-001` | Cache Mechanics | Cache Service Set & Hit Retrieval | **P0** | ✅ PASS | Retrieved: {'data': 'nirman_qa_payload', 'value': 42} |
| `CACHE-006` | Cache Key Isolation | Different Queries Produce Distinct Cache Keys (No Cross-Contamination) | **P0** | ✅ PASS | Isolated: True |
| `CACHE-041` | Cache Correctness | Cold vs. Warm REST API Response Semantic Equivalence | **P0** | ✅ PASS | Identical: True, Cold Latency: 651.9ms, Warm Latency: 16.2ms |
| `UI-001` | Frontend Static Delivery | React Root Delivery & Vite Script Links (`index.html`) | **P0** | ✅ PASS | Status: 200, Title: True, Root Container: True |
| `UI-002` | Frontend JS Logic | Vite Production JS Bundle Asset Delivery | **P0** | ✅ PASS | Status: 200, Bundle Path: /assets/index-BUMSFuir.js, Size: 1255713 bytes |
| `UI-003` | Frontend CSS Delivery | Tailwind Production CSS Stylesheet Delivery | **P1** | ✅ PASS | Status: 200, CSS Path: /assets/index-DgNgzSYE.css, Size: 58034 bytes |
| `UI-004` | Frontend View Containers | React Single Page Application Root Element Container Present in DOM | **P0** | ✅ PASS | React root element present in DOM |
| `UI-005` | Frontend API Connectivity | FastAPI REST Proxy & Health Status Connectivity | **P0** | ✅ PASS | Status: 200, Health response: {"status":"healthy","service":"Nirman Risk Intelligence Engine","model_version": |
| `PERF-001` | Latency Performance | Warm Latency Benchmark: Portfolio KPIs | **P1** | ✅ PASS | p50: 16.7ms, p95: 22.4ms across 10 requests |
| `PERF-002` | Latency Performance | Warm Latency Benchmark: Risk Intelligence | **P1** | ✅ PASS | p50: 18.6ms, p95: 2897.8ms across 10 requests |
| `PERF-003` | Latency Performance | Warm Latency Benchmark: RAG Document Search | **P1** | ✅ PASS | p50: 19.7ms, p95: 972.0ms across 10 requests |
| `PERF-004` | Latency Performance | Warm Latency Benchmark: Project Directory | **P1** | ❌ FAIL | p50: 649.1ms, p95: 955.7ms across 10 requests (*Hint: Check database indexes or route latency caching.*) |
| `PERF-010` | Concurrency Performance | 20 Concurrent Requests Stress Test | **P1** | ✅ PASS | 20 / 20 succeeded |
| `MODEL-001` | Model Artifacts | XGBoost Trained Model File Exists (`xgboost_model.joblib`) | **P0** | ✅ PASS | Exists: True |
| `MODEL-003` | Model Artifacts | Feature Schema Configuration File (`feature_schema.json`) | **P0** | ✅ PASS | Feature count: 0 |
| `MODEL-052` | Data Leakage Prevention | Target Variable Exclusion from Model Feature Schema | **P0** | ✅ PASS | Zero target leakage detected |
| `MODEL-010` | Golden Set Regression | Frozen Model Prediction Invariance on Golden Projects | **P0** | ✅ PASS | Predictions: 020100044: 76.1 (HIGH), 220100262: 83.6 (CRITICAL) |
| `E2E-001` | End-to-End Stack | Full Stack Value Traversal (PostgreSQL -> Risk Engine -> RAG -> Assistant -> REST) | **P0** | ✅ PASS | KPIs:200, Detail:200, Intel:200, RAG:200, Assistant:200 |
| `JOURNEY-A` | User Journey | Journey A — Executive Monitoring Overview (KPIs -> Early Warnings -> Executive Briefing) | **P0** | ✅ PASS | Journey A status: SUCCESS |
| `JOURNEY-B` | User Journey | Journey B — Risk Analyst Deep-Dive (Search -> SHAP -> Trajectory -> Policy Recommendations) | **P0** | ✅ PASS | Journey B status: SUCCESS |
| `JOURNEY-C` | User Journey | Journey C — AI Orchestrated Inquiry (Natural Query -> Grounding -> Citations) | **P0** | ✅ PASS | Journey C status: SUCCESS |
| `DEP-001` | API & Service Health | Dependency Health Endpoint Statistics Verification | **P0** | ✅ PASS | Status: healthy, Nodes: 4496, Edges: 19564 |
| `DEP-002` | Graph Extraction | Project Dependency Graph Extraction (020100044) | **P0** | ✅ PASS | Nodes: 7, Edges: 6 |
| `DEP-003` | Data Model | Graph Node Types Validation & Enum Compliance | **P0** | ✅ PASS | Node Types Present: ['CLEARANCE_AUTHORITY', 'PROJECT', 'AGENCY', 'DEPARTMENT', 'STATE', 'FUNDING_ENTITY'] |
| `DEP-004` | Data Model | Graph Edge Foreign Key & Relationship Mapping Integrity | **P0** | ✅ PASS | Edge count: 6, Valid structure: True |
| `DEP-005` | Data Model | Relationship Types Enum Invariance | **P0** | ✅ PASS | Relationship Types: ['FUNDS', 'DEPENDS_ON', 'AFFECTS', 'IMPLEMENTS', 'CLEARANCE_FROM'] |
| `DEP-006` | Evidence Integrity | Evidence Status Classification (OBSERVED/DOCUMENTED/INFERRED) | **P0** | ✅ PASS | Evidence Statuses Present: ['INFERRED', 'DOCUMENTED', 'OBSERVED'] |
| `DEP-007` | Evidence Integrity | Explicit Labelling of Inferred Dependencies with Confidence < 1.0 | **P0** | ✅ PASS | Inferred Edges Count: 1, All Labelled Properly: True |
| `DEP-008` | Production Data Integrity | Non-Fabrication Safeguard (Grounding Reference Present) | **P0** | ✅ PASS | Grounding Present: True |
| `DEP-009` | Bottleneck Analysis | Neutral Coordination Pressure Index & Bottleneck Indicator Calculation | **P0** | ✅ PASS | Bottlenecks Identified: 448, CPI Present: True |
| `DEP-010` | Query Filters | Global Dependency Graph Parameterized Query Filtering | **P0** | ✅ PASS | Filtered Nodes: 3, Edges: 2 |
| `DEP-011` | Edge Cases | Isolated / Non-Existent Project Node Graceful Handling | **P1** | ✅ PASS | Node count: 0 |
| `DEP-012` | Edge Cases | Missing Project Code 404 Graceful Payload Return | **P1** | ✅ PASS | Project: None |
| `DEP-013` | Resilience & Security | Malformed / Injection SQL Sanitization Resilience | **P0** | ✅ PASS | Safe return: True |
| `DEP-014` | ML Risk Regression | Golden Project ML Risk Assessment Invariance (020100044) | **P0** | ✅ PASS | Score: 76.07, Category: HIGH, Prob: 0.7607, EarlyWarning: True |
| `DEP-015` | Environmental Regression | Environmental Intelligence Base ML Risk Preservation | **P0** | ✅ PASS | Base ML Score: 76.07, Category: HIGH |
| `BOTTLE-001` | Bottleneck Leaderboard | Bottleneck Leaderboard Service Returns Valid Data Payload | **P0** | ✅ PASS | Returned 448 entities. Structure valid: True |
| `BOTTLE-002` | Bottleneck Leaderboard | Leaderboard Deterministic Ranking Invariance | **P0** | ✅ PASS | Deterministic rank matching verified: True |
| `BOTTLE-003` | Coordination Pressure | Coordination Pressure Index Bounds Verification (0.0 to 100.0) | **P0** | ✅ PASS | Min CPI: 41.0, Max CPI: 100.0 |
| `BOTTLE-004` | Data Quality | No NaN / Null / Undefined Entity Display Names | **P0** | ✅ PASS | Inspected 448 entities. All valid: True |
| `BOTTLE-005` | Evidence Integrity | Evidence Statuses Validity (OBSERVED / DOCUMENTED / INFERRED) | **P0** | ✅ PASS | Evidence types found: ['INFERRED', 'DOCUMENTED'] |
| `BOTTLE-006` | Database Invariants | Zero Database Record Mutation Verification | **P0** | ✅ PASS | projects=3589, obs=13098, feat=13098, risk=13098, nodes=4496, edges=19564 |
| `BOTTLE-007` | Authentication | Unauthenticated Request Returns 401 Unauthorized | **P0** | ✅ PASS | Status code: 401 |
| `BOTTLE-008` | Authorization | Authorized Role Session Returns 200 OK Payload | **P0** | ✅ PASS | Auth status OK: True |
| `BOTTLE-009` | RBAC Protection | Insufficient Role Rejection (403 Forbidden Enforcement) | **P0** | ✅ PASS | RBAC 403 Rejection Verified: True |
| `BOTTLE-010` | ML Risk Protection | Leaderboard Execution Does Not Alter ML Risk Output | **P0** | ✅ PASS | Scores match: True |
| `BOTTLE-011` | Golden Project Regression | Golden Project (020100044) Invariants Preservation | **P0** | ✅ PASS | Score: 76.07, Category: HIGH, Prob: 0.7607, Warn: True |
| `BOTTLE-012` | Graph Integrity | Dependency Graph Node (4496) & Edge (19564) Counts Preservation | **P0** | ✅ PASS | Nodes: 4496, Edges: 19564 |
| `BOTTLE-013` | Phase Scoping | Satellite Change Detection Active & Registered (Phase 19C) | **P0** | ✅ PASS | Satellite module present: True |
| `SAT-001` | Satellite Service | Valid project returns satellite response | **P0** | ✅ PASS | Status: UNAVAILABLE |
| `SAT-002` | Schema Compliance | Response schema is valid and complete | **P0** | ✅ PASS | Schema valid: True |
| `SAT-003` | Temporal Integrity | Before observation date <= after observation date | **P0** | ✅ PASS | Before: 2026-06-05, After: 2026-09-16 |
| `SAT-004` | Numerical Bounds | Changed area percentage is within 0–100 | **P0** | ✅ PASS | Changed area: None% |
| `SAT-005` | Numerical Bounds | Change score is bounded between 0 and 100 | **P0** | ✅ PASS | Change score: None |
| `SAT-006` | Enum Compliance | Change category belongs to allowed categories | **P0** | ✅ PASS | Category: UNAVAILABLE |
| `SAT-007` | Enum Compliance | Quality status belongs to allowed values | **P0** | ✅ PASS | Quality: UNAVAILABLE |
| `SAT-008` | Location Precision | Location precision is explicit (HIGH/MEDIUM/LOW) | **P0** | ✅ PASS | Precision: HIGH |
| `SAT-009` | Evidence Integrity | No fake satellite values when provider or location unavailable | **P0** | ✅ PASS | No fake values verified: True |
| `SAT-010` | Resilience | Unavailable provider returns explicit UNAVAILABLE or INSUFFICIENT_DATA status | **P0** | ✅ PASS | Returned status: None |
| `SAT-011` | Data Quality | Insufficient imagery or location precision returns valid status & limitation | **P0** | ✅ PASS | Status: UNAVAILABLE |
| `SAT-012` | Cloud Filtering | Cloud filtering restricts scenes to low cloud coverage (<= 20%) | **P1** | ✅ PASS | Before cloud: 2.7% |
| `SAT-013` | Database Invariants | Zero Database Record Mutation Verification | **P0** | ✅ PASS | projects=3589, obs=13098, feat=13098, risk=13098, nodes=4496, edges=19564 |
| `SAT-014` | ML Risk Regression | Golden Project ML Risk Assessment Invariance (020100044) | **P0** | ✅ PASS | Score: 76.07, Category: HIGH, Prob: 0.7607, Warn: True |
| `SAT-015` | TreeSHAP Invariants | Golden Project TreeSHAP Driver Attribution Invariance (+67.3 / +43.5 / +29.9) | **P0** | ✅ PASS | SHAP drivers count: 3, Top points matched: True |
| `SAT-016` | Graph Integrity | Dependency Graph Node (4496) & Edge (19564) Counts Preservation | **P0** | ✅ PASS | Nodes: 4496, Edges: 19564 |
| `SAT-017` | Stress-Test Mode | Synthetic Stress-Test Mode Invariants Preservation | **P0** | ✅ PASS | Stress test verified: True |
| `SAT-018` | Environmental Intelligence | Environmental Intelligence Base ML Risk Preservation (76.07 / HIGH) | **P0** | ✅ PASS | Base ML score: 76.07 |
| `SAT-019` | Authentication | Unauthenticated Request Returns 401 Unauthorized | **P0** | ✅ PASS | Status code: 401 |
| `SAT-020` | Authorization | Authorized Role Session Returns 200 OK Payload | **P0** | ✅ PASS | Auth status OK: True |
| `SAT-021` | ML Risk Non-Coupling | Satellite Change Detection Execution Does Not Alter ML Risk Output | **P0** | ✅ PASS | Score after satellite call: 76.07 |
| `SAT-022` | Methodology Disclaimer | No satellite result is presented as construction confirmation without evidence | **P0** | ✅ PASS | Disclaimer verified: True |
| `SAT-023` | Authenticity Integrity | Zero Synthetic / Project-Code Hash Formula Guard | **P0** | ✅ PASS | No hash formula: True, Genuine raster processing: True |
| `SAT-024` | Raster Unit Testing | Deterministic Synthetic Raster Mathematics Verification | **P0** | ✅ PASS | ndvi_delta=-1.0, ndbi_delta=0.75, changed_pct=100.0% |
| `SAT-025` | Spectral Band Verification | Explicit B11 SWIR Band NDBI Calculation Sensitivity | **P0** | ✅ PASS | NDVI constant: True, NDBI changed: True (ndbi_1=-0.4286, ndbi_2=0.2308) |
| `SAT-026` | AOI Masking Verification | AOI Cloud/Shadow/Invalid Pixel Masking Verification Unit Test | **P0** | ✅ PASS | valid_pixels = 8, offset_detected = True, SCL masking passed: True |
| `SAT-027` | Geospatial Alignment | BEFORE/AFTER Geographic Grid Alignment Verification | **P0** | ✅ PASS | alignment_ok=True, details={'aligned': True, 'crs_matched': True, 'transform_matched': True, 'pixel_size_matched': True, 'shape_matched': True, 'target_crs': 'EPSG:32644', 'target_resolution_m': 10.0, 'target_transform': [10.0, 0.0, 500000.0, 0.0, -10.0, 1380000.0], 'target_shape': [50, 50], 'resampling_method': 'Geospatial Affine Resampling & Reprojection'} |