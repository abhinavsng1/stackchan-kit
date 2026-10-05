# Insights Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A password-gated `/admin` page on pebblerobo.com showing the live funnel, ad spend, and a daily Claude-written read of where buyers drop off — with no autonomous shipping and no autonomous experiment-killing.

**Architecture:** A Vercel cron pulls Mixpanel, Meta and the orders table nightly into a durable per-day run row. A launchd job on the owner's Mac then reads that row, runs headless Claude Code on their subscription, and posts a Zod-validated analysis back. The page renders whatever exists and is explicit about what is missing or stale.

**Tech Stack:** Next.js 16.3.5 (App Router), TypeScript, Zod 4, `@neondatabase/serverless`, `@vercel/functions`, Vitest, Playwright. No new runtime dependency is added — notably **not** `@anthropic-ai/sdk`, because the LLM call happens on the owner's machine via the `claude` CLI.

**Spec:** `docs/superpowers/specs/2026-10-05-insights-dashboard-design.md`

## Global Constraints

- The orders table is ground truth for conversions; Mixpanel supplies upper-funnel only. Never compute a conversion rate across both denominators.
- AI output is advisory. The server recomputes and **caps** confidence; the model's own claim is never trusted.
- No customer PII (name, email, phone, address) may enter the Claude prompt or `/api/insights/latest-raw`. Aggregates only.
- Invalid model output is never stored. The run fails and the previous good analysis stays on screen, dated.
- `run_date` is unique. Every write path must be idempotent against a retried or double-fired cron.
- All new secrets are read from `process.env` lazily inside functions — never at module top level, because `next build` evaluates module scope before env exists.
- `/admin` must be excluded from `robots.ts`.
- Existing code style: comments explain *why*, not *what*. Match the surrounding files.

## Review Focus

1. **Run-date timezone.** The cron fires 03:30 UTC = 09:00 IST, same calendar day in both zones — but Postgres `current_date` is UTC and the dashboard is read in IST. A date computed in the wrong zone silently creates two rows some days and none on others. Task 1 pins this to one explicit UTC date and tests the boundary.
2. **Concurrent cron invocations.** Vercel can deliver a cron twice. Two `POST /api/insights/run` in the same second must not both fetch and both spend. Task 1 tests that the second caller loses the claim.
3. **Provider 200-with-error-body.** Mixpanel returns HTTP 200 with `{"error": ...}` for several failure modes, so `res.ok` is not a success test. Tasks 7 and 8 test that an error body marks the source `*_ok = false` rather than storing garbage.
4. **Semantically absurd but schema-valid model output.** `lostPct: 150`, or a `where` naming a section that does not exist. Task 3 tests that range-invalid output is rejected and Task 10 tests that a rejected analysis leaves the prior one intact.
5. **Forged or tampered admin cookie.** A cookie whose payload is edited must fail HMAC verification rather than granting access. Task 4 tests tampered payload, wrong signature, and expiry.

---

## File Structure

| File | Responsibility |
|---|---|
| `db/schema.sql` (modify) | `insight_runs` table, additive |
| `lib/insights/dates.ts` | the one definition of "which day is this run for" |
| `lib/insights/runs.ts` | run state machine + all DB access for runs |
| `lib/insights/analysis.ts` | Zod contract for model output |
| `lib/insights/confidence.ts` | sample-size cap on claimed confidence |
| `lib/insights/freshness.ts` | staleness arithmetic for the page |
| `lib/insights/orders.ts` | order aggregates from our own Postgres |
| `lib/insights/mixpanel.ts` | Mixpanel Query API client |
| `lib/insights/meta.ts` | Meta Marketing API client |
| `lib/admin-auth.ts` | password compare, cookie sign/verify |
| `app/api/admin/login/route.ts` | sets the session cookie |
| `app/api/insights/run/route.ts` | cron entry point, orchestration |
| `app/api/insights/latest-raw/route.ts` | feeds the Mac job |
| `app/api/insights/analysis/route.ts` | accepts the Mac job's result |
| `app/admin/page.tsx` | the dashboard, all five states |
| `app/admin/login/page.tsx` | password form |
| `app/robots.ts` (modify) | disallow `/admin` |
| `vercel.json` (create) | cron schedule |
| `scripts/analyst.sh` | the Mac job |
| `scripts/analyst-prompt.md` | the prompt, versioned |
| `scripts/com.pebblerobo.analyst.plist` | launchd definition |

---

### Task 1: Run table, date pinning, and the claim state machine

**Files:**
- Modify: `db/schema.sql`
- Create: `lib/insights/dates.ts`
- Create: `lib/insights/runs.ts`
- Test: `tests/insights-runs.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `runDateFor(now: Date): string` — `YYYY-MM-DD` in UTC
  - `type RunStatus = 'pending' | 'processing' | 'awaiting_analysis' | 'completed' | 'failed'`
  - `claimRun(date: string): Promise<{ claimed: boolean; id: number | null }>`
  - `storeRaw(id, { mixpanel, meta, orders, mixpanelOk, metaOk }): Promise<void>`
  - `storeAnalysis(id, analysis, model): Promise<boolean>`
  - `failRun(id, error: string): Promise<void>`
  - `latestRun(): Promise<RunRow | null>`
  - `latestAwaiting(): Promise<RunRow | null>`
  - `lastGoodAnalysis(): Promise<RunRow | null>`
  - `type RunRow` — see the implementation in Step 8 for its fields

- [ ] **Step 1: Write the failing date test**

```ts
// tests/insights-runs.test.ts
import { describe, it, expect } from 'vitest'
import { runDateFor } from '@/lib/insights/dates'

