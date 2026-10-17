# Keepr → Receipt Graveyard
## Compact implementation guide with phased coding-agent prompts

**Goal:** evolve the existing Keepr app into an organization-based expense reimbursement auditor. Work through the prompts **one at a time** in the real repository. Keep each change small, run checks after every phase, and do not claim a feature works until it is tested end-to-end.

## 1. Product and killer feature

**Product promise:** *Receipts in. Decisions out. Every decision explained.*

- **Employee:** upload/snap/paste a receipt, review extracted fields, see an instant draft verdict and remaining allowance, correct missing information, and track the claim.
- **Finance:** review exceptions first, compare duplicate evidence, approve/reject/request information, override with a reason, simulate policy changes, and inspect an audit trail.

### Killer feature — Expense Evidence Timeline

Build an evidence-linked, cross-claim timeline, not a decorative activity feed. It connects the original receipt, extracted/corrected values, policy version and rule citations, duplicate evidence, prior claims counted toward a cap, calculations, risk signals, employee replies, and final human decision. Example: two receipts are individually within a meal cap but together exceed the city's daily limit; the timeline must show both claims, the exact policy rule, prior spend, remaining allowance, the calculation and resulting action. Every finding must link to stored evidence. Retries must not duplicate events.

## 2. Non-negotiable implementation rules

1. **Hybrid AI:** Gemini may extract/classify, propose policy rules from source text, and explain known results. Deterministic TypeScript alone performs arithmetic, FX calculations, cap/threshold checks, duplicate scoring, replay and approval recommendations. Never ask an LLM to decide an amount.
2. **Traceability:** every verdict includes policy version, rule ID/section/source quote where available, input numbers, calculations, flags and evidence references. Every human override needs actor, reason and timestamp.
3. **Uncertainty is explicit:** never silently invent a field, date, currency or FX rate. Preserve raw extraction separately from user-corrected values. Low-confidence/missing critical fields go to `needs_info` or review.
4. **Neutral risk language:** anomalies mean “review recommended,” not “fraud.” Do not accuse or auto-reject based only on a risk score.
5. **Replayable ledger:** calculate caps by replaying relevant expenses in chronological order; do not rely on mutable cumulative counters. Older late submissions can change later verdicts, so record reflows.
6. **Security:** server is authoritative. Validate API inputs/outputs, enforce org/role permissions server-side and in Firebase rules, keep Gemini/SMTP secrets server-side, and preserve existing users/data. `VITE_*` values are client-visible.
7. **Idempotency:** retries must not create duplicate claims, financial effects, evaluations or audit events.
8. **Reuse, don't rebuild:** verify the code first. Keep existing Keepr functionality; hide off-topic screens behind a feature flag, do not delete or migrate legacy data.
9. **Money/time:** use integer minor units internally, round at defined boundaries, store source currency and amount plus conversion rate/source/date, and use the organization timezone for day limits.
10. **Pure engine:** `src/engine/` has no network/Firebase dependencies and is independently unit-testable. Use Zod and Vitest if compatible with the current project.

## 3. Reuse and target architecture

| Existing Keepr area | Action |
|---|---|
| `ReceiptScannerModal` + `/api/gemini/scan-receipt` | Reuse/extend for corporate claims, confidence, line items and integrity checks |
| `/api/gemini/audit-document` + `VaultView` | Repurpose for receipt legibility/integrity evidence, not policy decisions |
| `CreateInvoiceView` + PDF generator | Repurpose later for reimbursement packets/audit PDF |
| `AIClaimModal` / claim generator | Repurpose for “request missing info” messages |
| `AIChatDrawer` / Gemini chat | Extend to policy Q&A and “why flagged?” with citations |
| currency context, timeline, dashboard, analytics, command palette | Adapt for FX, claim timeline, finance metrics, search/actions |
| Firebase Auth/Firestore and purchase/invoice services | Reuse auth infrastructure; create separate expense/policy services and org-scoped data |
| warranties, returns, capital-at-risk, asset valuation | Hide from primary workspace using `FEATURES.legacyKeepr = false`; preserve code/data |

