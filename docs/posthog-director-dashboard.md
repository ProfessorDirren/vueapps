# VUEAPPS — PostHog director dashboard (EU project)

## Deployment status
Dashboard specification is version-controlled here. **This file does not create a dashboard in PostHog.**
The PostHog integration must be connected to create and verify the actual dashboard. No
PostHog private API key may be placed in this repository, browser JavaScript, or Vercel client variables.

## Create one private dashboard: "VUEAPPS | Director Overview"
Use the existing VUEAPPS PostHog EU project; do not create a new project or paid service.
Use 7-day and 30-day time ranges and filter `$host` / `$current_url` to `vueapps.se` and `www.vueapps.se`
to exclude historical `anivueapp.se` events. All specialist charts should break down by event property `vue_app`.

| Tile | Event / calculation | Visualization |
|---|---|---|
| Visits | `$pageview` total | Trend |
| Unique visitors | `$pageview` unique distinct IDs | Trend |
| Most-used VUE | `$pageview` grouped by `vue_app` | Bar |
| Assessment starts | `assessment_started` total grouped by `vue_app` | Bar |
| Successful API responses | `assessment_completed` total grouped by `vue_app` | Bar |
| Completion ratio (approximate) | completed count / started count, same time window and `vue_app` | Formula |
| Specialist interactions | `specialist_action` grouped by `vue_app` and `action` | Bar |

**Interpretation limits:** `assessment_completed` currently means HTTP 2xx, not a
validated AI answer. It can include application-level failures returned as HTTP 200.
The ratio is an aggregate, not a per-user conversion funnel; retry and boundary effects
can affect it. Some VUEs are local-only and have no assessment API, so their visits and
actions must not be treated as failed assessments. Browser DNT/GPC and ad blockers
can suppress events, so totals are not a complete count of all traffic.

## Privacy / costs
Do not enable session replay, autocapture, person profiles, user identification, or
capture prompt text, images, answers, identifiers or URLs with query strings.
Keep the existing EU ingestion endpoint and free-plan limits; monitor usage.
No reverse proxy is needed for this dashboard.
