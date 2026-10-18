# About the DevOps engineer role

*Explanation, for owners, project managers and other roles who want to
understand what this job is, where it stops, and why it works the way it
does.*

## What the job is

The title varies: DevOps engineer, build engineer, release engineer, build
and release engineer. Across the postings and frameworks behind this plugin
(see [SOURCES.md](../../SOURCES.md)) the core is the same: own the path
from a commit to a user. A console studio's build engineer keeps
multi-platform builds green and coordinates releases with production; a
consumer-devices release engineer runs hermetic toolchains, signing, SBOMs,
staged rollouts and build-health dashboards; a mobile and SaaS build and
release engineer automates signing, store submissions, changelogs and
rollbacks. SFIA's release management skill describes the same arc in
management terms, from assisting with release tasks to setting release
strategy.

This plugin's role covers that path for any kind of product. It does not
assume a language, engine, CI service or store; the project names those.

## Why it matters

The DORA research, summarized in *Accelerate* and the yearly State of
DevOps reports, found that delivery throughput and stability move together
rather than trading off: teams that ship small changes often, through
automated pipelines, also fail less and recover faster. A DevOps engineer is
how a small team gets those capabilities without each developer building
them alone. Supply-chain attacks and license obligations add a second
reason: what ships has to be provably what was built, from what was
declared, under licenses that were honoured.

## Where the role stops

The boundary that matters most is between *making things build and ship*
and *the things themselves*.

- Programmers (gameplay, graphics, UI) own their code and tests. The DevOps
  engineer makes those tests run on every target and fixes build scripts,
  not features.
- The frontend-web-developer owns the website, including download and
  credits pages. The DevOps engineer hands over artifacts, checksums, store
  links and a generated notices file; the website consumes them.
- The graphic-designer owns store art. The DevOps engineer says what sizes
  and counts each store needs.
- The code-reviewer reviews PRs. The DevOps engineer may be asked for a
  pipeline or security opinion but does not gate others' work.
- The project-manager and the owner decide what goes into a release and
  when. The DevOps engineer says whether it is ready.
- The owner holds accounts, agreements and keys. This is the hardest line
  and the one most often crossed "to save time". Store accounts and signing
  identities are legal and financial commitments; the role prepares exact
  instructions and stops.

## Quality bars, and why these ones

- **Ten-minute PR feedback.** Feedback slower than a coffee break gets
  batched and ignored; the Continuous Delivery literature and DORA both tie
  fast feedback to small batches.
- **Build once, promote.** Rebuilding at release time means shipping bytes
  that were never tested. Promoting by digest makes "what we tested" and
  "what we shipped" the same thing.
- **Pinned, verified inputs.** Floating versions make builds unrepeatable
  and give an attacker a way in. The SRE book's hermetic builds and SLSA's
  provenance both rest on knowing every input.
- **Evidence attached to every release.** Checksums, SBOM, provenance,
  notices and source archive answer the questions users, auditors and
  licensors will ask, without anyone needing to remember.
- **Explicit build options per job.** Defaults change. A job that relied on
  one breaks the day someone adds a new default-on option for a different
  target; passing options explicitly keeps one target's change from
  breaking another's.

## Trade-offs behind the methods

**Speed versus completeness in CI.** Running everything on every PR is
safe but slow; running little is fast but lets breakage reach the default
branch. The commit/integration split is the usual compromise: likely and
cheap failures first, the full matrix after merge, with a stop-the-line
rule so the default branch never stays red.

**Caching versus correctness.** Caches are the biggest speed lever and the
easiest way to ship a wrong build. The role errs toward correctness for
release builds (no cache, or verified content-addressed caches) and toward
speed for PR builds.

**Trunk-based versus release branches.** Trunk-based development fits
continuous delivery and keeps integration pain low. Release branches cost
cherry-picking effort but let a team stabilize or support a version while
the trunk moves. The role picks per project and writes down why.

**Roll back versus roll forward.** Rolling back is fastest when it is
possible, but stores often forbid downgrades and data formats may have
changed. Deciding before release which applies keeps an incident from
becoming a debate.

**Metrics as mirrors, not targets.** DORA warns that delivery metrics
turned into targets get gamed. The role uses them to find the next
constraint and to report before/after deltas, never to rank people.

**Copyleft duties.** For a project under a copyleft license, every shipped
binary needs its complete corresponding source available. The simplest
reliable way is to attach the tagged source archive to every release and
link it from the release page, store page and in-product licenses screen.
It costs a little storage and removes a recurring legal risk.

## How the role grows

Drawing on SFIA's levels and the seniority spread in the postings:

- **Junior**: runs and fixes existing pipelines, adds a check or a target
  following a written method, keeps the default branch green, writes the
  how-to for what they changed.
- **Mid-level**: designs pipeline stages and caches, owns releases end to
  end, sets up signing and store sheets, removes flaky tests at the source.
- **Senior**: makes builds hermetic and reproducible, sets the project's
  supply-chain posture (SLSA level, SBOM, provenance), defines the release
  model and rollback strategy, measures delivery performance and leads the
  improvements.
- **Staff and beyond**: sets release and compliance policy across projects,
  builds self-service tooling so product teams release without help, and
  mentors others; success is a pipeline nobody has to think about.
