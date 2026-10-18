# Keepr — Corporate Expense Reimbursement Auditor & Purchase Intelligence Engine

> **"Receipts in. Decisions out. Every decision explained."**

Keepr is an enterprise-grade corporate expense reimbursement auditor and purchase intelligence platform. Built with a **Hybrid AI Architecture**, it pairs the perception and document intelligence of **Google Gemini 3.1** with a **zero-dependency, deterministic TypeScript calculation engine** that enforces spend policies, simultaneous caps, FX normalization, duplicate detection, anomaly scoring, and append-only auditability.

---

## Table of Contents

1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [High-Level Architecture](#2-high-level-architecture)
3. [The Pure Deterministic Engine (`src/engine/`)](#3-the-pure-deterministic-engine)
   - [3.1 Deterministic Rule Evaluator (`evaluator.ts`)](#31-deterministic-rule-evaluator)
   - [3.2 Chronological Ledger & Replay Engine (`ledger.ts`)](#32-chronological-ledger--replay-engine)
   - [3.3 5-Tier Duplicate Detection Engine (`duplicates.ts`)](#33-5-tier-duplicate-detection-engine)
   - [3.4 Explainable Anomaly Risk Scorer (`risk.ts`)](#34-explainable-anomaly-risk-scorer)
   - [3.5 Arithmetic Integrity & Tax Verifier (`integrity.ts`)](#35-arithmetic-integrity--tax-verifier)
   - [3.6 Deterministic Multi-Currency Normalizer (`fx.ts`)](#36-deterministic-multi-currency-normalizer)
   - [3.7 Policy Schema & Conflict Detector (`policySchema.ts`)](#37-policy-schema--conflict-detector)
   - [3.8 Policy Replay Simulator (`simulator.ts`)](#38-policy-replay-simulator)
   - [3.9 Travel Transit & Trip Bundler (`tripBundler.ts`)](#39-travel-transit--trip-bundler)
4. [Killer Feature: Expense Evidence Timeline](#4-killer-feature-expense-evidence-timeline)
5. [End-to-End Expense Lifecycle & Data Flow](#5-end-to-end-expense-lifecycle--data-flow)
6. [Interactive Fix-It Loop](#6-interactive-fix-it-loop)
7. [Finance Operations & Policy Studio](#7-finance-operations--policy-studio)
8. [Legacy Purchase Intelligence & Asset Protection](#8-legacy-purchase-intelligence--asset-protection)
9. [Authoritative API Specification](#9-authoritative-api-specification)
10. [Data Models & TypeScript Contracts](#10-data-models--typescript-contracts)
11. [Security, Multi-Tenancy & Firestore Rules](#11-security-multi-tenancy--firestore-rules)
12. [Repository Structure](#12-repository-structure)
13. [Environment Configuration & Deployment](#13-environment-configuration--deployment)
14. [Testing & Verification Suite](#14-testing--verification-suite)

---

## 1. Executive Summary & Core Philosophy

Corporate expense auditing frequently suffers from a fundamental flaw in modern AI apps: **delegating math and approval authority to non-deterministic large language models (LLMs)**. LLMs hallucinate numbers, miscalculate tax proportions, fabricate approval justifications, and introduce non-reproducible outcomes.

Keepr solves this with strict architectural separation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HYBRID AI SYSTEM BOUNDARY                       │
├──────────────────────────────────┬─────────────────────────────────────┤
│     PERCEPTUAL AI (Gemini 3.1)   │   DETERMINISTIC ENGINE (TypeScript) │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Document OCR & text parsing    │ • Arithmetic & balance checksums    │
│ • Line item recognition          │ • Tax & tip proportional allocation │
│ • Entity classification          │ • Currency FX normalization         │
│ • Policy text rule ingestion     │ • Multi-tier duplicate scoring      │
│ • Grounded natural language Q&A  │ • Simultaneous cap resolution       │
│ • Conversational clarification   │ • Chronological ledger replay       │
│                                  │ • Approval / escalation verdicts    │
│                                  │ • Immutable audit trail creation    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### Non-Negotiable Tenets

1. **Hybrid AI Partitioning**: Gemini extracts fields, classifies items, suggests draft policy rules from raw contracts, and articulates structured findings. Pure deterministic TypeScript performs all mathematical arithmetic, FX conversions, cap enforcement, duplicate scoring, and final decision trees. **Never ask an LLM to decide an amount.**
2. **Full Provenance & Traceability**: Every decision produces a `Verdict` with cited rule IDs, section numbers, rule titles, and exact source quotes from corporate policy. Reviewer overrides require authenticated identity, timestamp, and mandatory written rationale.
3. **Explicit Uncertainty**: Never silently invent a field, date, currency, or FX rate. Per-field confidence scores (`0.0 - 1.0`) are preserved. Extracted values and employee corrections are stored separately. Low-confidence fields automatically transition claims to `needs_info`.
4. **Calibrated, Neutral Anomaly Language**: Suspected anomalies produce "review recommended" flags, not accusations of fraud. Anomaly risk is scored `0–100` across calibrated bands: **Low** (0–24), **Medium** (25–59), and **High** (60+).
5. **Integer Minor Units**: All monetary values are handled internally as integer minor units (paise/cents, e.g. `₹1,650.00` = `165000`) to eliminate IEEE 754 floating-point drift.
6. **Chronological Ledger Replay**: Spend allowances and daily caps are computed by replaying expenses in chronological order (`expenseDate ASC`, `submittedAt ASC`, `id ASC`), not mutable cumulative counters. Older late-arriving receipts trigger automated ledger reflows and audit events.
7. **Zero-Dependency Pure Engine**: The core audit engine in `src/engine/` has zero network, browser, or database dependencies, allowing headless execution on Node.js, Cloudflare Workers, or Vitest unit suites.
8. **Server Authority**: The client UI provides instantaneous dry-run previews, but the server API and Firestore security rules maintain ultimate authoritative enforcement.

---

## 2. High-Level Architecture

Keepr operates as a full-stack, enterprise-grade system deployable both as a unified Express/Vite monolith or a serverless cloud service on Vercel with Google Cloud Firebase.

```
                           ┌───────────────────────────────┐
                           │      Browser Client (SPA)     │
                           │   React 19 + Tailwind CSS 4   │
                           └───────────────┬───────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                 HTTP REST Calls                        Direct Firestore
           (Authoritative APIs / OCR)              (Realtime Data / Storage)
                        │                                     │
                        ▼                                     ▼
        ┌───────────────────────────────┐     ┌───────────────────────────────┐
        │        Server Engine          │     │    Google Cloud Firestore     │
        │  server.ts / api/index.ts     │     │   Rules: firestore.rules      │
        │  • Express 4.21               │     │   Storage: storage.rules      │
        │  • Pure TypeScript Engine     │     │   • /orgs/{orgId}/expenses    │
        │  • Multi-Tier Fallback Cache  │     │   • /orgs/{orgId}/policies    │
        └───────────────┬───────────────┘     │   • /orgs/{orgId}/audit       │
                        │                     └───────────────────────────────┘
                        ▼
        ┌───────────────────────────────┐
        │   Google Gemini 3.1 & 2.5     │
        │   • gemini-3.1-flash-lite     │
        │   • gemini-2.5-flash fallback │
        │   • Structured JSON Schemas   │
        └───────────────────────────────┘
```

---

## 3. The Pure Deterministic Engine (`src/engine/`)

The pure engine lives in `src/engine/` and contains zero UI or Firebase code. It is completely deterministic and testable in isolation.

### 3.1 Deterministic Rule Evaluator (`evaluator.ts`)

The evaluation pipeline processes an expense through a **9-stage deterministic cascade**:

```
[Expense + Policy + Ledger State]
              │
              ▼
   Stage 1: Critical Missing / Low-Confidence Evidence Check
   • Checks merchant, date, total, currency.
   • Confidence < 0.60 or missing value moves claim to `needs_info`.
              │
              ▼
   Stage 2: 5-Tier Duplicate Check
   • If confirmed duplicate (score >= 0.95) submitted earlier: immediate REJECT.
   • If suspected duplicate (score >= 0.70): raise high-severity flag, escalate.
              │
              ▼
   Stage 3: Line-Item Exclusions & Proportional Allocation
   • Checks item flags (`alcohol`, `tobacco`, `personal`, `gift`, `fine_penalty`).
   • Checks policy keyword/item exclusion lists.
   • Allocates tax and tip proportionally:
     Excluded Tax/Tip = (Excluded Items Sum / Total Line Items) * (Tax + Tip).
              │
              ▼
   Stage 4: Missing Documentation & Requirements Check
   • Evaluates mandatory fields (e.g. clientName, attendeeCount for dinners).
   • Missing required details hold eligible amount in `pendingMinor`.
              │
              ▼
   Stage 5: Spend Caps & Allowances (Simultaneous Cap Resolution)
   • Matches rules by Category, Travel Status, City Tier, Grade, Department.
   • Evaluates `per_claim`, `day`, `week`, `month`, and `trip` caps.
   • Queries `ExpenseLedger` for prior spend in that period/scope.
   • **Most restrictive cap wins**: Lowest remaining allowance governs.
   • Cites every evaluated cap rule in `ruleImpacts`.
              │
              ▼
   Stage 6: Approval Threshold Rules
   • Evaluates transaction total against Manager, Finance, or CFO thresholds.
   • Breaches trigger medium-severity flags and escalation.
              │
              ▼
   Stage 7: Time-Window Rules (Late Submission Lag)
   • Compares `submittedAt` vs `expenseDate`.
   • Flags submissions exceeding policy window (default 30 days).
              │
              ▼
   Stage 8: Integrity & Anomaly Signals
   • Ingests math mismatch flags, anomalous tax rates (>30%), handwriting tags.
              │
              ▼
   Stage 9: Risk Scoring & Decision Synthesis
   • Synthesizes Risk Score (0..100) and assigns Risk Band (low/med/high).
   • Derives Decision: `auto_approve` | `approve` | `partial` | `needs_info` | `escalate` | `reject`.
```

#### Decision Rules

| Decision | Condition |
|---|---|
| `reject` | Eligible amount is 0, or confirmed duplicate of earlier claim. |
| `needs_info` | Critical fields missing, OCR confidence < 0.60, or required policy fields absent. |
| `escalate` | High risk score (≥ 60), suspected duplicate, or threshold breach. |
| `partial` | Exclusions or caps reduce approved amount below claimed total. |
| `auto_approve` | Standard claim, eligible == total, risk ≤ threshold (default 25), confidence ≥ 0.80, zero duplicate suspicion. |
| `approve` | Standard approval when reviewer overrides or manual review conditions are satisfied. |

---

### 3.2 Chronological Ledger & Replay Engine (`ledger.ts`)

Mutable cumulative counters fail when receipts are submitted out of chronological order. Keepr utilizes an append-only, chronologically ordered ledger (`ExpenseLedger`).

#### Sorting Invariant
Ledger entries are strictly ordered by:
1. `expenseDate` ASC (YYYY-MM-DD)
2. `submittedAt` ASC (ISO 8601 timestamp)
3. `expenseId` ASC (lexicographical string tie-breaker)

#### Multi-Dimensional Grouping Keys
Cap limits are indexed using composite keys:
```
{scopeKey}:{capPeriod}:{periodKey}
Example Daily Meal Cap:  emp:emp_101:day:2026-10-15
Example Category Monthly: emp:emp_101:cat:meals:month:2026-10
Example City Daily:      emp:emp_101:city:mumbai:day:2026-10-15
Example Trip Limit:      emp:emp_101:trip:trip_bangalore_oct26
```

#### Late-Arriving Receipt Reflow
When an older receipt arrives after newer receipts have already been evaluated:
1. The new receipt is inserted at its exact chronological position.
2. The ledger recalculates prior spend for all subsequent claims.
3. Any affected claims have their verdicts updated automatically.
4. An immutable `LEDGER_REFLOW` audit event is logged with before/after amounts.

---

### 3.3 5-Tier Duplicate Detection Engine (`duplicates.ts`)

Duplicate detection runs deterministically across all organization expenses within the comparison window:

```
┌──────┬──────────────────────┬─────────┬─────────────────────────────────────────────────┐
│ Tier │ Detection Signal     │ Score   │ Invariant / Condition                           │
├──────┼──────────────────────┼─────────┼─────────────────────────────────────────────────┤
│ 1    │ SHA-256 Binary Hash  │ 1.00    │ Authoritative cryptographic receipt match       │
│ 2    │ Order ID + Merchant  │ 0.95    │ Canonical merchant name & identical order ref   │
│ 3    │ Perceptual dHash     │ 0.85    │ 64-bit dHash Hamming distance ≤ 6               │
│ 4    │ Temporal Metadata    │ 0.80    │ Same employee + vendor + amount (0.5%) ± 1 day  │
│ 5    │ Shared Meal Signal   │ 0.75    │ Diff employee + vendor + amount (2%) + same day │
└──────┴──────────────────────┴─────────┴─────────────────────────────────────────────────┘
```

- **Candidate Evaluation**: Scores ≥ 0.95 from the same employee are treated as confirmed duplicates where the earliest submission takes precedence.
- **Side-by-Side Comparison**: Suspected matches (score ≥ 0.70) trigger visual comparison in `DuplicateCompareModal.tsx`.
- **Dismissal Traceability**: Finance reviewers can dismiss suspected duplicates with a mandatory written reason, recorded as an audit event.

---

### 3.4 Explainable Anomaly Risk Scorer (`risk.ts`)

Risk is determined by an additive weighted score bounded between `0` and `100`:

```
┌──────────────────────────────────────┬─────────┬───────────┐
│ Anomaly Signal                       │ Weight  │ Severity  │
├──────────────────────────────────────┼─────────┼───────────┤
│ Suspected Duplicate (Score ≥ 0.70)   │ +40     │ High      │
│ Cluster of Near-Threshold Claims     │ +35     │ High      │
│ Suspected Document Tampering / Edits │ +30     │ High      │
│ Math Discrepancy (Items != Total)    │ +20     │ Medium    │
│ Single Near-Threshold Claim (≤ 10%)  │ +20     │ Medium    │
│ Low Legibility on High-Value Claim   │ +10     │ Medium    │
│ Weekend Expense (Office Context)     │ +10     │ Low       │
│ Late Submission Lag (> 30 Days)      │ +10     │ Low       │
│ Handwritten Receipt Flag             │ +10     │ Low       │
│ Round Amount Without Itemized Tax    │ +8      │ Low       │
│ Anomalous Tax Bracket (> 30%)        │ +8      │ Low       │
└──────────────────────────────────────┴─────────┴───────────┘
```

**Bands**:
- `0–24`: **Low Risk** (Eligible for touchless auto-approval)
- `25–59`: **Medium Risk** (Requires review queue verification)
- `60–100`: **High Risk** (Mandatory escalation to Finance Lead / CFO)

---

### 3.5 Arithmetic Integrity & Tax Verifier (`integrity.ts`)

Prevents OCR inaccuracies and receipt tampering through deterministic cross-checking:
1. **Mathematical Checksum**:
   $$\text{Computed Total} = \sum (\text{Line Items}) + \text{Tax} + \text{Tip}$$
   Flags `mathMismatch` if $|\text{Printed Total} - \text{Computed Total}| > \max(0.50, 0.01 \times \text{Printed Total})$.
2. **Statutory Tax Bracket Validation**:
   $$\text{Calculated Tax Rate} = \frac{\text{Tax}}{\sum \text{Line Items}}$$
   Flags `taxRateAnomalous` if tax rate exceeds 35%.
3. **Unitemized Balance Detection**: Identifies gaps between printed totals and parsed line items, assigning the discrepancy to an `Unitemized Balance` category.
4. **Missing Date Safeguard**: Never defaults missing dates to the current date; sets `missingDate = true` to force manual confirmation.

---

### 3.6 Deterministic Multi-Currency Normalizer (`fx.ts`)

Normalizes all transactions to the organization's base currency (e.g., INR) in integer minor units:
- **Rate Hierarchy**:
  1. Printed FX rate on receipt (if explicitly stated)
  2. Policy FX conversion table
  3. Static fallback rates (INR, USD, EUR, GBP, CAD, AUD, JPY, AED, SGD)
- **Provenance Logging**: Stores `fxRate`, `fxDate`, `fxSource`, and `isInferred` flag. Floating-point multipliers are converted to integer minor units immediately.

---

### 3.7 Policy Schema & Conflict Detector (`policySchema.ts`)

Policies are declarative JSON documents validated using **Zod** schemas:
- **Rule Types**: `cap`, `exclusion`, `requirement`, `threshold`, `time_window`, `document`.
- **Conflict Detection**:
  - Overlapping caps with contradictory limits on identical categories/city tiers.
  - Unreachable thresholds (e.g. CFO threshold lower than Manager threshold).
  - Missing city tiers referenced by rules.
  - Rules missing source quotes from official documentation.

---

### 3.8 Policy Replay Simulator (`simulator.ts`)

Allows finance teams to model the financial impact of draft policy rules prior to deployment:
- Takes `activePolicy` and `draftPolicy`.
- Replays historical claims across both policies simultaneously.
- Generates a side-by-side comparative ledger without mutating live database records.
- Outputs delta reimbursed amount, change in touchless auto-approval rate, and per-employee variance.

---

### 3.9 Travel Transit & Trip Bundler (`tripBundler.ts`)

Clusters individual expenses into cohesive `Trip` entities:
- Identifies travel transit anchors (flights, rail, hotels).
- Clusters related meals, local transit, and incidental expenses within a 3-day proximity window.
- Assigns city tiers (`Tier-1`, `Tier-2`, `Tier-3`, `International`) deterministically.

---

## 4. Killer Feature: Expense Evidence Timeline

The **Expense Evidence Timeline** (`EvidenceTimeline.tsx`) provides an evidence-linked audit trail rather than a simple activity feed:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPENSE EVIDENCE TIMELINE                         │
├────────────────────────────────────────────────────────────────────────┤
│  ● 1. ORIGINAL RECEIPT INGESTION                                       │
│    SHA-256: 8f4a2b9e... (Verified Cryptographic Image Hash)            │
│                                                                        │
│  ● 2. EXTRACTED VALUES VS. CORRECTIONS                                 │
│    OCR Confidence: 96% | Vendor: Bistro Central | Total: ₹1,650        │
│    • Grilled Salmon: ₹1,000 (Reimbursable)                             │
│    • Craft Beer:     ₹500   (EXCLUDED: Alcohol Policy Section 3.1)     │
│    • Proportional Tax Deduction: ₹50                                   │
│                                                                        │
│  ● 3. DUPLICATE EVIDENCE AUDIT                                         │
│    Score: 0.85 (dHash Distance = 4) | Match with Claim #EXP-8821       │
│    [Inspect Side-by-Side Comparison Button]                            │
│                                                                        │
│  ● 4. POLICY CITATIONS & LEDGER SNAPSHOT                               │
│    Section 4.1 Daily Meal Cap (Tier-1): Limit ₹3,000                   │
│    Prior Day Spend: ₹2,000 | Remaining Allowance: ₹1,000               │
│    [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░] 66% Consumed                             │
│                                                                        │
│  ● 5. ANOMALY RISK SIGNALS                                             │
│    Score: 40/100 (Medium Risk) | Reason: Near-Threshold Pattern        │
│                                                                        │
│  ● 6. INTERACTIVE FIX-IT RESOLUTION                                    │
│    Employee provided missing client name: "JP Morgan"                  │
│                                                                        │
│  ● 7. FINAL HUMAN DECISION & IMMUTABLE AUDIT ENTRY                     │
│    Decision: APPROVED (₹1,100.00) | Reviewer: Finance Team            │
│    Correlation ID: corr-881249 | Immutable Hash Verified               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. End-to-End Expense Lifecycle & Data Flow

```
[Employee Client]
      │
      ├─ 1. Client-Side Preprocessing
      │     • Downscales image to max 1800px, JPEG quality 0.85.
      │     • Computes client SHA-256 & 64-bit dHash.
      │
      ├─ 2. POST /api/gemini/scan-receipt
      │     • Gemini 3.1 extracts merchant, total, currency, items.
      │     • Automatic fallback to Gemini 2.5 on quota limits.
      │
      ├─ 3. Instant Local Dry-Run Preview
      │     • Client runs `evaluator.ts` for immediate visual feedback.
      │
      ├─ 4. POST /api/expense/evaluate (Server-Authoritative)
      │     • Server re-computes and verifies SHA-256 hash.
      │     • Evaluates line exclusions, simultaneous caps, duplicates.
      │     • Computes risk score and determines final verdict.
      │
      ├─ 5. Persistence & Ledger Replay
      │     • Writes to Firestore `/orgs/{orgId}/expenses/{id}`.
      │     • Appends audit log to `/orgs/{orgId}/expenses/{id}/audit`.
      │     • Triggers chronological ledger reflow for affected dates.
      │
[Finance Review Queue]
      │
      ├─ 6. Exception-First Review
      │     • Sorted by `riskScore DESC, amount DESC`.
      │     • Clean touchless claims grouped for bulk confirmation.
      │
      └─ 7. Reviewer Action (Approve / Reject / Override / Request Info)
            • Immutable audit logging with reviewer identity and reason.
```

---

## 6. Interactive Fix-It Loop

When required data is missing (e.g., missing attendee count or business purpose), claims transition to `needs_info`. Rather than rejecting the submission, the **Fix-It Loop** enables guided resolution:

1. **Query Generation** (`/api/expense/query-employee`): The engine generates a targeted question highlighting the missing required fields.
2. **Employee Clarification**: The employee replies in free-form natural language (e.g., *"Dinner with Dr. Sharma and 2 clients from Apex Health"*).
3. **Structured Patch Extraction** (`/api/expense/parse-reply`): The parser extracts structured fields (`clientName: "Apex Health"`, `attendeeCount: 3`).
4. **User Confirmation**: The employee reviews and confirms the proposed update.
5. **Authoritative Re-Evaluation**: The system reapplies the policy engine and automatically approves the claim if all requirements are now satisfied.

---

## 7. Finance Operations & Policy Studio

- **Review Queue View (`ReviewQueueView.tsx`)**: Exception-based triage queue sorting claims by anomaly risk and claimed amount. Provides inline verdict badges and rule impact summaries.
- **Side-by-Side Duplicate Inspector (`DuplicateCompareModal.tsx`)**: Displays matching claims side-by-side with diff overlays for receipts, vendor names, dates, amounts, and perceptual hash distances.
- **Policy Studio (`PolicyStudioView.tsx`)**: Visual policy authoring tool to manage caps, exclusions, threshold tiers, and city mappings with automated conflict detection.
- **Policy Simulator (`SimulatorView.tsx`)**: Replays historical claim batches across active and proposed draft policies to forecast budget impact before activation.
- **Executive Scorecard (`ScorecardView.tsx`)**: Tracks key operational metrics:
  - **Touchless Auto-Approval Rate** (target: > 70%)
  - **Duplicate Leakage Prevention** (currency saved)
  - **Median Reimbursement Cycle Time**
  - **Audit Defense Index** (100% citation coverage)
- **Batch Export (`ExportView.tsx`)**: Generates structured CSV files and reimbursement summary packets.

---

## 8. Legacy Purchase Intelligence & Asset Protection

The platform retains full backward compatibility with original Keepr personal purchase intelligence features (accessible via `FEATURES.legacyKeepr`):

- **Receipt Vault (`VaultView.tsx`)**: Permanent cloud storage for warranties, manuals, and proof of purchase documents.
- **Automated Expiry Alerts**: Background cron job (`node-cron`) running daily at 09:00 AM scanning for upcoming warranty deadlines.
- **LangChain Email Service (`src/services/warrantyEmailService.ts`)**: Automated email alerts powered by Nodemailer.
- **AI Document Legal Audit (`/api/gemini/audit-document`)**: Analyzes legal validity, warranty coverage terms, and return window terms.
- **AI Resale Valuator (`/api/gemini/valuate-asset`)**: Estimates secondary market depreciation curves and optimal resale timing.
- **Formal Claim Generator (`/api/gemini/claim-generator`)**: Produces formal RMA claim letters citing consumer warranty rights.
- **Invoice Generator (`CreateInvoiceView.tsx`)**: Professional invoicing suite with client tax ID tracking and instant PDF rendering via `jspdf` and `html2canvas`.

---

## 9. Authoritative API Specification

All API endpoints return JSON payloads matching `{ ok: boolean, data?: any, error?: string }`.

### Core Expense Endpoints (`src/server/expenseRoutes.ts`)

| Route | Method | Description |
|---|---|---|
| `/api/expense/evaluate` | `POST` | Authoritative policy evaluation, cap computation, duplicate check, and risk scoring. |
| `/api/expense/replay` | `POST` | Chronological ledger replay across claim batches; recalculates caps and returns reflow count. |
| `/api/expense/duplicate-check`| `POST` | Runs 5-tier duplicate detection across organizational expenses. |
| `/api/expense/fraud-score` | `POST` | Computes explainable anomaly risk score (0–100) and returns neutral signal explanations. |
| `/api/expense/explain` | `POST` | Synthesizes grounded, factual explanations citing policy section quotes without hallucinations. |
| `/api/expense/query-employee` | `POST` | Generates targeted employee query for missing required fields. |
| `/api/expense/parse-reply` | `POST` | Parses natural language employee replies into structured context patches. |
| `/api/policy/conflicts` | `POST` | Runs static conflict analysis on policy rules to detect overlapping or unreachable caps. |
| `/api/policy/qa` | `POST` | Grounded policy search citing section source quotes. |
| `/api/trips/bundle` | `POST` | Deterministically clusters transit and meal receipts into Trips. |
| `/api/finance/simulate` | `POST` | Replays historical expenses against draft policies for budget impact analysis. |
| `/api/finance/batch-export` | `POST` | Generates formatted CSV exports of finalized reimbursement batches. |

### Perceptual AI Endpoints (`server.ts` / `api/index.ts`)

| Route | Method | Description |
|---|---|---|
| `/api/gemini/scan-receipt` | `POST` | Multimodal receipt extraction powered by Gemini with automatic fallback on quota limits. |
| `/api/gemini/audit-document`| `POST` | Forensic document audit analyzing warranty clauses, return policies, and tax eligibility. |
| `/api/gemini/valuate-asset` | `POST` | Evaluates hardware depreciation rates, condition grade, and resale window. |
| `/api/gemini/chat` | `POST` | Natural language purchase intelligence chat grounded in tracked receipts. |
| `/api/gemini/claim-generator`| `POST` | Generates formal warranty claim and RMA request letters. |
| `/api/gemini/return-generator`|`POST` | Generates retailer return request emails with order references. |
| `/api/warranty/send-alert` | `POST` | Sends automated warranty expiration email alerts via Nodemailer. |

---

## 10. Data Models & TypeScript Contracts

### Core Expense Interface (`src/types/expense.ts`)

```typescript
export interface Expense {
  id: string;
  orgId: string;
  employeeId: string;
  tripId?: string;
  status: ClaimStatus; // 'draft' | 'submitted' | 'processing' | 'auto_approved' | 'needs_info' | 'in_review' | 'approved' | 'partially_approved' | 'rejected' | 'paid'
  channel: 'upload' | 'camera' | 'paste' | 'batch' | 'email';
  expenseDate: string; // YYYY-MM-DD
  submittedAt: string; // ISO 8601
  receiptRef?: {
    storagePath?: string;
    previewUrl?: string;
    mimeType: string;
    originalSha256: string;
    dHash?: string;
    fileSize: number;
  };
  extracted: {
    merchant: FieldValue<string>;
    date: FieldValue<string>;
    total: FieldValue<number>;
    currency: FieldValue<string>;
    lineItems: LineItem[];
    tax?: FieldValue<number>;
    tip?: FieldValue<number>;
    orderId?: FieldValue<string>;
  };
  corrected?: {
    merchant?: string;
    date?: string;
    total?: number;
    currency?: string;
    lineItems?: LineItem[];
  };
  normalizedCurrency: {
    sourceCurrency: string;
    sourceAmountMinor: number;
    targetCurrency: string;
    targetAmountMinor: number;
    fxRate: number;
    fxSource: 'printed' | 'policy' | 'static_fallback' | 'ecb_api';
    isInferred: boolean;
  };
  context: {
    city?: string;
    cityTier?: 'Tier-1' | 'Tier-2' | 'Tier-3' | 'International';
    isTravel?: boolean;
    purpose?: string;
    clientName?: string;
    attendeeCount?: number;
    source: 'user' | 'extraction' | 'inference';
  };
  integritySignals: {
    mathMismatch: boolean;
    taxRateAnomalous: boolean;
    missingDate: boolean;
    inferredTotal: boolean;
    unitemizedBalance: number;
  };
  duplicateInfo?: DuplicateInfo;
  verdict?: Verdict;
  reviewerAction?: {
    reviewerId: string;
    reviewerName: string;
    action: 'approve' | 'reject' | 'override' | 'request_info' | 'mark_paid';
    timestamp: string;
    overrideAmountMinor?: number;
    reason: string;
  };
}
```

### Deterministic Verdict Interface

```typescript
export interface Verdict {
  decision: 'approve' | 'auto_approve' | 'partial' | 'needs_info' | 'escalate' | 'reject';
  status: ClaimStatus;
  totalAmountMinor: number;
  eligibleAmountMinor: number;
  approvedAmountMinor: number;
  rejectedAmountMinor: number;
  pendingAmountMinor: number;
  ruleImpacts: RuleCitation[];
  missingFields: string[];
  flags: RiskFlag[];
  riskScore: number; // 0..100
  riskBand: 'low' | 'medium' | 'high';
  confidence: number; // 0..1
  autoApprovable: boolean;
  policyVersionId: string;
  evaluatedAt: string;
  ledgerSnapshot?: {
    capKey: string;
    priorSpendMinor: number;
    allowanceMinor: number;
    remainingMinor: number;
    capPeriod: string;
    capScope: string;
  };
}
```

---

## 11. Security, Multi-Tenancy & Firestore Rules

Multi-tenant isolation is enforced at the database level (`firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() { return request.auth != null; }
    function getUserRole() { return request.auth.token.role != null ? request.auth.token.role : 'employee'; }
    function isFinanceOrAdmin() { return isAuthenticated() && (getUserRole() == 'finance' || getUserRole() == 'admin'); }

    match /orgs/{orgId} {
      allow read: if isAuthenticated();
      allow write: if isFinanceOrAdmin();

      match /expenses/{expenseId} {
        allow read: if isAuthenticated() && (
          resource.data.employeeId == request.auth.uid || isFinanceOrAdmin()
        );
        allow create: if isAuthenticated() && request.resource.data.employeeId == request.auth.uid;
        
        // Employees cannot update verdicts or reviewer overrides
        allow update: if isAuthenticated() && (
          isFinanceOrAdmin() ||
          (
            resource.data.employeeId == request.auth.uid &&
            !request.resource.data.diff(resource.data).affectedKeys().hasAny(['verdict', 'reviewerAction'])
          )
        );

        // Append-Only Immutability on Audit Trails
        match /audit/{eventId} {
          allow read: if isAuthenticated();
          allow create: if isAuthenticated();
          allow update, delete: if false; // STRICT IMMUTABILITY
        }
      }
    }
  }
}
```

---

## 12. Repository Structure

```
keep/
├── api/
│   └── index.ts                # Vercel serverless API entry point
├── public/                     # Static web assets
├── src/
│   ├── components/             # React UI components
│   │   ├── expense/            # Corporate Expense Auditor UI Suite
│   │   │   ├── AllClaimsView.tsx        # Organization-wide claims directory
│   │   │   ├── DuplicateCompareModal.tsx# Side-by-side duplicate evidence comparison
│   │   │   ├── EmployeesView.tsx        # Department & role directory
│   │   │   ├── EvidenceTimeline.tsx     # Evidence-linked timeline (killer feature)
│   │   │   ├── ExpenseHeader.tsx        # Role switcher & judge navigation
│   │   │   ├── ExportView.tsx           # Batch CSV & reimbursement packet exporter
│   │   │   ├── FixItModal.tsx           # Interactive missing info clarification loop
│   │   │   ├── MyCapsView.tsx           # Category & daily allowance meter cards
│   │   │   ├── MyExpensesView.tsx       # Employee expense dashboard
│   │   │   ├── PolicyStudioView.tsx     # Declarative rule editor & grounded Q&A
│   │   │   ├── ReportsView.tsx          # Compliance & audit reports
│   │   │   ├── ReviewQueueView.tsx      # Finance exception-first triage queue
│   │   │   ├── ScorecardView.tsx        # Executive touchless rate scorecard
│   │   │   ├── SimulatorView.tsx        # Policy replay & budget impact simulator
│   │   │   ├── SubmitExpenseView.tsx    # Live verdict preview submission flow
│   │   │   ├── TripsView.tsx            # Deterministic trip clusters
│   │   │   └── VerdictCard.tsx          # Full verdict breakdown card
│   │   ├── AIChatDrawer.tsx    # Conversational natural language assistant
│   │   ├── CreateInvoiceView.tsx# Invoice builder & PDF generator
│   │   ├── DashboardView.tsx   # Legacy overview dashboard
│   │   ├── PurchasesView.tsx   # Legacy asset list
│   │   ├── ReceiptScannerModal.tsx # Multimodal camera/upload scanner modal
│   │   ├── Sidebar.tsx         # Responsive primary navigation
│   │   └── VaultView.tsx       # Document legal audit vault
│   ├── config/
│   │   └── features.ts         # Feature flags (legacyKeepr, expenseAudit, demoMode)
│   ├── context/
│   │   ├── AuthContext.tsx     # User session management
│   │   └── CurrencyContext.tsx # Display currency formatter
│   ├── data/
│   │   ├── mockData.ts         # Baseline mock assets
│   │   ├── mockInvoices.ts     # Sample invoices
│   │   └── syntheticClaims.ts  # Pre-seeded test scenarios for judging
│   ├── engine/                 # Zero-dependency deterministic computation engine
│   │   ├── duplicates.ts       # 5-tier duplicate detection algorithms
│   │   ├── evaluator.ts        # 9-stage deterministic rule evaluator
│   │   ├── fx.ts               # Multi-currency normalization
│   │   ├── index.ts            # Public engine exports
│   │   ├── integrity.ts        # Arithmetic checksums & tax anomalies
│   │   ├── ledger.ts           # Chronological replay ledger
│   │   ├── policySchema.ts     # Zod policy definitions & conflict checks
│   │   ├── risk.ts             # Explainable anomaly risk scoring
│   │   ├── simulator.ts        # Policy impact replay simulator
│   │   └── tripBundler.ts      # Proximity transit trip bundler
│   ├── server/
│   │   └── expenseRoutes.ts    # Authoritative Express API endpoints
│   ├── services/               # Orchestration & data services
│   │   ├── auditService.ts     # Append-only audit logging
│   │   ├── employeeService.ts  # Employee directory & role state
│   │   ├── expenseService.ts   # Expense persistence & ledger replay
│   │   ├── policyService.ts    # Active policy version management
│   │   └── warrantyEmailService.ts # Automated email dispatch via Nodemailer
│   ├── types/
│   │   └── expense.ts          # Complete enterprise expense type system
│   ├── App.tsx                 # Root application controller & router
│   ├── firebase.ts             # Firebase client SDK initialization
│   └── main.tsx                # React DOM entry point
├── tests/
│   └── engine.test.ts          # Comprehensive Vitest test suite (10 scenarios)
├── firestore.rules             # Multi-tenant security rules
├── storage.rules               # Cloud Storage access rules
├── server.ts                   # Local Express server with Vite middleware
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel serverless deployment routing
└── vite.config.ts              # Vite bundler configuration
```

---

## 13. Environment Configuration & Deployment

### Environment Variables (`.env`)

```ini
# Google Gemini API (Supports single key, fallback keys, or comma-separated pool for automatic failover)
GEMINI_API_KEYS=key1,key2,key3
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY_FALLBACK=your_fallback_gemini_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Email Alerts (Nodemailer)
EMAIL_USER=notifications@yourdomain.com
EMAIL_PASS=your_app_password
```

### Installation & Local Execution

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (Express + Vite)
npm run dev

# 3. Execute unit test suite
npm test

# 4. Type check
npm run lint

# 5. Build for production deployment
npm run build:server
npm start
```

---

## 14. Testing & Verification Suite

The platform includes end-to-end unit coverage in `tests/engine.test.ts` validating all core engine behaviors:

1. **Proportional Line Exclusions**: Validates alcohol line item exclusion with proportional tax and tip deduction.
2. **Simultaneous Cap Resolution**: Verifies that when both daily caps and per-transaction limits apply, the most restrictive allowance governs and both rules are cited.
3. **City Tier Overrides**: Tests Tier-2 daily cap enforcement (₹1,800) vs Tier-1 (₹3,000).
4. **Interactive Fix-It Resolution**: Proves missing required fields hold amounts in `needs_info`, which immediately auto-approve upon receiving employee clarification.
5. **Threshold Escalations**: Verifies claims exceeding ₹10,000 trigger mandatory escalation to Finance.
6. **Chronological Ledger Replay & Reflow**: Demonstrates that submitting an earlier receipt after a later receipt was already approved automatically reflows the ledger and adjusts the subsequent claim's approved amount.
7. **FX Normalization**: Verifies foreign currency normalization into base minor units with recorded provenance.
8. **Arithmetic Integrity**: Flags discrepancies between itemized lines and printed receipt totals.
9. **Duplicate Detection**: Validates SHA-256 exact binary matches (score 1.0) and cross-employee shared meal signals (score 0.75).
10. **Policy Simulation**: Confirms simulation across active and draft policies without mutating live claims.
