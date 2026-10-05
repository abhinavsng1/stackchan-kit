# Insights dashboard — design

**Date:** 2026-10-05
**Status:** awaiting review

---

## 1. What this is, and what it deliberately is not

The request was an agent that reads Mixpanel and Meta Ads, decides what to
change on the site, generates UI variants, runs A/B experiments, kills the
losers and iterates on the winner.

**The A/B half is deferred, not cancelled.** As of today the site has 8 orders
and 4 paid. Detecting a 20% lift on conversion needs on the order of
1,500–3,000 conversions *per variant*; at the current rate that is years per
experiment. An agent told to kill the loser at n=4 would kill one every single
time, because two variants with identical true performance diverge wildly at
that sample size. It would not be reading signal. It would be reading coin
flips and acting on them with confidence.

So what gets built is the half that is useful today and is also the
precondition for the other half:

> A password-gated `/admin` page on pebblerobo.com showing the live funnel,
> ad spend, and a written daily read of where people are dropping off and what
> to try — with no autonomous shipping and no autonomous killing.

The dashboard is also the instrument that will say when experimentation
becomes viable. When weekly conversions reach the low hundreds, revisit.

**Success:** open it in the morning and within ten seconds know where people
drop off, what a booking costs in ad spend, and what to try next.

### Scope boundaries

- Lives inside the existing Next app. Not a separate service.
- One user. No roles, no multi-tenant auth.
- Read-only against Mixpanel, Meta and the orders table. It never writes to any
  of them.
- `/admin` excluded from robots and sitemap.

---

## 2. Architecture

Two stages with different owners, because the LLM half cannot run on a server.

```
Vercel Cron · 03:30 UTC (09:00 IST)          always runs, no Claude involved
      │
      ▼
POST /api/insights/run                        Bearer CRON_SECRET
      ├─ claim today's run row                unique on run_date → idempotent
      ├─ pull Mixpanel Query API             ─┐
      ├─ pull Meta Marketing API              ├─ each may fail independently
      ├─ read own orders table                │
      ├─ store raw + per-source ok flags     ─┘
      └─ status = awaiting_analysis

Your Mac · launchd · 09:00 IST                runs as you, on your subscription
      ├─ GET /api/insights/latest-raw         Bearer ANALYST_SECRET
      ├─ claude -p  →  structured JSON
      └─ POST /api/insights/analysis          Bearer ANALYST_SECRET

/admin  (cookie-gated)
      └─ read latest run                      instant, no API calls, no tokens
```

### Why the split

A Claude subscription authenticates as a person on their machine. There is no
credential a Vercel function can carry to act as that person — that gap is
precisely what API keys exist to fill. Claude Code's built-in scheduler is
session-only, in-memory and expires after seven days, so it is not a daily
production job either.

The consequence worth designing around: **the numbers must not depend on a
laptop being awake.** Only the written analysis does. When the Mac was asleep,
the page shows current numbers and says the analysis is awaiting, rather than
presenting a stale paragraph as if it were today's.

### The orders table is ground truth for conversions

Mixpanel's bottom-of-funnel number will under-report — ad blockers and privacy
browsers drop a meaningful share of client-side events. Postgres knows exactly
who paid.

So the funnel's upper stages come from Mixpanel, the conversion count comes
from Postgres, and the page labels which is which. Computing a conversion rate
across two incompatible denominators is how a dashboard reports nonsense with a
straight face.

---

## 3. Data model

One table, one row per day.

```sql
create table if not exists insight_runs (
  id            bigserial primary key,
  run_date      date not null unique,   -- idempotency: a retry cannot double-run
  status        text not null default 'pending',
                -- pending | processing | awaiting_analysis | completed | failed
  attempts      smallint not null default 0,   -- capped at 3
  started_at    timestamptz,
  fetched_at    timestamptz,            -- when the numbers were pulled
  analysed_at   timestamptz,            -- when the read was written
  error         text,

  mixpanel_ok   boolean,                -- per-source, so partial failure shows
  meta_ok       boolean,
  mixpanel      jsonb,
  meta          jsonb,
  orders        jsonb,

  analysis      jsonb,                  -- validated model output only
  model         text
);
```

Raw pulls are kept deliberately. If an analysis comes back malformed it can be
re-run against the same data without re-hitting either API, and what the model
saw can be diffed against what it said.

`run_date` being unique is the whole idempotency story: a retried cron, a
double-fired schedule or a manual re-run all land on the same row.

---

## 4. The analysis contract

Zod-validated before anything is stored. Invalid output is never written: the
run goes `failed`, the raw response is kept, and the page continues to show the
previous good analysis clearly dated.

