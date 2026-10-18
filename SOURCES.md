# Sources

Reference: the research this role is built on, for maintainers of this plugin.
Fetched October 2026.

## Standards and frameworks

- **DORA, "DORA's software delivery metrics: the four keys"** - https://dora.dev/guides/dora-metrics-four-keys - the five delivery metrics (throughput and instability) and the rules against using them as targets; `pipeline-observability`.
- **SLSA v1.0, Security levels** - https://slsa.dev/spec/v1.0/levels - Build L0-L3 and what each protects against; `supply-chain-security`.
- **SLSA v1.0, Producing artifacts (requirements)** - https://slsa.dev/spec/v1.0/requirements - producer and build-platform duties: provenance exists, authentic, unforgeable; isolated builds; cache poisoning.
- **OpenSSF Scorecard checks (summarized by Microsoft's NuGet team)** - https://devblogs.microsoft.com/nuget/openssf-scorecard-for-net-nuget/ - the 19 checks and risk levels behind `posture-checklist.md`.
- **REUSE Specification 3.3 (FSFE)** - https://reuse.software/spec-3.3/ - `LICENSES/`, SPDX headers, `.license` sidecars, `REUSE.toml`; `license-compliance`.
- **CISA 2025/2026 SBOM minimum elements (FOSSA summary)** - https://fossa.com/blog/cisa-releases-2026-minimum-sbom-elements/ - SBOM fields, PURL/CPE, SPDX license IDs, per-release SBOMs.
- **OpenChain ISO/IEC 5230** - https://openchainproject.org/license-compliance - the shape of a license compliance programme (where, who, sustainability).
- **Semantic Versioning 2.0.0** - https://semver.org/ - public API, bump rules, pre-releases, immutability, deprecation; `release-management`.
- **SFIA 9, Release management (RELM)** - https://sfia-online.org/en/skillcode/9/RELM - responsibility levels 2-6; the junior-to-senior path in the explanation page.
- **Reproducible Builds, SOURCE_DATE_EPOCH** - https://reproducible-builds.org/docs/source-date-epoch/ - deterministic timestamps; the nondeterminism checklist in `cross-platform-builds`.

## Books and practitioner sources

- **Google SRE book, ch. 8 "Release Engineering"** - https://sre.google/sre-book/release-engineering/ - self-service, hermetic builds, release branches with cherry-picks, change reports, signed packages.
- **Google SRE Workbook, ch. 16 "Canarying Releases"** - https://sre.google/workbook/canarying-releases/ - canary vs control, metric choice, exposure x time, rollback; staged rollouts and release health.
- **Forsgren, Humble and Kim, *Accelerate* (IT Revolution, 2018)** - book - the research showing throughput and stability improve together; the "why it matters" in the explanation page.
- **Continuous Delivery principles (Humble and Farley)** - https://continuousdelivery.com/principles/ - build quality in, small batches, automation, everyone responsible; pipeline shape in `ci-pipelines`.
- **Trunk Based Development, context** - https://trunkbaseddevelopment.com/context - CI/TBD relationship; branching model choice.
- **OWASP Top 10 CI/CD Security Risks** - https://owasp.org/www-project-top-10-ci-cd-security-risks/ - CICD-SEC-1 to 10 (flow control, poisoned pipeline execution, pipeline-based access control, credential hygiene, artifact integrity); the security check in `change-pipeline`.
- **GitHub Docs, "Secure use reference" (GitHub Actions)** - https://docs.github.com/en/actions/reference/security/secure-use - read-only default token raised per job, full-length commit SHA as the only immutable action reference, untrusted input via environment variables, avoid `pull_request_target`; an example of the provider-neutral rules in `ci-pipelines`.
- **GitHub Docs, "Downloading workflow artifacts"** - https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts - anyone signed in with read access can download artifacts; 90-day default retention; why `change-pipeline` sets retention explicitly and treats public repositories as readable by all.
- **GitLab Docs, "Job artifacts"** - https://docs.gitlab.com/ci/jobs/job_artifacts - `expire_in` and `artifacts:access` as a second provider's form of retention and download control.
- **GitHub Docs, "Dependency caching" reference** - https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching - cache keys, restore keys and branch scope (a branch reads its own and the default branch's caches); the cache rules in `build-generated-asset`.
- **CMake, `add_custom_command`** - https://cmake.org/cmake/help/latest/command/add_custom_command.html - `OUTPUT` and `DEPENDS` so a generator reruns only when inputs change; an example of the build target in `build-generated-asset`.
- **Diataxis** - https://diataxis.fr - documentation structure, followed via the project's Diataxis guide.

## Job postings (responsibilities and skill mix)

- **OpenAI, Release Engineer, Consumer Devices** - https://openai.com/careers/release-engineer-or-consumer-devices-san-francisco/ - hermetic toolchains, flaky-test quarantine, staged rollouts, signing, SBOMs, provenance, build-health dashboards.
- **Central Business Solutions, Build & Release Engineer (Remotive)** - https://remotive.com/remote/jobs/devops/build-release-engineer-5463235 - mobile signing and store submissions, phased rollouts, changelog automation, runbooks, mentoring.
- **Visa, Staff Release Engineer** - https://jobs.smartrecruiters.com/Visa/111986919-staff-release-engineer - traceability and auditability, automation, staff-level scope.
- **Electronic Arts, Intermediate Build Engineer** - https://jobs.ea.com/en_US/careers/JobDetail/Intermediate-Build-Engineer-Apex-Legends/204611 - build pipelines, liaison with teams on build issues, console first-party releases.
- **thatgamecompany, Build Engineer** - https://www.builtinboston.com/job/build-engineer/10969845 - multi-platform build and release, storefront tooling, release coordination, documentation.

Not fetched directly (search budget ran out): individual store guidelines
(e.g. Apple App Review Guidelines, Google Play policy). `store-distribution` therefore tells the role to read
each store's current guidelines before every submission instead of
encoding them.