Suggested additive modules (adapt to actual conventions): `src/engine/{policySchema,evaluator,ledger,duplicates,fraud,integrity,fx,tripBundler,simulator}.ts`, `src/services/{expenseService,policyService,employeeService,auditService}.ts`, employee/finance components, and equivalent routes in both `server.ts` and `api/index.ts` if both are deployed. Keep the API implementations consistent.

### Storage and roles

Use org-scoped records, adapting names to current conventions:

```text
orgs/{orgId}
orgs/{orgId}/employees/{employeeId}
orgs/{orgId}/policies/{policyVersionId}
orgs/{orgId}/trips/{tripId}
orgs/{orgId}/expenses/{expenseId}
orgs/{orgId}/expenses/{expenseId}/audit/{eventId}  # append-only
orgs/{orgId}/fxRates/{yyyy-mm-dd}
orgs/{orgId}/simulations/{simulationId}
```

Store receipt binaries in Firebase Storage when configured; Firestore stores references/metadata, not large base64 images. In production, employees must not be able to write verdict/reviewer fields from the client; audit-event writes are append-only. Keep the guest/demo sandbox working, but make demo seed/reset explicit and safe. Roles: `employee`, `manager` (optional scoped approval), `finance`, `admin`. Employees access only their own claims; finance/admin access only their organization. Client role/org values are never authoritative.

### Core typed records

Add types centrally (`src/types.ts` or typed modules re-exported there):
- `Organization`: name, base currency, timezone, reporting-month start, active policy version and auto-approve risk threshold.
- `Employee`: org, identity, role, department/grade, home city/manager as available.
- `Expense`: org/employee/trip, status, channel, expense/submission dates, receipt ref/hash, extracted fields, normalized currency values, context, integrity, duplicate candidates, verdict, reviewer action, thread and audit refs.
- `FieldValue<T>`: `value`, confidence `0..1`, `inferred`, source (`ocr|computed|user|metadata`). Preserve raw extraction and corrected values separately.
- `LineItem`: description, quantity, unit price, amount, category, confidence, item flags (`alcohol`, `tobacco`, `personal`, `gift`, `fine_penalty`, `tip`, `minibar`, `laundry`).
- `ExpenseContext`: trip, city/tier, travel-vs-office, purpose, client name, attendee count/list and whether context came from user/extraction/inference.
- `PolicyVersion`: version/status, source text/file, declarative rules, city tiers, settings and conflict warnings.
- `Verdict`: decision, approved/rejected/pending amounts, rule impacts/citations, missing fields, flags, risk score/band, confidence, auto-approvable flag, policy version, evaluation time and ledger snapshot.
- `DuplicateInfo`: candidate claim IDs, match kind/score/evidence and resolution status.
- `AuditEvent`: stable ID/correlation ID, timestamp, actor, action, entity, change/evidence refs. Append-only.

Statuses should cover `draft`, `submitted`, `processing`, `auto_approved`, `needs_info`, `in_review`, `approved`, `partially_approved`, `rejected`, and `paid`. Use a `paid` status only when payment is recorded or explicitly simulated.

## 4. Policy schema and deterministic evaluation

Represent policies as validated JSON rules, not generated code. Use Zod. Rule types: `cap`, `exclusion`, `requirement`, `threshold`, `time_window`, `document`. Conditions should support category, travel-vs-office, city/city tier, grade/department, amount ranges and required/missing fields. Each rule needs stable `id`, human-readable `section`, title, priority, enabled state and source quote. Support:

- Per-transaction, day, week, month and trip caps; employee/category/city scopes and overrides by city tier/grade.
- Excluded categories/items/keywords/merchants; field requirements such as client name, attendee count, purpose, project/trip ID and receipt/tax details.
- Manager/finance/CFO thresholds, late-submission windows and document requirements.
- Policy PDF/text ingestion → Gemini suggests JSON + `sourceQuote` → Zod validation → deterministic conflict checks + AI ambiguity warnings → finance edits/reviews → activate version. Never invent numeric rules; ambiguous rules remain disabled and listed as ambiguities.
- Policy settings include base currency, reporting-month start, late-submission window, auto-approve risk threshold and FX table. Conditions should also support day-of-week and merchant match when present in policy.
- Policy Q&A cites rule section/source quote and says “Policy is silent on this” when no source supports the answer.
- Conflict checks for overlapping limits/exclusions/requirements, unreachable thresholds, missing city tiers and ambiguous text.

