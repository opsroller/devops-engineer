---
name: pipeline-observability
description: Use when measuring or improving delivery performance, building a pipeline health dashboard or alerts, tracking DORA metrics, investigating slow or flaky CI, cache effectiveness, runner capacity, or expiring certificates and credentials.
---

# Pipeline observability

The pipeline is a production system for the team: measure it, alert on it,
and improve it with evidence. Grounded in DORA's software delivery metrics
and guidance, Accelerate (Forsgren, Humble, Kim) and the SRE books'
monitoring and canarying practice.

## Delivery metrics (DORA)

| Metric | Group | Definition | Source of data |
|---|---|---|---|
| Change lead time | throughput | commit to running in production / available to users | VCS timestamps + release/deploy events |
| Deployment frequency | throughput | releases or deployments per period | release events |
| Failed deployment recovery time | throughput | time to recover from a deployment needing immediate intervention | incident or rollback/hotfix events |
| Change fail rate | instability | share of deployments needing immediate intervention (rollback, hotfix) | release events tagged failed |
| Deployment rework rate | instability | share of deployments that are unplanned, caused by a production incident | hotfix releases / all releases |

For store-distributed products, "deployment" = a release reaching users
(the staged rollout's first production step); record the definition used.

DORA's rules, which you must follow:
- **Metrics are not goals.** Never set them as targets for people
  (Goodhart's law); use them to find the next improvement.
- Use them together; throughput and instability balance each other.
- Measure per application/service; do not compare unlike products.
- Share them with everyone; do not use them to rank teams.
- Start simply (a script over VCS and release data) before buying tools.

## Pipeline health signals

| Signal | Why | Typical alert |
|---|---|---|
| PR feedback time (p50, p90) | developer flow | p50 > 10 min for a week |
| Default-branch red time | stop-the-line discipline | red > 1 h |
| Flake rate (same commit, different result) | trust in CI | rising week over week |
| Queue time for runners | capacity | p90 > 5 min |
| Cache hit rate and time saved | cost/benefit of caches | hit rate drop after a change |
| Build success rate per target | platform drift | target below others |
| Artifact size per target | bloat, store limits | +10% in a release |
| Certificate, key and token expiry | avoid release-day outages | 30 days before expiry |
| Dependency freshness and open vulnerability count | supply chain | criticals open > SLA |
| Cost (runner minutes) | budget | over agreed budget |

## Method: improving the pipeline

1. Baseline: collect at least two weeks of the signals above.
2. Find the constraint: the largest contributor to feedback time or red
   time (often one slow job, queue time or flakes).
3. Change one thing (split a job, add a correct cache, parallelize tests,
   quarantine flakes, add runners).
4. Compare against the baseline; keep or revert.
5. Report the delta in the PR and in the dashboard notes.

## Release health (after shipping)

Watch, for the agreed window after each release: crash-free sessions/users,
error rate, store ratings and reviews, update adoption. Compare the new
version against the previous one (canary vs control), not just against an
absolute threshold, and break metrics down by version so aggregates do not
hide a bad release. A material divergence pauses the rollout
(`store-distribution`, `release-management`).

## Quality bar

- Delivery metrics and pipeline health are visible to the whole team and
  updated automatically.
- Every alert has an owner and a written response; noisy alerts are fixed
  or deleted.
- Pipeline changes report before/after numbers.

## Failure modes

- Vanity dashboards nobody looks at; alerts nobody owns.
- Optimizing deployment frequency while change fail rate climbs.
- Metrics used to blame people or compare teams.
- Averages hiding tail latency (report p50 and p90).
- Certificates expiring silently.

## Documentation this work owes (Diataxis)

- Metric definitions, dashboard and alert list -> **reference**.
- Response to each alert -> **how-to** (runbook: "How to respond to an
  expiring signing certificate").
- Why these metrics and how to read them -> **explanation**.