```ts
const Analysis = z.object({
  headline: z.string().max(120),
  biggestDropOff: z.object({
    from: z.string(), to: z.string(),
    lostPct: z.number().min(0).max(100),
    why: z.string().max(400),
  }),
  recommendations: z.array(z.object({
    what: z.string().max(200),
    where: z.string().max(80),              // section or component
    rationale: z.string().max(400),
    confidence: z.enum(['low', 'medium', 'high']),
    effort: z.enum(['minutes', 'hours', 'days']),
  })).min(1).max(4),
  adVerdict: z.array(z.object({
    campaign: z.string().max(120),
    verdict: z.enum(['scale', 'hold', 'kill']),
    why: z.string().max(240),
  })).max(6),
  dataCaveats: z.array(z.string().max(200)).max(4),
})
```

### The model may not certify its own confidence

The model proposes a confidence; the server recomputes what the sample size
actually supports and **caps** it. With 4 conversions every purchase-related
recommendation resolves to `low`, however certain the prose sounds.

This is the rule that makes the whole thing safe to read. An LLM shown 2-vs-1
will write "clear winner" without hesitation. AI output is advisory; the server
decides. The cap is implemented in code and unit-tested, not asked for in the
prompt.

### No customer data in the prompt

The Claude call receives counts, rates and spend. Never a name, email, phone or
address. The published privacy page states that order details go to Mixpanel
and to the courier; it does not say they go to a language model, and this keeps
that true.

---

## 5. Security

| Surface | Control |
|---|---|
| `/admin` | password → HMAC-signed httpOnly, secure, sameSite=lax cookie; timing-safe compare; failed attempts rate-limited |
| `/api/insights/run` | `Bearer CRON_SECRET` (Vercel injects when the env var is set) |
| `/api/insights/latest-raw` | `Bearer ANALYST_SECRET`; returns aggregates only, never PII |
| `/api/insights/analysis` | `Bearer ANALYST_SECRET`; accepts only for a run in `awaiting_analysis`, so it is idempotent and cannot rewrite history |
| `robots.ts` | add `/admin` to the existing disallow list |

### New environment variables

```
MIXPANEL_SERVICE_ACCOUNT     Mixpanel → Organization Settings → Service Accounts
MIXPANEL_SERVICE_SECRET
MIXPANEL_PROJECT_ID
META_ACCESS_TOKEN            Meta Business → System Users → generate token
META_AD_ACCOUNT_ID           act_XXXXXXXXXX
ADMIN_PASSWORD               the /admin password
ADMIN_SECRET                 HMAC key for the session cookie
CRON_SECRET                  Vercel cron authentication
ANALYST_SECRET               the Mac job's shared secret
```

Neither read credential can be derived from what the project already holds.
`NEXT_PUBLIC_MIXPANEL_TOKEN` is an ingestion token and is write-only by design;
`NEXT_PUBLIC_META_PIXEL_ID` identifies where data goes, not how to read it back.
**Nothing runs until both are issued.**

---

## 6. Error states

The page distinguishes five, because "no data" and "stale data" are different
mistakes to make:

| State | What the page shows |
|---|---|
| never run | setup instructions, not an empty dashboard |
| awaiting analysis | current numbers + "analysis pending since …" |
| completed | everything, with both timestamps |
| failed | last good analysis, clearly dated, plus what failed |
| stale | banner when numbers >36h or analysis >48h old |

Partial failure is first-class. If Meta is unreachable the run still completes
with the funnel half, `meta_ok = false`, and the page says *"Ad data
unavailable — this read is funnel-only."* An agent that silently omits half its
inputs and writes a confident paragraph is worse than one that fails loudly.

---

## 7. Testing

Unit: Zod accept/reject on malformed model output; the confidence cap; run
state transitions; per-day idempotency; timing-safe auth comparison; freshness
arithmetic; both providers mocked including failure and partial-failure paths.

E2E: `/admin` redirects without a cookie; renders with one; shows the stale
banner on an old row; shows the awaiting-analysis state.

---

## 8. To verify at build time, not from memory

- Mixpanel Query API endpoint shapes, auth header form and project-id parameter.
- Meta Marketing API version and the `insights` field set.
- Whether Vercel injects `Authorization: Bearer $CRON_SECRET` or a different
  header on cron invocations.
- `claude -p` non-interactive flags and how to constrain it to JSON output.
- Vercel cron frequency limits on the current plan.

---

## 9. Build order

1. Schema + run state machine + idempotency, with tests. No external calls.
2. `/admin` auth and the page shell, rendering an empty state honestly.
3. Mixpanel pull. 4. Meta pull. 5. Orders pull. Each behind its ok flag.
4. The analysis contract, the confidence cap, and the two analyst endpoints.
5. The launchd job and its script.
6. Cron wiring and first live run.

Each step is independently verifiable, and the dashboard is useful from step 3
onward even with no analysis at all.