**Evaluation order:** (1) critical missing/low-confidence evidence → `needs_info`; (2) confirmed duplicate → hold/reject later same-employee submission with reason; suspected duplicate → escalate; (3) exclusions by line item; allocate tax/tip proportionally to item amounts; (4) missing requirements move affected amount to pending if policy says so; (5) caps calculate eligible amount using prior ledger usage, with the most restrictive simultaneous cap controlling and every cap cited; (6) thresholds; (7) time-window rules; (8) risk flags/high-risk escalation; (9) derive decision.

Decision examples: `reject` when nothing is eligible/pending; `needs_info` when required fields are missing; `escalate` on threshold/high risk/suspected duplicate; `partial` when some but not all eligible amount remains; otherwise `approve`. Auto-approve only if decision is approve, risk is below the configured limit (default 25) and critical-field confidence is at least 0.8. No ambiguity silently becomes approval.

**Chronological replay:** sort by `expenseDate`, then `submittedAt`, then ID. Ledger counts **approved** amounts according to the policy's defined scope; `needs_info` pending and rejected amounts do not consume allowance unless policy says otherwise. Apply reviewer overrides as fixed final amounts in replay. After create/edit/override/status change or a late older receipt, replay the affected employee/period, persist materially changed verdict snapshots and add a `ledger re-flow` audit event. Test late-arriving old claims and concurrent/retried submissions. Store integer minor units internally.

## 5. Receipt extraction, integrity, currency, duplicates and risk

### Extraction and integrity

Extend the existing Gemini endpoint with JSON/schema validation, per-field confidence, inferred/source markers, line-item category/flags, ISO currency, date ambiguity, handwriting/image-quality/rotation hints, and tampering suspicion signals. Do not let Gemini compute the printed total. Client preprocessing: fix EXIF orientation, downscale to max 1800px, JPEG quality about 0.85, optional contrast/grayscale; compute original-byte SHA-256 and normalized-image dHash (9×8 grayscale/64-bit hex). The server must recompute/verify the authoritative content hash; never trust a client-supplied hash. Preserve the original evidence.

Deterministic integrity checks: compare line-item sum + tax + tip to printed total with tolerance (1% or configured minimum); flag mismatch with exact values. If total is absent but line items and tax support a computed total, mark it `inferred` with reduced confidence. If date is missing, try supported metadata/order reference then leave unknown—never use today silently. If partially itemized, add an “Unitemized balance” with unknown category and a flag. Flag implausible tax rate (default outside 0–30%) and required missing tax IDs only when policy requires them.

### Currency

Normalize to organization base currency at transaction-date FX. Source order: printed rate, policy FX table, clearly marked static demo fallback (INR, USD, EUR, GBP, CAD, AUD, JPY, AED, SGD), optional cached server-side FX API. Store rate, date, source and whether inferred; apply caps in base currency while showing the source and converted amount. Never guess a rate silently.

### Duplicate detection

Compare organization claims in an appropriate date window, indexed by employee, canonical merchant, amount/date and receipt/order IDs:
- Same SHA-256: score `1.00`, exact duplicate/idempotent.
- Same normalized order ID + merchant: `0.95`; same employee can be confirmed, cross-employee should remain suspected.
- dHash Hamming distance ≤6: `0.85`, suspected.
- Same employee + canonical merchant + amount within ₹1/0.5% + date ±1 day: `0.80`, suspected.
- Cross-employee shared meal: merchant/amount within ~2%, same date/time within ~30 min: ~`0.75`, suspected only.

