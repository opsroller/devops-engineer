# pipeline-observability skill

*Reference, for anyone looking up what the pipeline-observability skill covers.*

| Field | Value |
|---|---|
| File | `skills/pipeline-observability/SKILL.md` |
| Used when | measuring delivery performance, pipeline dashboards and alerts, slow or flaky CI, cache effectiveness, expiring credentials |
| Produces | metric definitions, dashboards, alerts, before/after reports |

## DORA metrics

| Metric | Group |
|---|---|
| Change lead time | throughput |
| Deployment frequency | throughput |
| Failed deployment recovery time | throughput |
| Change fail rate | instability |
| Deployment rework rate | instability |

Rules: not targets; used together; per application; shared; not for ranking.

## Pipeline health signals

PR feedback time (p50/p90), default-branch red time, flake rate, runner queue time, cache hit rate, per-target success rate, artifact size, certificate/key/token expiry, dependency freshness and open vulnerabilities, runner cost.

## Release health

Crash-free rate, error rate, ratings and reviews, adoption; new version compared with previous, broken down by version.

## Docs owed

Reference for metrics and alerts; how-to runbook per alert; explanation of why these metrics.
