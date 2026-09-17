# Mixpanel board — Pebble-chan

Everything below is already firing from the live site. The event names come from
`lib/events.ts`, so this document and the code cannot drift apart.

> I could not create the board myself: `NEXT_PUBLIC_MIXPANEL_TOKEN` is a
> **write-only ingestion token**. Creating reports needs a **Service Account**
> (Project Settings → Service Accounts → Add, role *Analyst* or above). Hand me
> `username:secret` and I will build this via the API instead.

## What each event is for

| Event | Fires when | Use it for |
|---|---|---|
| `Page Viewed` | Analytics initialises | Traffic, unique visitors |
| `Scroll Depth` | 25 / 50 / 75 / 90 % reached | **Where people stop reading** |
| `Section Viewed` | A section is 25 % on screen | Which parts get seen at all |
| `Gallery View Chosen` | A gallery thumbnail is clicked | Whether the 3D or the photo pulls |
| `Demo Video Played` / `Progress` | Video starts / 25-95 % | Whether the demo holds attention |
| `FAQ Opened` | A question is expanded | What people are unsure about |
| `Specs Expanded` | Spec table opened on mobile | Whether specs matter to buyers |
| `Reserve CTA Clicked` | Any reserve button | Intent |
| `Reserve Form Started` | First focus in the form | **Intent → effort** |
| `Reserve Field Invalid` | Client validation blocks submit | **Which field loses people** |
| `Reserve Submitted` | Valid payload sent | Effort → attempt |
| `Reserve Succeeded` | Server returned 201 | **Conversion** |
| `Reserve Already Held` | 409 duplicate | Repeat visitors |
| `Reserve Failed` | 500 / network | Reliability |

Every event also carries `viewport` (phone/tablet/desktop), `referrer_host` and
`landing_path` as super properties, so any report can be broken down by those
without extra work.

## Board: "Pebble-chan — funnel and dropoff"

**1. Conversion funnel** (Funnels → Conversion)

```
Page Viewed
  → Section Viewed         where section = reserve
  → Reserve CTA Clicked
  → Reserve Form Started
  → Reserve Submitted
  → Reserve Succeeded
```
Window 1 day. Breakdown by `viewport`. This single report answers "where do
people fall out". The gap between *CTA Clicked* and *Form Started* is hesitation;
the gap between *Form Started* and *Submitted* is the form's fault.

**2. Scroll dropoff** (Insights → Bar)
`Scroll Depth`, segmented by `percent`, counting **unique users**. A cliff between
two marks is the section to fix.

**3. Unique visitors over time** (Insights → Line)
`Page Viewed`, measured by **Unique users**, daily. Breakdown by `referrer_host`
to see which channel actually works.

**4. Which field blocks people** (Insights → Bar)
`Reserve Field Invalid`, segmented by `fields`, unique users. If one field
dominates, that field is costing you reservations.

**5. What holds attention** (Insights → Bar)
`Section Viewed` segmented by `section`, unique users — compare against
`Gallery View Chosen` by `view` and `Demo Video Progress` by `percent`.

**6. Reliability** (Insights → Line)
`Reserve Failed` by `status`, plus `Reserve Succeeded`, daily. Should be flat at
zero; anything else is a bug, not a marketing problem.

## Retention

Retention → `Page Viewed` as both the born and returning event, weekly. For a
pre-order page a low number is expected; a sudden change is the signal.