Score ≥0.95 is generally confirmed only when the evidence supports it; ≥0.70 is suspected. Store matched fields, score, claim refs and evidence text. Earlier submission normally wins; finance can mark “not a duplicate” and suppress repeat flags with an audit event. A match is not proof of fraud.

### Explainable anomaly risk

Use deterministic weighted signals and cap risk at 100; default bands: 0–24 low, 25–59 medium, 60+ high. Seed signals: suspected duplicate +40; repeated just-under-threshold pattern +20/35; round amount without tax +8; weekend non-travel +10; location/trip mismatch +20; merchant/category mismatch +25; math mismatch +20; suspected tampering +30; peer spend outlier +15 (only with enough comparable data); off-hours meal +8; split transactions just under a cap +30; >30-day submission lag +10; poor legibility on high-value claim +10. Make weights configurable/tested and show reasons neutrally. Only enable signals backed by data.

Gemini explanations receive only structured verdict reasons/flags/amounts and may not add facts. Reject an explanation if it introduces numbers not in the supplied input; use deterministic templates if Gemini is unavailable.

## 6. API and UI contract

Validate all request/response payloads (including a sensible upload limit, e.g. 10 MB) and return `{ ok, data?, error? }`. Keep `server.ts` and `api/index.ts` behavior aligned. Add/fill these endpoints as needed:

- `/api/gemini/scan-receipt` (extend), `/api/gemini/audit-document` (reuse)
- `/api/policy/ingest`, `/api/policy/conflicts`, `/api/policy/qa`
- `/api/expense/evaluate`, `/api/expense/replay`, `/api/expense/duplicate-check`, `/api/expense/fraud-score`, `/api/expense/explain`, `/api/expense/query-employee`, `/api/expense/parse-reply`
- `/api/trips/bundle`, `/api/finance/simulate`, `/api/finance/batch-export`, `/api/finance/digest`, `/api/gemini/chat` (role-aware extension)

The client engine can provide an instant **dry-run** preview, but the server evaluation is authoritative and persisted. Use rate limiting/cache for AI calls, handle 429/failure and provide deterministic fallback where possible.

**Employee navigation:** My Expenses, Submit Receipt, My Caps, Trips, Messages. In explicit `DEMO_MODE` only, provide a judge-friendly role switcher; never treat it as production authorization. Submit flow: capture → extract/edit → live verdict preview → submit. Show low-confidence fields in amber, per-category/day/month caps, and a “fix it” thread. Employee reply parsing (text; voice optional) proposes a structured patch, asks the user to confirm it, then re-evaluates and records events.

**Finance navigation:** Review Queue, All Expenses, Policy Studio, Simulator, Analytics/Scorecard, Duplicates, Export. Keep Command Palette actions/search for expense claims, employees and rules (e.g., flagged expenses this week or claims above a threshold). Queue sorts `riskScore desc, amount desc`; clean auto-approved items can be collapsed/bulk-confirmed. Verdict card shows decision, approved/rejected/pending amounts, item-level statuses, rule citations, exact math, ledger meters, confidence/highlighted fields, neutral risk reasons, related claims, reviewer actions and audit trail. Reject/override needs a reason. Keyboard queue controls are optional polish.

**Trip bundling:** deterministic clustering first using air/rail/lodging dates and matching cities; mark inferred context as inferred. AI may suggest trip names/ambiguous association, but user can edit/merge/split. Unknown city tier is not silently guessed; require info only if policy depends on it.

**Policy Studio/simulator:** edit/validate draft rules; show conflicts/ambiguous policy text; activate version only after finance confirmation. Simulator replays a month with active and draft policies and compares reimbursed totals, verdict changes, per-employee impact and touchless-rate delta without changing live claims.

## 7. Prompts — run individually in order

### Prompt 0 — Inspect repository and prepare foundation only