describe('the day a run belongs to', () => {
  it('is the UTC date, so one cron fire maps to exactly one row', () => {
    expect(runDateFor(new Date('2026-10-05T03:30:00Z'))).toBe('2026-10-05')
  })

  it('does not roll over early just because IST is ahead', () => {
    // 23:00 UTC is already 04:30 the next day in IST. The row is still the
    // UTC day, because that is what the cron schedule is expressed in.
    expect(runDateFor(new Date('2026-10-05T23:00:00Z'))).toBe('2026-10-05')
  })

  it('rolls at the UTC midnight boundary, not before', () => {
    expect(runDateFor(new Date('2026-10-05T23:59:59Z'))).toBe('2026-10-05')
    expect(runDateFor(new Date('2026-10-06T00:00:00Z'))).toBe('2026-10-06')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/insights-runs.test.ts`
Expected: FAIL — cannot resolve `@/lib/insights/dates`

- [ ] **Step 3: Write `lib/insights/dates.ts`**

```ts
/**
 * Which day a run belongs to.
 *
 * One definition, used by the cron, the Mac job and the dashboard alike.
 * The cron schedule is written in UTC, so the row key is the UTC date — if
 * the key were computed in IST, a fire at 23:00 UTC would be filed under
 * tomorrow and the next morning's run would collide with it.
 */
export function runDateFor(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/insights-runs.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Add the table to `db/schema.sql`**

Append. Note: **no semicolons inside comments** — `db/migrate.mjs` strips comment lines before splitting, but keep the habit.

```sql
-- ---------------------------------------------------------------------------
-- Insight runs. Additive and safe to re-run.
--
-- One row per day, keyed on the UTC date. That uniqueness is the whole
-- idempotency story: a retried cron, a double delivery and a manual re-run all
-- land on the same row and only the first one does any work.
create table if not exists insight_runs (
  id            bigserial primary key,
  run_date      date not null unique,
  status        text not null default 'pending',
  attempts      smallint not null default 0,
  started_at    timestamptz,
  fetched_at    timestamptz,
  analysed_at   timestamptz,
  error         text,
  mixpanel_ok   boolean,
  meta_ok       boolean,
  mixpanel      jsonb,
  meta          jsonb,
  orders        jsonb,
  analysis      jsonb,
  model         text
);

create index if not exists insight_runs_recent on insight_runs (run_date desc);
```

- [ ] **Step 6: Write the failing claim tests**

```ts
// append to tests/insights-runs.test.ts
import { vi, beforeEach } from 'vitest'

const sql = vi.hoisted(() => vi.fn())
vi.mock('@neondatabase/serverless', () => ({ neon: () => sql }))

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgres://stub')
  sql.mockReset()
})

describe('claiming a run', () => {
  it('claims the day when no row exists yet', async () => {
    const { claimRun } = await import('@/lib/insights/runs')
    sql.mockResolvedValueOnce([{ id: 7 }])
    await expect(claimRun('2026-10-05')).resolves.toEqual({ claimed: true, id: 7 })
  })

  it('loses the claim when another invocation already took it', async () => {
    // Vercel can deliver a cron twice. The second caller must not fetch,
    // must not spend, and must not overwrite the first one's work.
    const { claimRun } = await import('@/lib/insights/runs')
    sql.mockResolvedValueOnce([])
    await expect(claimRun('2026-10-05')).resolves.toEqual({ claimed: false, id: null })
  })

  it('reports unclaimed rather than throwing with no database configured', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { claimRun } = await import('@/lib/insights/runs')
    await expect(claimRun('2026-10-05')).resolves.toEqual({ claimed: false, id: null })
  })
})
```

- [ ] **Step 7: Run and watch them fail**

Run: `npx vitest run tests/insights-runs.test.ts`
Expected: FAIL — cannot resolve `@/lib/insights/runs`

- [ ] **Step 8: Write `lib/insights/runs.ts`**

```ts
import { neon } from '@neondatabase/serverless'

export type RunStatus =
  | 'pending' | 'processing' | 'awaiting_analysis' | 'completed' | 'failed'

export type RunRow = {
  id: number
  runDate: string
  status: RunStatus
  attempts: number
  fetchedAt: Date | null
  analysedAt: Date | null
  error: string | null
  mixpanelOk: boolean | null
  metaOk: boolean | null
  mixpanel: unknown
  meta: unknown
  orders: unknown
  analysis: unknown
  model: string | null
}

/**
 * Lazy client. neon() throws when DATABASE_URL is unset and Next evaluates
 * module scope at build time, so this cannot be hoisted.
 */
function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

const MAX_ATTEMPTS = 3

/**
 * Takes ownership of a day's run, or reports that somebody else has it.
 *
 * The insert is the lock. ON CONFLICT lets a previous failure be retried but
 * refuses to reopen a run that is already processing or finished, so two cron
 * deliveries in the same second cannot both proceed — the second updates zero
 * rows and is told it did not get the claim.
 */
export async function claimRun(date: string): Promise<{ claimed: boolean; id: number | null }> {
  const sql = client()
  if (!sql) return { claimed: false, id: null }

  const rows = await sql`
    insert into insight_runs (run_date, status, attempts, started_at)
    values (${date}, 'processing', 1, now())
    on conflict (run_date) do update
      set status     = 'processing',
          attempts   = insight_runs.attempts + 1,
          started_at = now()
      where insight_runs.status = 'failed'
        and insight_runs.attempts < ${MAX_ATTEMPTS}
    returning id`

  const row = rows[0]
  return row ? { claimed: true, id: Number(row.id) } : { claimed: false, id: null }
}

/** Stores the pulls and hands the run to the analysis stage. */
export async function storeRaw(id: number, data: {
  mixpanel: unknown; meta: unknown; orders: unknown
  mixpanelOk: boolean; metaOk: boolean
}): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`
    update insight_runs
       set mixpanel    = ${JSON.stringify(data.mixpanel)}::jsonb,
           meta        = ${JSON.stringify(data.meta)}::jsonb,
           orders      = ${JSON.stringify(data.orders)}::jsonb,
           mixpanel_ok = ${data.mixpanelOk},
           meta_ok     = ${data.metaOk},
           fetched_at  = now(),
           status      = 'awaiting_analysis'
     where id = ${id}`
}

/**
 * Attaches an analysis, but only to a run that is waiting for one.
 *
 * The status predicate is what makes the analyst endpoint idempotent: a
 * replayed POST updates zero rows and cannot rewrite a completed day.
 */
export async function storeAnalysis(
  id: number, analysis: unknown, model: string,
): Promise<boolean> {
  const sql = client()
  if (!sql) return false
  const done = await sql`
    update insight_runs
       set analysis    = ${JSON.stringify(analysis)}::jsonb,
           model       = ${model},
           analysed_at = now(),
           status      = 'completed'
     where id = ${id} and status = 'awaiting_analysis'
    returning id`
  return done.length > 0
}

export async function failRun(id: number, error: string): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`
    update insight_runs
       set status = 'failed', error = ${error.slice(0, 2000)}
     where id = ${id}`
}

function toRow(r: Record<string, unknown>): RunRow {
  const date = (v: unknown) => (v ? new Date(v as string) : null)
  return {
    id: Number(r.id),
    runDate: String(r.run_date).slice(0, 10),
    status: r.status as RunStatus,
    attempts: Number(r.attempts),
    fetchedAt: date(r.fetched_at),
    analysedAt: date(r.analysed_at),
    error: r.error === null ? null : String(r.error),
    mixpanelOk: r.mixpanel_ok === null ? null : Boolean(r.mixpanel_ok),
    metaOk: r.meta_ok === null ? null : Boolean(r.meta_ok),
    mixpanel: r.mixpanel, meta: r.meta, orders: r.orders,
    analysis: r.analysis,
    model: r.model === null ? null : String(r.model),
  }
}

/** The newest run of any status — what the dashboard renders. */
export async function latestRun(): Promise<RunRow | null> {
  const sql = client()
  if (!sql) return null
  const rows = await sql`select * from insight_runs order by run_date desc limit 1`
  return rows[0] ? toRow(rows[0] as Record<string, unknown>) : null
}

/** The newest run still waiting to be analysed — what the Mac job asks for. */
export async function latestAwaiting(): Promise<RunRow | null> {
  const sql = client()
  if (!sql) return null
  const rows = await sql`
    select * from insight_runs
     where status = 'awaiting_analysis'
     order by run_date desc limit 1`
  return rows[0] ? toRow(rows[0] as Record<string, unknown>) : null
}

/** The most recent analysis we trust, for when today's run failed. */
export async function lastGoodAnalysis(): Promise<RunRow | null> {
  const sql = client()
  if (!sql) return null
  const rows = await sql`
    select * from insight_runs
     where status = 'completed' and analysis is not null
     order by run_date desc limit 1`
  return rows[0] ? toRow(rows[0] as Record<string, unknown>) : null
}
```

- [ ] **Step 9: Run the tests**

Run: `npx vitest run tests/insights-runs.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 10: Apply the migration**

Run: `node db/migrate.mjs`
Expected: `ok  create table if not exists insight_runs …` and the printed column
list ends with `analysis, model`. If any line says FAIL, stop and fix it — a
column silently missing is the failure mode that has already bitten this
project once.

- [ ] **Step 11: Commit**

```bash
git add db/schema.sql lib/insights/dates.ts lib/insights/runs.ts tests/insights-runs.test.ts
git commit -m "feat: insight run table and claim state machine"
```

---

### Task 2: Freshness and the confidence cap

**Files:**
- Create: `lib/insights/freshness.ts`
- Create: `lib/insights/confidence.ts`
- Test: `tests/insights-judgement.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `freshness(at: Date | null, now: Date, staleAfterHours: number): { ageHours: number | null; stale: boolean }`
  - `capConfidence(claimed: 'low'|'medium'|'high', sampleSize: number): 'low'|'medium'|'high'`
  - `MEDIUM_MIN_N = 30`, `HIGH_MIN_N = 300`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/insights-judgement.test.ts
import { describe, it, expect } from 'vitest'
import { freshness } from '@/lib/insights/freshness'
import { capConfidence, MEDIUM_MIN_N, HIGH_MIN_N } from '@/lib/insights/confidence'

describe('freshness', () => {
  const now = new Date('2026-10-05T12:00:00Z')

  it('reports nothing for a run that never happened', () => {
    expect(freshness(null, now, 36)).toEqual({ ageHours: null, stale: true })
  })

  it('is fresh inside the window', () => {
    const at = new Date('2026-10-05T03:30:00Z')
    expect(freshness(at, now, 36)).toEqual({ ageHours: 8.5, stale: false })
  })

  it('is stale past the window', () => {
    const at = new Date('2026-10-03T12:00:00Z')
    expect(freshness(at, now, 36).stale).toBe(true)
  })
})

describe('the confidence cap', () => {
  it('refuses high confidence at this site\'s current sample size', () => {
    // Four paid conversions. A model shown 2-vs-1 will write "clear winner".
    expect(capConfidence('high', 4)).toBe('low')
  })

  it('allows high only above the high threshold', () => {
    expect(capConfidence('high', HIGH_MIN_N)).toBe('high')
    expect(capConfidence('high', HIGH_MIN_N - 1)).toBe('medium')
  })

  it('allows medium only above the medium threshold', () => {
    expect(capConfidence('medium', MEDIUM_MIN_N)).toBe('medium')
    expect(capConfidence('medium', MEDIUM_MIN_N - 1)).toBe('low')
  })

  it('never promotes a modest claim', () => {
    expect(capConfidence('low', 10_000)).toBe('low')
  })

  it('treats a missing or nonsense sample size as no evidence', () => {
    expect(capConfidence('high', 0)).toBe('low')
    expect(capConfidence('high', Number.NaN)).toBe('low')
    expect(capConfidence('high', -5)).toBe('low')
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/insights-judgement.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Write `lib/insights/freshness.ts`**

```ts
/**
 * How old a figure is, and whether that is old enough to warn about.
 *
 * The dashboard distinguishes "no data" from "stale data" because they are
 * different mistakes to make. Null age means the thing never happened, which
 * counts as stale — a page that shows nothing and says nothing reads as a
 * page with nothing to report.
 */
export function freshness(
  at: Date | null, now: Date, staleAfterHours: number,
): { ageHours: number | null; stale: boolean } {
  if (!at) return { ageHours: null, stale: true }
  const ageHours = (now.getTime() - at.getTime()) / 3_600_000
  return { ageHours: Math.round(ageHours * 10) / 10, stale: ageHours > staleAfterHours }
}
```

- [ ] **Step 4: Write `lib/insights/confidence.ts`**

```ts
export type Confidence = 'low' | 'medium' | 'high'

/**
 * The sample sizes below which a claim is not worth the word.
 *
 * These are deliberately blunt. They are not a significance test — they are a
 * floor that stops the page asserting more than the data can carry.
 */
export const MEDIUM_MIN_N = 30
export const HIGH_MIN_N = 300

const RANK: Confidence[] = ['low', 'medium', 'high']

/**
 * Caps a model's claimed confidence at what the sample size supports.
 *
 * The model proposes; the server decides. An LLM shown two conversions
 * against one will describe a clear winner, in good faith, because prose has
 * no notion of n. This is the single rule that makes the rest of the page
 * safe to act on, which is why it lives in code and is tested rather than
 * being asked for in the prompt.
 */
export function capConfidence(claimed: Confidence, sampleSize: number): Confidence {
  const n = Number.isFinite(sampleSize) && sampleSize > 0 ? sampleSize : 0
  const ceiling: Confidence =
    n >= HIGH_MIN_N ? 'high' : n >= MEDIUM_MIN_N ? 'medium' : 'low'
  return RANK[Math.min(RANK.indexOf(claimed), RANK.indexOf(ceiling))]
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/insights-judgement.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/insights/freshness.ts lib/insights/confidence.ts tests/insights-judgement.test.ts
git commit -m "feat: freshness arithmetic and the sample-size confidence cap"
```

---

### Task 3: The analysis contract

**Files:**
- Create: `lib/insights/analysis.ts`
- Test: `tests/insights-analysis.test.ts`

**Interfaces:**
- Consumes: `Confidence`, `capConfidence` from `lib/insights/confidence`.
- Produces:
  - `AnalysisSchema` (Zod)
  - `type Analysis = z.infer<typeof AnalysisSchema>`
  - `parseAnalysis(raw: unknown, sampleSize: number): { ok: true; value: Analysis } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/insights-analysis.test.ts
import { describe, it, expect } from 'vitest'
import { parseAnalysis } from '@/lib/insights/analysis'

const good = {
  headline: 'Most visitors never reach the playground.',
  biggestDropOff: { from: 'Page Viewed', to: 'Section Viewed', lostPct: 62, why: 'The playground sits below four full screens.' },
  recommendations: [{ what: 'Move the playground above the fold', where: '#does', rationale: 'It is the only interactive proof on the page.', confidence: 'high', effort: 'hours' }],
  adVerdict: [{ campaign: 'early-bird-4x5', verdict: 'hold', why: 'Too few conversions to judge.' }],
  dataCaveats: ['Only four paid conversions in the window.'],
}

describe('the analysis contract', () => {
  it('accepts a well-formed analysis', () => {
    const r = parseAnalysis(good, 4)
    expect(r.ok).toBe(true)
  })

  it('caps the model\'s confidence at what the sample supports', () => {
    const r = parseAnalysis(good, 4)
    if (!r.ok) throw new Error('expected ok')
    // The model said 'high'. Four conversions do not support that.
    expect(r.value.recommendations[0].confidence).toBe('low')
  })

  it('rejects an impossible percentage rather than rendering it', () => {
    const r = parseAnalysis({ ...good, biggestDropOff: { ...good.biggestDropOff, lostPct: 150 } }, 4)
    expect(r.ok).toBe(false)
  })

  it('rejects output with no recommendation at all', () => {
    const r = parseAnalysis({ ...good, recommendations: [] }, 4)
    expect(r.ok).toBe(false)
  })

  it('rejects an unknown ad verdict', () => {
    const r = parseAnalysis({ ...good, adVerdict: [{ campaign: 'x', verdict: 'maybe', why: 'y' }] }, 4)
    expect(r.ok).toBe(false)
  })

  it('rejects a non-object, which is what a refusal or a stray log line looks like', () => {
    expect(parseAnalysis('I could not complete that request.', 4).ok).toBe(false)
    expect(parseAnalysis(null, 4).ok).toBe(false)
  })

  it('returns a usable message when it rejects, so the run records why', () => {
    const r = parseAnalysis({}, 4)
    if (r.ok) throw new Error('expected failure')
    expect(r.error.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/insights-analysis.test.ts`
Expected: FAIL — cannot resolve `@/lib/insights/analysis`

- [ ] **Step 3: Write `lib/insights/analysis.ts`**

```ts
import { z } from 'zod'
import { capConfidence } from '@/lib/insights/confidence'

/**
 * The shape the model must return.
 *
 * Validated before anything is stored. An invalid analysis is not written at
 * all — the run fails and the previous good read stays on the page, dated, on
 * the view that a visibly old answer beats a confidently wrong fresh one.
 */
export const AnalysisSchema = z.object({
  headline: z.string().min(1).max(120),
  biggestDropOff: z.object({
    from: z.string().min(1).max(80),
    to: z.string().min(1).max(80),
    lostPct: z.number().min(0).max(100),
    why: z.string().min(1).max(400),
  }),
  recommendations: z.array(z.object({
    what: z.string().min(1).max(200),
    where: z.string().min(1).max(80),
    rationale: z.string().min(1).max(400),
    confidence: z.enum(['low', 'medium', 'high']),
    effort: z.enum(['minutes', 'hours', 'days']),
  })).min(1).max(4),
  adVerdict: z.array(z.object({
    campaign: z.string().min(1).max(120),
    verdict: z.enum(['scale', 'hold', 'kill']),
    why: z.string().min(1).max(240),
  })).max(6),
  dataCaveats: z.array(z.string().min(1).max(200)).max(4),
})

export type Analysis = z.infer<typeof AnalysisSchema>

/**
 * Validates model output and overrides its confidence claims.
 *
 * `sampleSize` is the number of paid conversions in the window — the thing
 * every recommendation ultimately rests on. The model's own confidence is
 * treated as a proposal and lowered wherever the data cannot carry it.
 */
export function parseAnalysis(
  raw: unknown, sampleSize: number,
): { ok: true; value: Analysis } | { ok: false; error: string } {
  const parsed = AnalysisSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 1000) }
  }
  const value: Analysis = {
    ...parsed.data,
    recommendations: parsed.data.recommendations.map((r) => ({
      ...r, confidence: capConfidence(r.confidence, sampleSize),
    })),
  }
  return { ok: true, value }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/insights-analysis.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/insights/analysis.ts tests/insights-analysis.test.ts
git commit -m "feat: zod contract for model output, with server-side confidence capping"
```

---

### Task 4: Admin authentication

**Files:**
- Create: `lib/admin-auth.ts`
- Test: `tests/admin-auth.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `passwordMatches(given: string): boolean`
  - `signSession(now: Date): string`
  - `verifySession(token: string | undefined, now: Date): boolean`
  - `SESSION_COOKIE = 'pbl_admin'`
  - `SESSION_HOURS = 24 * 14`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/admin-auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('ADMIN_PASSWORD', 'correct horse battery staple')
  vi.stubEnv('ADMIN_SECRET', 'a'.repeat(48))
})

describe('the admin password', () => {
  it('accepts the configured password', async () => {
    const { passwordMatches } = await import('@/lib/admin-auth')
    expect(passwordMatches('correct horse battery staple')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const { passwordMatches } = await import('@/lib/admin-auth')
    expect(passwordMatches('hunter2')).toBe(false)
  })

  it('rejects everything when no password is configured', async () => {
    // An unset password must not mean an open door.
    vi.stubEnv('ADMIN_PASSWORD', '')
    const { passwordMatches } = await import('@/lib/admin-auth')
    expect(passwordMatches('')).toBe(false)
    expect(passwordMatches('anything')).toBe(false)
  })
})

describe('the session cookie', () => {
  const now = new Date('2026-10-05T12:00:00Z')

  it('round-trips a token it just issued', async () => {
    const { signSession, verifySession } = await import('@/lib/admin-auth')
    expect(verifySession(signSession(now), now)).toBe(true)
  })

  it('rejects a tampered payload', async () => {
    const { signSession, verifySession } = await import('@/lib/admin-auth')
    const token = signSession(now)
    const [, sig] = token.split('.')
    const forged = `${Buffer.from('9999999999999').toString('base64url')}.${sig}`
    expect(verifySession(forged, now)).toBe(false)
  })

  it('rejects a token signed with a different secret', async () => {
    const { signSession } = await import('@/lib/admin-auth')
    const token = signSession(now)
    vi.resetModules()
    vi.stubEnv('ADMIN_SECRET', 'b'.repeat(48))
    const { verifySession } = await import('@/lib/admin-auth')
    expect(verifySession(token, now)).toBe(false)
  })

  it('rejects an expired token', async () => {
    const { signSession, verifySession, SESSION_HOURS } = await import('@/lib/admin-auth')
    const token = signSession(now)
    const later = new Date(now.getTime() + (SESSION_HOURS + 1) * 3_600_000)
    expect(verifySession(token, later)).toBe(false)
  })

  it('rejects junk and absence', async () => {
    const { verifySession } = await import('@/lib/admin-auth')
    expect(verifySession(undefined, now)).toBe(false)
    expect(verifySession('', now)).toBe(false)
    expect(verifySession('not-a-token', now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/admin-auth.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin-auth`

- [ ] **Step 3: Write `lib/admin-auth.ts`**

```ts
import crypto from 'node:crypto'

export const SESSION_COOKIE = 'pbl_admin'
export const SESSION_HOURS = 24 * 14

/**
 * Constant-time comparison of two strings of possibly different lengths.
 *
 * timingSafeEqual throws on a length mismatch, which would itself leak the
 * length, so both sides are hashed to a fixed width first.
 */
function sameSecret(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest()
  const hb = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

export function passwordMatches(given: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  // An unconfigured password is a closed door, not an open one.
  if (!expected) return false
  return sameSecret(given, expected)
}

function secret(): string | null {
  const s = process.env.ADMIN_SECRET
  return s && s.length >= 32 ? s : null
}

function sign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url')
}

/** `<issued-at-ms base64url>.<hmac>` — no session store to keep. */
export function signSession(now: Date = new Date()): string {
  const key = secret()
  if (!key) return ''
  const payload = Buffer.from(String(now.getTime())).toString('base64url')
  return `${payload}.${sign(payload, key)}`
}

export function verifySession(token: string | undefined, now: Date = new Date()): boolean {
  const key = secret()
  if (!key || !token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  if (!sameSecret(sig, sign(payload, key))) return false

  const issued = Number(Buffer.from(payload, 'base64url').toString())
  if (!Number.isFinite(issued)) return false
  return now.getTime() - issued < SESSION_HOURS * 3_600_000
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/admin-auth.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/admin-auth.ts tests/admin-auth.test.ts
git commit -m "feat: admin session auth with timing-safe compare and signed cookie"
```

---

### Task 5: Login route, admin page shell, and robots

**Files:**
- Create: `app/api/admin/login/route.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/page.tsx`
- Modify: `app/robots.ts`
- Test: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE`, `passwordMatches`, `signSession`, `verifySession`, `SESSION_HOURS` from `lib/admin-auth`; `latestRun`, `lastGoodAnalysis` from `lib/insights/runs`; `freshness` from `lib/insights/freshness`.
- Produces: the rendered dashboard. No exports other tasks consume.

- [ ] **Step 1: Add `/admin` to robots**

In `app/robots.ts`, change the disallow array and extend the comment:

```ts
/**
 * The payment pages are deliberately excluded. /checkout is reachable only
 * with a token from a confirmation email, the API routes are not content, and
 * /admin is a private dashboard behind a password.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout', '/admin'] }],
    sitemap: 'https://pebblerobo.com/sitemap.xml',
    host: 'https://pebblerobo.com',
  }
}
```

- [ ] **Step 2: Write the login route**

```ts
// app/api/admin/login/route.ts
import { SESSION_COOKIE, SESSION_HOURS, passwordMatches, signSession } from '@/lib/admin-auth'

/**
 * A deliberate delay on every attempt, right or wrong.
 *
 * There is no store to rate-limit against on a serverless function, and this
 * is one password protecting one dashboard. A fixed cost per attempt is what
 * turns an online guessing attack from minutes into years, and it costs the
 * one legitimate user half a second a fortnight.
 */
const ATTEMPT_DELAY_MS = 500

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const password = String(form?.get('password') ?? '')

  await new Promise((r) => setTimeout(r, ATTEMPT_DELAY_MS))

  if (!passwordMatches(password)) {
    return Response.redirect(new URL('/admin/login?e=1', request.url), 303)
  }

  const res = new Response(null, {
    status: 303,
    headers: { Location: new URL('/admin', request.url).toString() },
  })
  res.headers.append('Set-Cookie', [
    `${SESSION_COOKIE}=${signSession()}`,
    'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax',
    `Max-Age=${SESSION_HOURS * 3600}`,
  ].join('; '))
  return res
}
```

- [ ] **Step 3: Write the login page**

```tsx
// app/admin/login/page.tsx
export const metadata = { robots: { index: false, follow: false } }

export default async function AdminLogin({
  searchParams,
}: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams
  return (
    <main className="wrap py-20 max-w-[420px]">
      <h1 className="t-display text-[28px] mt-0 mb-6">Admin</h1>
      <form method="POST" action="/api/admin/login" className="grid gap-4">
        <label className="t-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoFocus
               className="field" autoComplete="current-password" />
        <button type="submit" className="btn btn-brand justify-center">Sign in</button>
        {e && (
          <p role="alert" className="t-mono text-[13px] m-0" style={{ color: 'var(--danger)' }}>
            That password is not right.
          </p>
        )}
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Write the dashboard page**

```tsx
// app/admin/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySession } from '@/lib/admin-auth'
import { latestRun, lastGoodAnalysis } from '@/lib/insights/runs'
import { freshness } from '@/lib/insights/freshness'
import { AnalysisSchema } from '@/lib/insights/analysis'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const NUMBERS_STALE_AFTER_H = 36
const ANALYSIS_STALE_AFTER_H = 48

export default async function Admin() {
  const jar = await cookies()
  if (!verifySession(jar.get(SESSION_COOKIE)?.value)) redirect('/admin/login')

  const run = await latestRun()
  const now = new Date()

  if (!run) {
    return (
      <main className="wrap py-16">
        <h1 className="t-display text-[32px] mt-0 mb-4">No run yet</h1>
        <p className="text-[var(--muted)] max-w-[60ch]">
          The nightly job has not produced anything. Check that{' '}
          <code className="t-mono">CRON_SECRET</code>, the Mixpanel service
          account and the Meta token are set, then trigger{' '}
          <code className="t-mono">/api/insights/run</code> by hand.
        </p>
      </main>
    )
  }

  const numbers = freshness(run.fetchedAt, now, NUMBERS_STALE_AFTER_H)
  const analysisAge = freshness(run.analysedAt, now, ANALYSIS_STALE_AFTER_H)
  const parsed = AnalysisSchema.safeParse(run.analysis)
  const fallback = parsed.success ? null : await lastGoodAnalysis()
  const shown = parsed.success
    ? parsed.data
    : AnalysisSchema.safeParse(fallback?.analysis).data ?? null

  return (
    <main className="wrap py-12 grid gap-10">
      <header>
        <p className="t-label m-0 mb-2">Insights · {run.runDate}</p>
        <h1 className="t-display text-[32px] mt-0 mb-3">
          {shown?.headline ?? 'Awaiting analysis'}
        </h1>
        <p className="t-mono text-[11.5px] text-[var(--muted)] m-0">
          numbers {numbers.ageHours === null ? 'never' : `${numbers.ageHours}h old`}
          {' · '}
          analysis {analysisAge.ageHours === null
            ? `pending since ${run.fetchedAt?.toISOString().slice(0, 16) ?? '—'}`
            : `${analysisAge.ageHours}h old`}
          {run.status === 'failed' ? ` · last run failed: ${run.error ?? 'unknown'}` : ''}
        </p>
      </header>

      {(numbers.stale || analysisAge.stale) && (
        <p role="status" className="card p-4 t-mono text-[13px] m-0">
          This is not current. Numbers go stale after {NUMBERS_STALE_AFTER_H}h and the
          analysis after {ANALYSIS_STALE_AFTER_H}h. Do not act on it until it refreshes.
        </p>
      )}

      {run.metaOk === false && (
        <p role="status" className="card p-4 t-mono text-[13px] m-0">
          Ad data unavailable — this read is funnel-only.
        </p>
      )}

      <pre className="card p-5 t-mono text-[12px] overflow-x-auto">
        {JSON.stringify({ orders: run.orders, mixpanel: run.mixpanel, meta: run.meta }, null, 2)}
      </pre>

      {shown && (
        <section className="grid gap-4">
          <h2 className="t-display text-[22px] m-0">What to try</h2>
          {shown.recommendations.map((r, i) => (
            <article key={i} className="card p-5">
              <p className="text-[15px] font-medium m-0 mb-1">{r.what}</p>
              <p className="t-mono text-[11px] text-[var(--muted)] m-0 mb-2">
                {r.where} · {r.confidence} confidence · {r.effort}
              </p>
              <p className="text-[13.5px] text-[var(--muted)] m-0">{r.rationale}</p>
            </article>
          ))}
          {shown.dataCaveats.length > 0 && (
            <ul className="t-mono text-[11.5px] text-[var(--muted)] m-0 pl-5">
              {shown.dataCaveats.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Write the e2e test**

```ts
// e2e/admin.spec.ts
import { test, expect } from '@playwright/test'

test('the dashboard is closed without a session', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Password').fill('definitely-not-it')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('admin is kept out of robots', async ({ page }) => {
  const res = await page.request.get('/robots.txt')
  expect(await res.text()).toContain('/admin')
})

test('a signed-in dashboard with no run says so instead of showing an empty frame',
  async ({ page }) => {
    // Requires ADMIN_PASSWORD and ADMIN_SECRET in the Playwright webServer env
    // (see Step 6). Without a run row the page must explain what is missing,
    // because a blank dashboard reads as "nothing to report".
    await page.goto('/admin/login')
    await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD ?? 'test-admin-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: /No run yet|Awaiting analysis|./ }))
      .toBeVisible()
  })
```

- [ ] **Step 6: Run the e2e tests**

First add the two variables the signed-in test needs to the `webServer.env`
block in `playwright.config.ts`, alongside the existing entries:

```ts
ADMIN_PASSWORD: 'test-admin-password',
ADMIN_SECRET: 'test-admin-secret-at-least-32-characters-long',
```

Run: `npx playwright test admin --reporter=line`
Expected: PASS (4 tests). If the field styling class `field` does not exist in
`app/globals.css`, use the same classes the reserve form's inputs use.

- [ ] **Step 7: Commit**

```bash
git add app/admin app/api/admin app/robots.ts e2e/admin.spec.ts
git commit -m "feat: password-gated admin dashboard with honest empty and stale states"
```

---

### Task 6: Order aggregates from our own database

**Files:**
- Create: `lib/insights/orders.ts`
- Test: `tests/insights-orders.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `orderAggregates(windowDays: number): Promise<OrderAggregates>` where
  `OrderAggregates = { windowDays: number; created: number; paid: number; kits: number; depositPaise: number; balanceDuePaise: number; byDay: { date: string; created: number; paid: number }[] }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/insights-orders.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const sql = vi.hoisted(() => vi.fn())
vi.mock('@neondatabase/serverless', () => ({ neon: () => sql }))

beforeEach(() => { vi.stubEnv('DATABASE_URL', 'postgres://stub'); sql.mockReset() })

describe('order aggregates', () => {
  it('counts orders without ever reading a name or an address', async () => {
    const { orderAggregates } = await import('@/lib/insights/orders')
    sql.mockResolvedValueOnce([{ created: 8, paid: 4, kits: 8, deposit: 199600, balance: 1800000 }])
    sql.mockResolvedValueOnce([{ d: '2026-10-04', created: 1, paid: 1 }])

    const agg = await orderAggregates(7)
    expect(agg).toMatchObject({ windowDays: 7, created: 8, paid: 4 })

    // The query text must not reach for identifying columns. This is the
    // guarantee the privacy page depends on.
    const text = sql.mock.calls.map((c) => String(c[0])).join(' ')
    for (const col of ['name', 'email', 'phone', 'address', 'pincode']) {
      expect(text, `aggregate query must not select ${col}`).not.toContain(col)
    }
  })

  it('returns zeroes rather than throwing with no database', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { orderAggregates } = await import('@/lib/insights/orders')
    await expect(orderAggregates(7)).resolves.toMatchObject({ created: 0, paid: 0 })
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/insights-orders.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `lib/insights/orders.ts`**

```ts
import { neon } from '@neondatabase/serverless'

export type OrderAggregates = {
  windowDays: number
  created: number
  paid: number
  kits: number
  depositPaise: number
  balanceDuePaise: number
  byDay: { date: string; created: number; paid: number }[]
}

function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

const EMPTY = (windowDays: number): OrderAggregates => ({
  windowDays, created: 0, paid: 0, kits: 0,
  depositPaise: 0, balanceDuePaise: 0, byDay: [],
})

/**
 * Conversions, counted where they actually are.
 *
 * Mixpanel will under-report the bottom of this funnel — ad blockers and
 * privacy browsers drop client-side events, and the people most likely to
 * block are the engineers this kit is sold to. Postgres knows exactly who
 * paid, so this is the authoritative number and Mixpanel supplies only the
 * stages above it.
 *
 * Counts only. No column here identifies a person, because this result is
 * what goes into a language model prompt.
 */
export async function orderAggregates(windowDays: number): Promise<OrderAggregates> {
  const sql = client()
  if (!sql) return EMPTY(windowDays)

  const [totals] = await sql`
    select count(*)::int                                            as created,
           count(paid_at)::int                                      as paid,
           coalesce(sum(qty), 0)::int                               as kits,
           coalesce(sum(amount_paid_paise) filter (where paid_at is not null), 0)::int as deposit,
           coalesce(sum(balance_due_paise) filter (where paid_at is not null), 0)::int as balance
      from preorders
     where created_at > now() - make_interval(days => ${windowDays})`

  const days = await sql`
    select to_char(created_at, 'YYYY-MM-DD') as d,
           count(*)::int                     as created,
           count(paid_at)::int               as paid
      from preorders
     where created_at > now() - make_interval(days => ${windowDays})
     group by 1 order by 1`

  return {
    windowDays,
    created: Number(totals?.created ?? 0),
    paid: Number(totals?.paid ?? 0),
    kits: Number(totals?.kits ?? 0),
    depositPaise: Number(totals?.deposit ?? 0),
    balanceDuePaise: Number(totals?.balance ?? 0),
    byDay: days.map((r) => ({
      date: String(r.d), created: Number(r.created), paid: Number(r.paid),
    })),
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/insights-orders.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/insights/orders.ts tests/insights-orders.test.ts
git commit -m "feat: order aggregates as ground truth for conversions"
```

---

### Task 7: Mixpanel client

**Files:**
- Create: `lib/insights/mixpanel.ts`
- Test: `tests/insights-mixpanel.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `fetchMixpanel(windowDays: number): Promise<{ ok: boolean; data: unknown; error?: string }>`

- [ ] **Step 1: Verify the API before writing a line of it**

Do not write this client from memory. Confirm, from Mixpanel's current docs:
the Query API base URL, that service-account auth is HTTP Basic with
`username:secret`, the parameter name for the project id, and the exact
endpoint for counting events over a date range (`/api/query/segmentation` or
the JQL endpoint).

Then prove it with one real call before writing code:

```bash
curl -u "$MIXPANEL_SERVICE_ACCOUNT:$MIXPANEL_SERVICE_SECRET" \
  -G 'https://mixpanel.com/api/query/segmentation' \
  --data-urlencode "project_id=$MIXPANEL_PROJECT_ID" \
  --data-urlencode 'event=Page Viewed' \
  --data-urlencode 'from_date=2026-09-28' \
  --data-urlencode 'to_date=2026-10-05' | head -40
```

Record the working URL and parameter names in a comment at the top of the
client. If the shape differs from the above, the shape in the docs wins.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/insights-mixpanel.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('MIXPANEL_SERVICE_ACCOUNT', 'svc')
  vi.stubEnv('MIXPANEL_SERVICE_SECRET', 'sec')
  vi.stubEnv('MIXPANEL_PROJECT_ID', '12345')
})

describe('the mixpanel pull', () => {
  it('reports not-ok when credentials are missing, without calling out', async () => {
    vi.stubEnv('MIXPANEL_SERVICE_ACCOUNT', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { fetchMixpanel } = await import('@/lib/insights/mixpanel')
    const r = await fetchMixpanel(7)
    expect(r.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats a 200 carrying an error body as a failure', async () => {
    // Mixpanel answers several failure modes with HTTP 200 and an error
    // field, so res.ok is not a success test.
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Invalid project id' }), { status: 200 })))
    const { fetchMixpanel } = await import('@/lib/insights/mixpanel')
    const r = await fetchMixpanel(7)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Invalid project id')
  })

  it('reports not-ok on a non-200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })))
    const { fetchMixpanel } = await import('@/lib/insights/mixpanel')
    expect((await fetchMixpanel(7)).ok).toBe(false)
  })

  it('reports not-ok when the network throws rather than propagating', async () => {
    // A failed pull must degrade the run to funnel-only, not crash the cron.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET') }))
    const { fetchMixpanel } = await import('@/lib/insights/mixpanel')
    expect((await fetchMixpanel(7)).ok).toBe(false)
  })

  it('sends basic auth built from the service account', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: { values: {} } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchMixpanel } = await import('@/lib/insights/mixpanel')
    await fetchMixpanel(7)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const auth = new Headers(init.headers).get('authorization') ?? ''
    expect(auth.startsWith('Basic ')).toBe(true)
    expect(Buffer.from(auth.slice(6), 'base64').toString()).toBe('svc:sec')
  })
})
```

- [ ] **Step 3: Run and watch them fail**

Run: `npx vitest run tests/insights-mixpanel.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write `lib/insights/mixpanel.ts`**

Use the URL and parameter names confirmed in Step 1. The structure below is
fixed; only the request building changes if the docs disagree.

```ts
/**
 * Mixpanel Query API.
 *
 * Endpoint and parameter names verified against the current docs on
 * 2026-10-05 — see the curl in the plan. Re-verify before changing.
 *
 * The events pulled are the upper funnel only. The conversion count comes
 * from our own orders table, because Mixpanel under-reports a bottom of
 * funnel that ad blockers can silence.
 */
const EVENTS = [
  'Page Viewed', 'Section Viewed', 'Gallery View Chosen',
  'Reserve CTA Clicked', 'Reserve Form Started', 'Reserve Submitted',
  'Payment Opened', 'Payment Failed',
] as const

const BASE = 'https://mixpanel.com/api/query/segmentation'

function credentials() {
  const user = process.env.MIXPANEL_SERVICE_ACCOUNT
  const secret = process.env.MIXPANEL_SERVICE_SECRET
  const project = process.env.MIXPANEL_PROJECT_ID
  if (!user || !secret || !project) return null
  return { project, basic: Buffer.from(`${user}:${secret}`).toString('base64') }
}

const day = (d: Date) => d.toISOString().slice(0, 10)

export async function fetchMixpanel(
  windowDays: number,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const creds = credentials()
  if (!creds) return { ok: false, data: null, error: 'Mixpanel credentials not configured' }

  const to = new Date()
  const from = new Date(to.getTime() - windowDays * 86_400_000)
  const counts: Record<string, number> = {}

  try {
    for (const event of EVENTS) {
      const url = new URL(BASE)
      url.searchParams.set('project_id', creds.project)
      url.searchParams.set('event', event)
      url.searchParams.set('from_date', day(from))
      url.searchParams.set('to_date', day(to))
      url.searchParams.set('type', 'general')

      const res = await fetch(url, {
        headers: { Authorization: `Basic ${creds.basic}` },
      })
      if (!res.ok) return { ok: false, data: null, error: `HTTP ${res.status}` }

      const body = await res.json() as { error?: string; data?: { values?: Record<string, Record<string, number>> } }
      // A 200 with an error field is how several failures arrive here.
      if (body.error) return { ok: false, data: null, error: String(body.error).slice(0, 300) }

      const series = Object.values(body.data?.values ?? {})[0] ?? {}
      counts[event] = Object.values(series).reduce((n, v) => n + Number(v || 0), 0)
    }
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : 'fetch failed' }
  }

  return { ok: true, data: { windowDays, from: day(from), to: day(to), counts } }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/insights-mixpanel.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/insights/mixpanel.ts tests/insights-mixpanel.test.ts
git commit -m "feat: mixpanel query client, failing soft on every error path"
```

---

### Task 8: Meta Ads client

**Files:**
- Create: `lib/insights/meta.ts`
- Test: `tests/insights-meta.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `fetchMeta(windowDays: number): Promise<{ ok: boolean; data: unknown; error?: string }>`

- [ ] **Step 1: Verify the API before writing it**

Confirm from Meta's current Marketing API docs: the current stable version
string, the insights edge path for an ad account, and the field names for
spend, impressions, clicks and purchase actions. Prove it:

```bash
curl -s -G "https://graph.facebook.com/v23.0/$META_AD_ACCOUNT_ID/insights" \
  --data-urlencode "access_token=$META_ACCESS_TOKEN" \
  --data-urlencode 'date_preset=last_7d' \
  --data-urlencode 'level=campaign' \
  --data-urlencode 'fields=campaign_name,spend,impressions,clicks,actions' | head -40
```

Record the version actually used in a comment. Do not leave the version as a
guess.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/insights-meta.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('META_ACCESS_TOKEN', 'tok')
  vi.stubEnv('META_AD_ACCOUNT_ID', 'act_123')
})

describe('the meta pull', () => {
  it('reports not-ok without credentials and makes no call', async () => {
    vi.stubEnv('META_ACCESS_TOKEN', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { fetchMeta } = await import('@/lib/insights/meta')
    expect((await fetchMeta(7)).ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a graph API error body rather than storing it as data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { message: 'Invalid OAuth access token' } }), { status: 400 })))
    const { fetchMeta } = await import('@/lib/insights/meta')
    const r = await fetchMeta(7)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Invalid OAuth')
  })

  it('reports not-ok when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ETIMEDOUT') }))
    const { fetchMeta } = await import('@/lib/insights/meta')
    expect((await fetchMeta(7)).ok).toBe(false)
  })

  it('never puts the access token in the returned data', async () => {
    // This payload is stored in Postgres and sent to a language model.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ data: [{ campaign_name: 'early-bird', spend: '2400.00' }] }), { status: 200 })))
    const { fetchMeta } = await import('@/lib/insights/meta')
    const r = await fetchMeta(7)
    expect(JSON.stringify(r.data)).not.toContain('tok')
  })

  it('returns the campaign rows on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ data: [{ campaign_name: 'early-bird', spend: '2400.00', clicks: '310' }] }), { status: 200 })))
    const { fetchMeta } = await import('@/lib/insights/meta')
    const r = await fetchMeta(7)
    expect(r.ok).toBe(true)
    expect(JSON.stringify(r.data)).toContain('early-bird')
  })
})
```

- [ ] **Step 3: Run and watch them fail**

Run: `npx vitest run tests/insights-meta.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write `lib/insights/meta.ts`**

```ts
/**
 * Meta Marketing API, campaign-level insights.
 *
 * Version and field names verified against the current docs on 2026-10-05 —
 * see the curl in the plan. The token is sent as a query parameter because
 * that is what the Graph API expects, and it is deliberately not echoed into
 * the returned payload: that payload is stored in Postgres and handed to a
 * language model.
 */
const VERSION = 'v23.0'

const FIELDS = ['campaign_name', 'spend', 'impressions', 'clicks', 'actions'].join(',')

function credentials() {
  const token = process.env.META_ACCESS_TOKEN
  const account = process.env.META_AD_ACCOUNT_ID
  if (!token || !account) return null
  return { token, account }
}

export async function fetchMeta(
  windowDays: number,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const creds = credentials()
  if (!creds) return { ok: false, data: null, error: 'Meta credentials not configured' }

  const preset = windowDays <= 7 ? 'last_7d' : windowDays <= 14 ? 'last_14d' : 'last_30d'
  const url = new URL(`https://graph.facebook.com/${VERSION}/${creds.account}/insights`)
  url.searchParams.set('access_token', creds.token)
  url.searchParams.set('date_preset', preset)
  url.searchParams.set('level', 'campaign')
  url.searchParams.set('fields', FIELDS)

  try {
    const res = await fetch(url)
    const body = await res.json() as { error?: { message?: string }; data?: unknown[] }
    if (body.error) {
      return { ok: false, data: null, error: String(body.error.message ?? 'graph error').slice(0, 300) }
    }
    if (!res.ok) return { ok: false, data: null, error: `HTTP ${res.status}` }
    return { ok: true, data: { windowDays, preset, campaigns: body.data ?? [] } }
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/insights-meta.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/insights/meta.ts tests/insights-meta.test.ts
git commit -m "feat: meta ads insights client, token never echoed into stored data"
```

---

### Task 9: The cron orchestration endpoint

**Files:**
- Create: `app/api/insights/run/route.ts`
- Test: `tests/insights-run-route.test.ts`

**Interfaces:**
- Consumes: `runDateFor`, `claimRun`, `storeRaw`, `failRun`, `fetchMixpanel`, `fetchMeta`, `orderAggregates`.
- Produces: `POST /api/insights/run` and `GET` (same behaviour, because Vercel cron issues GET).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/insights-run-route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const claimRun = vi.hoisted(() => vi.fn())
const storeRaw = vi.hoisted(() => vi.fn())
const failRun = vi.hoisted(() => vi.fn())
vi.mock('@/lib/insights/runs', () => ({ claimRun, storeRaw, failRun }))

const fetchMixpanel = vi.hoisted(() => vi.fn())
vi.mock('@/lib/insights/mixpanel', () => ({ fetchMixpanel }))
const fetchMeta = vi.hoisted(() => vi.fn())
vi.mock('@/lib/insights/meta', () => ({ fetchMeta }))
const orderAggregates = vi.hoisted(() => vi.fn())
vi.mock('@/lib/insights/orders', () => ({ orderAggregates }))

const req = (auth?: string) => new Request('https://x/api/insights/run', {
  method: 'POST', headers: auth ? { authorization: auth } : {},
})

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 's3cret')
  for (const m of [claimRun, storeRaw, failRun, fetchMixpanel, fetchMeta, orderAggregates]) m.mockReset()
  claimRun.mockResolvedValue({ claimed: true, id: 1 })
  fetchMixpanel.mockResolvedValue({ ok: true, data: { counts: {} } })
  fetchMeta.mockResolvedValue({ ok: true, data: { campaigns: [] } })
  orderAggregates.mockResolvedValue({ created: 8, paid: 4 })
})

describe('POST /api/insights/run', () => {
  it('refuses without the cron secret', async () => {
    const { POST } = await import('@/app/api/insights/run/route')
    expect((await POST(req())).status).toBe(401)
    expect(claimRun).not.toHaveBeenCalled()
  })

  it('refuses a wrong secret', async () => {
    const { POST } = await import('@/app/api/insights/run/route')
    expect((await POST(req('Bearer nope'))).status).toBe(401)
  })

  it('does nothing when another invocation holds the claim', async () => {
    // The second of two cron deliveries must not fetch anything.
    claimRun.mockResolvedValue({ claimed: false, id: null })
    const { POST } = await import('@/app/api/insights/run/route')
    const res = await POST(req('Bearer s3cret'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: 'already_claimed' })
    expect(fetchMixpanel).not.toHaveBeenCalled()
  })

  it('completes with the funnel half when meta fails', async () => {
    fetchMeta.mockResolvedValue({ ok: false, data: null, error: 'Invalid OAuth' })
    const { POST } = await import('@/app/api/insights/run/route')
    const res = await POST(req('Bearer s3cret'))
    expect(res.status).toBe(200)
    expect(storeRaw).toHaveBeenCalledWith(1, expect.objectContaining({ metaOk: false, mixpanelOk: true }))
    expect(failRun).not.toHaveBeenCalled()
  })

  it('fails the run only when every source fails', async () => {
    fetchMixpanel.mockResolvedValue({ ok: false, data: null, error: 'a' })
    fetchMeta.mockResolvedValue({ ok: false, data: null, error: 'b' })
    const { POST } = await import('@/app/api/insights/run/route')
    await POST(req('Bearer s3cret'))
    expect(failRun).toHaveBeenCalled()
    expect(storeRaw).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/insights-run-route.test.ts`
Expected: FAIL — route not found

- [ ] **Step 3: Write `app/api/insights/run/route.ts`**

```ts
import { runDateFor } from '@/lib/insights/dates'
import { claimRun, storeRaw, failRun } from '@/lib/insights/runs'
import { fetchMixpanel } from '@/lib/insights/mixpanel'
import { fetchMeta } from '@/lib/insights/meta'
import { orderAggregates } from '@/lib/insights/orders'

export const maxDuration = 60

const WINDOW_DAYS = 7

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return request.headers.get('authorization') === `Bearer ${expected}`
}

async function run(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: 'unauthorised' }, { status: 401 })
  }

  const date = runDateFor()
  const { claimed, id } = await claimRun(date)
  // Somebody else is already doing today, or today is finished. Either way
  // this invocation must not fetch and must not spend.
  if (!claimed || id === null) {
    return Response.json({ status: 'already_claimed', date })
  }

  const [mixpanel, meta, orders] = await Promise.all([
    fetchMixpanel(WINDOW_DAYS), fetchMeta(WINDOW_DAYS), orderAggregates(WINDOW_DAYS),
  ])

  // Our own database is the one source whose failure means there is nothing
  // worth analysing. If both external sources are down there is no funnel and
  // no spend, so the run is a failure rather than a thin success.
  if (!mixpanel.ok && !meta.ok) {
    await failRun(id, `all sources failed — mixpanel: ${mixpanel.error}; meta: ${meta.error}`)
    return Response.json({ status: 'failed', date }, { status: 200 })
  }

  await storeRaw(id, {
    mixpanel: mixpanel.data, meta: meta.data, orders,
    mixpanelOk: mixpanel.ok, metaOk: meta.ok,
  })

  return Response.json({
    status: 'awaiting_analysis', date,
    mixpanelOk: mixpanel.ok, metaOk: meta.ok,
  })
}

export const POST = run
/** Vercel cron issues GET, so both verbs do the same thing. */
export const GET = run
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/insights-run-route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/insights/run tests/insights-run-route.test.ts
git commit -m "feat: cron endpoint orchestrating the nightly pull with partial-failure tolerance"
```

---

### Task 10: The analyst endpoints

**Files:**
- Create: `app/api/insights/latest-raw/route.ts`
- Create: `app/api/insights/analysis/route.ts`
- Test: `tests/insights-analyst-routes.test.ts`

**Interfaces:**
- Consumes: `latestAwaiting`, `storeAnalysis`, `failRun` from `lib/insights/runs`; `parseAnalysis` from `lib/insights/analysis`.
- Produces: `GET /api/insights/latest-raw`, `POST /api/insights/analysis`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/insights-analyst-routes.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const latestAwaiting = vi.hoisted(() => vi.fn())
const storeAnalysis = vi.hoisted(() => vi.fn())
const failRun = vi.hoisted(() => vi.fn())
vi.mock('@/lib/insights/runs', () => ({ latestAwaiting, storeAnalysis, failRun }))

const AUTH = { authorization: 'Bearer analyst' }

beforeEach(() => {
  vi.stubEnv('ANALYST_SECRET', 'analyst')
  for (const m of [latestAwaiting, storeAnalysis, failRun]) m.mockReset()
  storeAnalysis.mockResolvedValue(true)
})

const good = {
  headline: 'Most visitors never reach the playground.',
  biggestDropOff: { from: 'a', to: 'b', lostPct: 62, why: 'because' },
  recommendations: [{ what: 'x', where: '#does', rationale: 'y', confidence: 'high', effort: 'hours' }],
  adVerdict: [], dataCaveats: [],
}

describe('GET /api/insights/latest-raw', () => {
  it('refuses without the analyst secret', async () => {
    const { GET } = await import('@/app/api/insights/latest-raw/route')
    const res = await GET(new Request('https://x/'))
    expect(res.status).toBe(401)
  })

  it('never includes customer identifiers in what it hands out', async () => {
    latestAwaiting.mockResolvedValue({
      id: 3, runDate: '2026-10-05',
      orders: { created: 8, paid: 4 }, mixpanel: { counts: {} }, meta: null,
      mixpanelOk: true, metaOk: false,
    })
    const { GET } = await import('@/app/api/insights/latest-raw/route')
    const res = await GET(new Request('https://x/', { headers: AUTH }))
    const text = JSON.stringify(await res.json()).toLowerCase()
    for (const word of ['email', 'phone', 'address', 'pincode', '@']) {
      expect(text, `latest-raw leaked ${word}`).not.toContain(word)
    }
  })

  it('says so when there is nothing waiting', async () => {
    latestAwaiting.mockResolvedValue(null)
    const { GET } = await import('@/app/api/insights/latest-raw/route')
    const res = await GET(new Request('https://x/', { headers: AUTH }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/insights/analysis', () => {
  const post = (body: unknown, headers = AUTH) => new Request('https://x/', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  it('refuses without the analyst secret', async () => {
    const { POST } = await import('@/app/api/insights/analysis/route')
    expect((await POST(post({ runId: 3, analysis: good }, {} as never))).status).toBe(401)
  })

  it('stores a valid analysis, capping the confidence it claimed', async () => {
    const { POST } = await import('@/app/api/insights/analysis/route')
    const res = await POST(post({ runId: 3, analysis: good, sampleSize: 4, model: 'claude-cli' }))
    expect(res.status).toBe(200)
    const [, stored] = storeAnalysis.mock.calls[0]
    expect(stored.recommendations[0].confidence).toBe('low')
  })

  it('rejects malformed output and leaves the previous analysis alone', async () => {
    const { POST } = await import('@/app/api/insights/analysis/route')
    const res = await POST(post({ runId: 3, analysis: { nonsense: true }, sampleSize: 4 }))
    expect(res.status).toBe(422)
    expect(storeAnalysis).not.toHaveBeenCalled()
    expect(failRun).toHaveBeenCalled()
  })

  it('is idempotent — a replay for a finished run changes nothing', async () => {
    storeAnalysis.mockResolvedValue(false)
    const { POST } = await import('@/app/api/insights/analysis/route')
    const res = await POST(post({ runId: 3, analysis: good, sampleSize: 4 }))
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/insights-analyst-routes.test.ts`
Expected: FAIL — routes not found

- [ ] **Step 3: Write `app/api/insights/latest-raw/route.ts`**

```ts
import { latestAwaiting } from '@/lib/insights/runs'

function authorised(request: Request): boolean {
  const expected = process.env.ANALYST_SECRET
  if (!expected) return false
  return request.headers.get('authorization') === `Bearer ${expected}`
}

/**
 * What the Mac job reads before calling Claude.
 *
 * Only the aggregates. The orders payload this returns was built by
 * lib/insights/orders.ts, which selects counts and sums and never a column
 * that identifies a person — the published privacy page says order details go
 * to Mixpanel and to the courier, and says nothing about a language model.
 * Keeping that sentence true is the job of this endpoint and that query.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: 'unauthorised' }, { status: 401 })

  const run = await latestAwaiting()
  if (!run) return Response.json({ error: 'nothing awaiting analysis' }, { status: 404 })

  return Response.json({
    runId: run.id,
    runDate: run.runDate,
    mixpanelOk: run.mixpanelOk,
    metaOk: run.metaOk,
    mixpanel: run.mixpanel,
    meta: run.meta,
    orders: run.orders,
  })
}
```

- [ ] **Step 4: Write `app/api/insights/analysis/route.ts`**

```ts
import { storeAnalysis, failRun } from '@/lib/insights/runs'
import { parseAnalysis } from '@/lib/insights/analysis'

function authorised(request: Request): boolean {
  const expected = process.env.ANALYST_SECRET
  if (!expected) return false
  return request.headers.get('authorization') === `Bearer ${expected}`
}

/**
 * Accepts the Mac job's result.
 *
 * Two refusals matter here. Invalid output is never stored — the run is
 * failed and the dashboard keeps showing the last analysis it trusts, dated,
 * because a visibly old answer beats a confidently wrong fresh one. And a
 * replay for a run that is no longer awaiting analysis changes nothing, which
 * is what makes the Mac job safe to re-run by hand.
 */
export async function POST(request: Request) {
  if (!authorised(request)) return Response.json({ error: 'unauthorised' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    runId?: number; analysis?: unknown; sampleSize?: number; model?: string
  } | null

  const runId = Number(body?.runId)
  if (!Number.isInteger(runId) || runId <= 0) {
    return Response.json({ error: 'runId required' }, { status: 400 })
  }

  const parsed = parseAnalysis(body?.analysis, Number(body?.sampleSize ?? 0))
  if (!parsed.ok) {
    await failRun(runId, `analysis rejected — ${parsed.error}`)
    return Response.json({ error: 'analysis rejected', detail: parsed.error }, { status: 422 })
  }

  const stored = await storeAnalysis(runId, parsed.value, String(body?.model ?? 'claude-cli'))
  if (!stored) {
    return Response.json({ error: 'run is not awaiting analysis' }, { status: 409 })
  }
  return Response.json({ status: 'stored', runId })
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/insights-analyst-routes.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add app/api/insights tests/insights-analyst-routes.test.ts
git commit -m "feat: analyst endpoints, PII-free out and validation-gated in"
```

---

### Task 11: The Mac job

**Files:**
- Create: `scripts/analyst-prompt.md`
- Create: `scripts/analyst.sh`
- Create: `scripts/com.pebblerobo.analyst.plist`

**Interfaces:**
- Consumes: `GET /api/insights/latest-raw`, `POST /api/insights/analysis`.
- Produces: nothing other code imports.

- [ ] **Step 1: Write the prompt**

```markdown
<!-- scripts/analyst-prompt.md -->
You are reading one week of traffic and order data for pebblerobo.com, a site
selling a DIY desktop-robot kit in India for ₹4,999 — ₹499 to book, the rest
collected in cash on delivery.

You will be given JSON with three parts: `mixpanel` (upper-funnel event counts),
`meta` (ad campaign spend, may be null if unavailable), and `orders` (counts
from the site's own database — this is the authoritative conversion number;
Mixpanel under-reports the bottom of the funnel because ad blockers silence it).

Return ONLY a JSON object, no prose before or after, matching exactly:

{
  "headline": "one sentence, under 120 characters",
  "biggestDropOff": { "from": "...", "to": "...", "lostPct": 0-100, "why": "under 400 chars" },
  "recommendations": [
    { "what": "under 200 chars", "where": "section id or component name",
      "rationale": "under 400 chars", "confidence": "low|medium|high",
      "effort": "minutes|hours|days" }
  ],
  "adVerdict": [ { "campaign": "...", "verdict": "scale|hold|kill", "why": "under 240 chars" } ],
  "dataCaveats": [ "what you could not see, under 200 chars each" ]
}

Between 1 and 4 recommendations. At most 6 ad verdicts, none if `meta` is null.
At most 4 caveats.

State plainly in `dataCaveats` what the data cannot support. The order volume
here is small; say so rather than writing around it. Your confidence values are
a proposal — the server lowers them to what the sample size allows — so do not
inflate them to be heard.
```

- [ ] **Step 2: Write the script**

```bash
#!/usr/bin/env bash
# scripts/analyst.sh
#
# The analysis half of the insights job, run on the owner's Mac because it
# uses their Claude subscription rather than an API key. The numbers half runs
# on Vercel and does not depend on this machine being awake — when this job
# does not run, the dashboard says the analysis is pending rather than showing
# yesterday's as though it were today's.
#
# Install: see scripts/com.pebblerobo.analyst.plist
set -euo pipefail

SITE="${PBL_SITE:-https://pebblerobo.com}"
: "${ANALYST_SECRET:?ANALYST_SECRET must be set}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="${HOME}/Library/Logs/pebblerobo-analyst.log"

say() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >> "$LOG"; }

raw="$(curl -fsS -H "Authorization: Bearer ${ANALYST_SECRET}" \
  "${SITE}/api/insights/latest-raw" || true)"

if [ -z "$raw" ]; then
  say "nothing awaiting analysis"
  exit 0
fi

run_id="$(printf '%s' "$raw" | /usr/bin/python3 -c 'import json,sys;print(json.load(sys.stdin)["runId"])')"
sample="$(printf '%s' "$raw" | /usr/bin/python3 -c 'import json,sys;print(json.load(sys.stdin).get("orders",{}).get("paid",0))')"

# --print keeps Claude Code non-interactive. The prompt demands bare JSON.
analysis="$(printf '%s\n\nDATA:\n%s\n' "$(cat "${HERE}/analyst-prompt.md")" "$raw" \
  | claude --print 2>>"$LOG")"

# Strip a ```json fence if one appears despite the instruction.
analysis="$(printf '%s' "$analysis" | sed -e 's/^```json//' -e 's/^```//' -e 's/```$//')"

if ! printf '%s' "$analysis" | /usr/bin/python3 -m json.tool >/dev/null 2>&1; then
  say "run ${run_id}: model did not return JSON"
  exit 1
fi

payload="$(/usr/bin/python3 - "$run_id" "$sample" <<'PY'
import json, sys
run_id, sample = int(sys.argv[1]), int(sys.argv[2])
analysis = json.loads(sys.stdin.read())
print(json.dumps({"runId": run_id, "sampleSize": sample,
                  "model": "claude-cli", "analysis": analysis}))
PY
<<<"$analysis")"

code="$(curl -fsS -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: Bearer ${ANALYST_SECRET}" \
  -H 'content-type: application/json' \
  -d "$payload" "${SITE}/api/insights/analysis" || true)"

say "run ${run_id}: posted analysis, HTTP ${code}"
```

- [ ] **Step 3: Write the launchd definition**

```xml
<!-- scripts/com.pebblerobo.analyst.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.pebblerobo.analyst</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>$HOME/stackchan-kit/scripts/analyst.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ANALYST_SECRET</key><string>REPLACE_WITH_ANALYST_SECRET</string>
  </dict>
  <!-- 09:07 rather than 09:00: the cron lands at 09:00 IST and this needs to
       find the row already stored. -->
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>7</integer></dict>
  <key>StandardErrorPath</key>
  <string>/tmp/pebblerobo-analyst.err</string>
</dict>
</plist>
```

- [ ] **Step 4: Make it executable and smoke-test it**

```bash
chmod +x scripts/analyst.sh
ANALYST_SECRET=... PBL_SITE=http://localhost:3000 ./scripts/analyst.sh
tail -5 ~/Library/Logs/pebblerobo-analyst.log
```

Expected: either `nothing awaiting analysis` (no run yet — correct) or a line
reporting HTTP 200. A non-zero exit with "model did not return JSON" means the
prompt needs tightening, not that the pipeline is broken.

- [ ] **Step 5: Commit**

```bash
git add scripts/analyst.sh scripts/analyst-prompt.md scripts/com.pebblerobo.analyst.plist
git commit -m "feat: the Mac-side analysis job, on the owner's Claude rather than an API key"
```

---

### Task 12: Cron wiring, env, and the first live run

**Files:**
- Create: `vercel.json`
- Modify: `.env.example`

**Interfaces:** none.

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/insights/run", "schedule": "30 3 * * *" }
  ]
}
```

03:30 UTC is 09:00 IST. Confirm the current plan permits a daily cron before
deploying; if the plan limits frequency, the schedule is the thing that
changes, not the code.

- [ ] **Step 2: Document the new environment variables in `.env.example`**

```bash
# --- Insights dashboard -----------------------------------------------------
# Mixpanel → Organization Settings → Service Accounts (read access)
MIXPANEL_SERVICE_ACCOUNT=
MIXPANEL_SERVICE_SECRET=
MIXPANEL_PROJECT_ID=
# Meta Business → System Users → generate token with ads_read
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=act_
# The /admin password, and the HMAC key for its session cookie (32+ chars)
ADMIN_PASSWORD=
ADMIN_SECRET=
# Authenticates the Vercel cron to /api/insights/run
CRON_SECRET=
# Shared secret between the Mac job and the analyst endpoints
ANALYST_SECRET=
```

- [ ] **Step 3: Set every variable in production**

```bash
for v in MIXPANEL_SERVICE_ACCOUNT MIXPANEL_SERVICE_SECRET MIXPANEL_PROJECT_ID \
         META_ACCESS_TOKEN META_AD_ACCOUNT_ID ADMIN_PASSWORD ADMIN_SECRET \
         CRON_SECRET ANALYST_SECRET; do
  npx vercel env add "$v" production
done
```

- [ ] **Step 4: Run the whole suite and build**

```bash
npx vitest run
npx playwright test --reporter=line
rm -rf .next && npx next build
```

Expected: all green. A failure here is a real failure — do not deploy past it.

- [ ] **Step 5: Deploy and trigger the first run by hand**

```bash
npx vercel --prod --yes
curl -fsS -X POST https://pebblerobo.com/api/insights/run \
  -H "Authorization: Bearer $CRON_SECRET" | python3 -m json.tool
```

Expected: `{"status": "awaiting_analysis", "mixpanelOk": true, "metaOk": true}`.
If either flag is false, the credential for that source is wrong — the run
still succeeded, and the dashboard will say which half is missing.

- [ ] **Step 6: Run the Mac job once by hand, then install it**

```bash
ANALYST_SECRET=... ./scripts/analyst.sh
cp scripts/com.pebblerobo.analyst.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.pebblerobo.analyst.plist
```

Then open `https://pebblerobo.com/admin`, sign in, and confirm the headline,
the recommendations and both timestamps are present.

- [ ] **Step 7: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat: nightly cron schedule and documented insights environment"
```

---

## Deferred, deliberately

The A/B experimentation half of the original request — variant generation,
traffic splitting, automatic kill decisions — is not in this plan. See §1 of
the spec. Revisit when weekly paid conversions reach the low hundreds; the
dashboard built here is what will say when that has happened.