```text
Read this guide first. Inspect the actual Keepr repository, scripts, components, routes, auth, Firestore/Storage rules, AI endpoints, env vars and tests; do not trust README claims without checking code. Summarize the current architecture and risks, then make only foundation changes: add an expense feature flag that hides (does not delete) legacy views; add typed expense/policy/verdict/audit contracts and validation; create isolated engine/service/component boundaries; add honest placeholder routes for employee and finance areas; define org-scoped storage and role-authorization plan; add demo fixture format and concise implementation docs. Reuse the existing stack and scanner. Do not implement complete workflows yet. Do not migrate/delete data, expose secrets, loosen security rules or show fake success/metrics. Run existing tests, typecheck, lint and build; report changed files, blockers and exact next step.
```

### Prompt 1 — Policy schema, deterministic evaluator and ledger (critical)

```text
Implement only the pure, tested policy core described in this guide: Zod policy schema/conditions; declarative cap, exclusion, requirement, threshold, time-window and document rules; sample policy; evaluator with the specified order, item-level exclusion and proportional tax/tip, partial approval, missing-info pending amounts, simultaneous caps (most restrictive wins), rule citations and risk/threshold routing; integer-minor-unit calculations; chronological per-employee replay with day/week/month/trip ledger keys and override inputs. The engine must have no network/Firebase dependencies. Replay sort is expenseDate, submittedAt, ID; late claims reflow later verdicts and create events only when materially changed. Add Vitest tests for every core edge case listed in this guide, including rounding, per-person cap, zero cap, city override, alcohol/tax split, two caps, missing client info then correction, thresholds and late receipt reflow. Build a temporary fixture harness if UI/data is not ready. Do not implement UI or AI policy ingestion in this phase. Run tests/typecheck/build and report supported rule types and gaps.
```

### Prompt 2 — Receipt extraction, image prep, integrity and FX

```text
Extend Keepr's existing scan endpoint; do not build a second scanner. Add typed/schema-validated extraction of merchant/date/time/currency/total/subtotal/tax/tip/order ID, line items, categories/item flags, per-field confidence/source/inferred status, date ambiguity and image-quality/handwriting/rotation/tampering hints where supported. Gemini reads printed values; deterministic code checks arithmetic and never trusts model-computed totals. Implement EXIF orientation, resize/JPEG preprocessing, original SHA-256 and dHash, explicit missing/inferred fields, partial-itemization and tax anomalies, and transaction-date FX normalization with recorded rate/source/date and flagged demo fallback. Preserve original, raw extraction and corrections separately. Handle malformed output, timeout/quota and retries without fabricated records. Add fixtures/tests for rotated/faded, handwritten/partial, missing total/date, ambiguous currency, bad math, inferred total, FX fallback and AI failure. Keep keys server-only; run checks and state exactly what works.
```

### Prompt 3 — Duplicate detection and risk scoring

```text
Implement the duplicate and anomaly modules only. Use server-side SHA-256 exact matching; normalized orderId+merchant; dHash perceptual matching; same-employee merchant/amount/date matching; and cross-employee shared-meal signals with conservative thresholds as specified in this guide. Store candidate claim IDs, match kind/score/evidence, detector version, resolution and reviewer dismissal; earlier submission normally wins. Add deterministic integrity/location/trip/category/threshold-splitting/time-lag/legibility signals and a capped weighted 0–100 risk score with neutral wording. Do not call anything “fraud,” and don't reject on risk alone. Keep duplicate eligibility separate from policy eligibility. Make reviewer “not duplicate” suppress re-flagging. Test exact and near duplicates, same amount but distinct purchase, shared meal, dismissal, math mismatch and retries. Only report precision/recall if a labeled dataset exists. Run checks and report enabled signals and limitations.
```

### Prompt 4 — Organization-secure employee flow and fix-it loop

```text
Implement the employee claim flow using existing auth/scanner and the completed engine modules. Enforce org membership/role in APIs and Firebase rules, not only UI. Add trips and claims with receipt storage references, original files, submit/edit/status lifecycle and idempotent processing. Build Submit Receipt (upload/camera/paste), extraction preview with editable confidence-highlighted fields, instant client dry-run verdict, server-authoritative evaluation on submit, My Expenses, My Caps and claim detail. Add needs-info message generation and a text reply parser that proposes a typed context patch; require employee confirmation before applying, then re-evaluate/replay and append audit events. Voice input can be a later optional layer. Keep raw extraction/corrected values distinct; never fake success. Test employee ownership, upload validation, retries, missing info → reply → revised verdict and access denial. Run checks.
```

### Prompt 5 — Finance review queue and decisions

```text
Implement the finance workflow over persisted server verdicts. Add risk/amount-sorted Review Queue, filters, status tabs, All Expenses, Verdict Card, receipt viewer with highlighted low-confidence fields, Duplicate Compare, reviewer comments and audit history. Show item-level approved/rejected/pending amounts, math, cap meters, rule citations/source quotes, policy version, risk reasons and related claims. Support approve, reject (reason required), request info, confirm/dismiss duplicate, override amount (reason required) and mark paid only when recorded or demo-labelled. Auto-approval must follow configured risk/confidence thresholds; bulk action must apply only to eligible records. Validate every action server-side, preserve prior evaluation snapshots and append actor/timestamp/reason events. Test roles, invalid transitions, stale/repeated actions and override replay. Run checks; no UI-only decisions.
```

### Prompt 6 — Policy ingestion, Policy Studio, Q&A/conflicts and simulator

```text
Implement policy admin tools only. Ingest PDF/text, extract source text, ask Gemini for JSON declarative rules with sourceQuote and ambiguities, validate with Zod, retry once on schema errors, then run deterministic overlap/conflict checks plus AI text-ambiguity suggestions. Ambiguous numeric rules remain disabled; never invent limits. Build Policy Studio for finance to inspect/edit draft rules, see source quotes/conflicts, test examples and activate a version explicitly. Add policy Q&A grounded only in source text/rules; cite section/sourceQuote and say when policy is silent. Add a simulator that replays a selected month using active vs draft policy and reports total amount delta, changed verdicts/reasons, per-employee impact and touchless-rate delta without mutating live claims. Test invalid schema, conflicts, unsupported policy question, versioning and no live mutation. Run checks and document any unsupported rule form.
```

### Prompt 7 — Trip bundling and Expense Evidence Timeline

```text
Implement deterministic trip bundling and the Expense Evidence Timeline. Bundle air/rail/lodging and nearby same-city expenses by date; tag inferred context and allow users to edit/merge/split trips. Build the timeline solely from real persisted upload, extraction, correction, evaluation, duplicate, ledger reflow, employee reply, policy and reviewer events. Each event must link to receipt/field, rule + source quote, calculation inputs, related claims/match evidence or human action; distinguish system recommendation from final human decision. Preserve earlier snapshots; use stable event/correlation IDs and idempotent writes. Add the demo case where two individually acceptable meals cross a city/day cap, plus duplicate and override chains. Test evidence links, chronology, reflow, permissions and retry dedupe. Do not use static mock timeline entries. Run checks.
```

### Prompt 8 — Demo dataset, batch import, scorecard and exports

```text
Build repeatable demo/evaluation tooling. Seed about 60 synthetic claims for 6 fake employees across one month, with labeled expected verdicts/amounts/flags and local synthetic receipt images. Cover exact and re-photographed duplicates, cross-employee shared meal, alcohol partial approval with proportional tax, repeated just-under-threshold claims, USD/EUR conversion and ambiguous currency, handwritten/blurred, bad math, missing date/total, daily cap sequence, office vs travel meals, late submission, location/category mismatch, peer outlier and multi-city trip. Add batch intake with per-file status and safe partial retry; add an optional simulated forwarded-email ingestion action if time permits. Extend Command Palette semantic search/actions across expenses, employees and rules. Add “Run benchmark” from fixtures vs labels: decision/amount accuracy, extraction field accuracy when labelled, duplicate precision/recall, flag precision/recall, false clears/flags, touchless rate, estimated time saved and amount protected. Compute all metrics from actual results; target benchmark runtime under 5 seconds for the seeded dataset, show sample size and do not claim production accuracy. Add dashboard metrics, safe demo-only reset, approved-batch CSV (Tally optional), reimbursement/audit PDF and monthly digest if time allows. Test fixture repeatability, partial failures, metrics and reset safety. Run checks.
```

### Prompt 9 — Security, resilience and final regression

```text
Perform a hardening/regression pass only. Verify Firebase org isolation and Storage authorization; direct API role checks; employee ownership; server-only Gemini/SMTP keys; upload size/type validation; PII-redacted logs; Zod validation; rate limiting/caching; 429/timeouts/invalid JSON fallbacks; retries/idempotency/concurrency; immutable audit history; explicit FX provenance; local-date/timezone behavior; integer money arithmetic; policy-version replay; and accessible/mobile loading/empty/error states. Ensure suspiciousness alone never accuses or automatically rejects and approval is not marked paid without evidence. Run unit/integration/Firebase rule tests, lint, typecheck and production build. Regression-test retained purchase/warranty/return/invoice features. Fix defects, list unresolved risks, report actual pass/fail and verify the full demo flow. Do not claim production readiness or certification.
```

## 8. Demo data, benchmark and acceptance criteria

Create about **60 synthetic expenses / 6 employees / one month** with a `labels.json` ground truth. Required cases: exact duplicate; re-photographed duplicate; shared meal claimed by two employees; alcohol line with proportional tax; three claims just under a threshold; USD/EUR and ambiguous currency; handwritten/blurry receipt; math mismatch; missing date and inferable missing total; five same-day Tier-A meals that cumulatively exceed a cap; office meal without client vs travel meal; late submission; weekend non-travel; restaurant with electronics items; peer outlier; flight/hotel/cabs/meals across two cities. Keep all data synthetic and reset restricted to the demo org.

Scorecard metrics, computed from engine output vs labels: touchless rate (suggested target ≥60%, not a guarantee), decision accuracy, approved-amount MAE, extraction field accuracy where labelled, per-flag precision/recall, duplicate recall, false-clear/false-flag counts, estimated time saved (assumption: 4 minutes per manually reviewed receipt), amount prevented from reimbursement, and percentage of decisions with rule citations (target 100%). Never hardcode results or present test-set performance as production performance.

### Main five-minute demo

1. Employee submits a slightly blurry travel dinner receipt with an alcohol line and missing client/attendee context; uncertain fields are highlighted.
2. The engine excludes the alcohol plus proportional tax, holds the policy-dependent amount, and requests missing information with cited rules.
3. Employee confirms a parsed reply; the expense is replayed and the verdict/cap meter updates.
4. Finance opens a high-risk cross-employee shared-meal candidate and sees the comparison evidence and neutral reasons.
5. Finance lowers a city-tier cap in Policy Studio, simulates the month, inspects changed verdicts and then discards or activates the draft.
6. Run the labeled benchmark; show measured scorecard. Closing message: **“AI reads and explains; deterministic code decides. Every decision is traceable.”**

## 9. Global definition of done

- Existing app and legacy data/features still work; unrelated views are merely hidden from the new workspace.
- Employee/finance/admin access is enforced server-side and in Firebase rules.
- Extraction preserves evidence, uncertainty and corrections; explicit FX normalization works.
- Versioned policy engine supports required fields, exclusions, partial approvals, layered/city caps, thresholds, office/travel context and chronological cumulative replay with tests.
- Exact and at least metadata/perceptual duplicate checks plus neutral risk reasons work.
- Review actions, fix-it loop, trip context, policy studio/Q&A/conflicts, simulator and evidence timeline are implemented and tested.
- Demo benchmark is repeatable and metrics come from actual fixture results.
- All verdicts carry policy/version/citations and an append-only audit history; retries do not duplicate effects.
- Test/typecheck/lint/build results and remaining limitations are reported honestly.

**Cut order if time is short:** voice input → email/WhatsApp ingestion → Tally export → advanced peer outlier → audit PDF/monthly digest → trip editing polish. **Never cut:** pure deterministic engine and tests, rule citations, cumulative caps/replay, partial approvals, duplicate evidence, finance review/overrides, append-only audit trail, Expense Evidence Timeline, and a labeled benchmark.
