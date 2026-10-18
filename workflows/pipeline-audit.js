// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'pipeline-audit',
  description: 'Audit the delivery pipeline (CI, builds, supply chain, license compliance, observability) in parallel, optionally fix the findings on one branch with a review loop, and document the result. args: { fix?: boolean (default false), areas?: ["ci"|"builds"|"supply-chain"|"licenses"|"observability", ...] }',
  phases: [
    { title: 'Plan', detail: 'inventory pipelines and targets; list affected doc kinds' },
    { title: 'Audit', detail: 'one read-only agent per area' },
    { title: 'Fix', detail: 'one agent applies fixes; independent review loop (only if fix: true)' },
    { title: 'Docs', detail: 'update pipeline reference, how-tos and explanation' },
    { title: 'Docs check', detail: 'one Diataxis kind per page' },
  ],
}

const ALL = ['ci', 'builds', 'supply-chain', 'licenses', 'observability']
const USAGE = 'usage: pipeline-audit { fix?: boolean, areas?: ["ci","builds","supply-chain","licenses","observability"] }'
const fix = !!(args && args.fix)
const areas = (args && Array.isArray(args.areas) && args.areas.length) ? args.areas : ALL
const bad = areas.filter(a => !ALL.includes(a))
if (bad.length) return `unknown area(s): ${bad.join(', ')}. ${USAGE}`

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const SKILL = {
  ci: 'ci-pipelines (stage order and timing, build once and promote, explicit build options per job, new default-on options safe for all jobs, checksum-verified downloads, required checks, flaky-test handling, trigger and token security)',
  builds: 'cross-platform-builds (pinned toolchains, hermetic inputs, nondeterminism checklist, cache keys, cold build passes)',
  'supply-chain': 'supply-chain-security and its posture-checklist.md (pinning, update tool, SBOM, provenance, signing, secrets)',
  licenses: 'license-compliance (REUSE lint, project license on every project file and no template default licenses, dependency licenses, single credits source, notices and copyleft source duties)',
  observability: 'pipeline-observability (DORA metrics, pipeline health signals, alerts with owners, certificate expiry)',
}

const PLAN = { type: 'object', properties: {
  pipelines: { type: 'array', items: { type: 'string' } },
  targets: { type: 'array', items: { type: 'string' } },
  baseline: { type: 'string' },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['pipelines', 'targets', 'docs'] }

const FINDINGS = { type: 'object', properties: {
  findings: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
    owner_only: { type: 'boolean' } }, required: ['severity', 'where', 'problem', 'fix'] } },
}, required: ['findings'] }

const REVIEW = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  other: { type: 'array', items: { type: 'string' } },
}, required: ['blocking'] }

const DOCCHECK = { type: 'object', properties: {
  problems: { type: 'array', items: { type: 'string' } },
}, required: ['problems'] }

phase('Plan')
const plan = await agent(
  `Pipeline audit, planning only (write nothing). Read the project's CLAUDE.md and profile. List every pipeline definition file, the build targets, and a baseline of pipeline health (PR feedback time, default-branch red time, flake rate, cache hit rate) from recent CI runs where available (pipeline-observability skill). Then, with the Diataxis compass, list the project doc pages an audit${fix ? ' and its fixes' : ''} will affect: at least the pipeline reference; how-tos for any contributor procedure that changes; an explanation if a design choice is made.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was audited'

phase('Audit')
const audits = await pipeline(areas, area =>
  agent(`Audit area "${area}" of the project's delivery pipeline. Pipelines: ${plan.pipelines.join(', ')}. Targets: ${plan.targets.join(', ')}.
Follow the devops-engineer skill ${SKILL[area]}. Read-only: do not edit anything. Report each finding with severity, file/line or setting, the problem, the concrete fix, and owner_only=true if only the project owner can do it (accounts, keys, repository settings you cannot change).`,
    { schema: FINDINGS, phase: 'Audit', label: `audit:${area}` })
    .then(r => r ? { area, findings: r.findings } : { area, findings: [], unverified: true }))

const findings = audits.flatMap(a => a.findings.map(f => ({ area: a.area, ...f })))
const unverified = audits.filter(a => a.unverified).map(a => a.area)
const fixable = findings.filter(f => !f.owner_only)
const ownerOnly = findings.filter(f => f.owner_only)

let fixState = 'not requested'
let openBlockers = []
if (fix && fixable.length) {
  phase('Fix')
  const branch = 'ci/pipeline-audit-fixes'
  const applied = await agent(
    `On branch ${branch}, as the only agent editing files, apply these pipeline fixes in severity order, one Conventional Commit per logical change (ci:, build:, chore:), keeping the old path until the new one runs green:
${fixable.map(f => `- [${f.severity}] ${f.area} ${f.where}: ${f.problem} -> ${f.fix}`).join('\n')}
Follow the devops-engineer ci-pipelines, cross-platform-builds, supply-chain-security and license-compliance skills. Never disable a check to get green. Run the pipeline, push, open a draft PR. Return the PR URL and before/after pipeline numbers against this baseline: ${plan.baseline || 'none recorded'}.`,
    { phase: 'Fix', label: 'fix' })
  if (!applied) return { decision: 'blocked', reason: 'fix agent returned nothing', findings, unverified }
  fixState = 'applied'
  for (let round = 1; round <= 3; round++) {
    const r = await agent(`Independently review the open PR on ${branch} (code-reviewer role if installed): correctness, security of triggers and tokens, pinning, caches, nothing disabled to get green. List blocking problems only where you can point to a realistic failure.`,
      { schema: REVIEW, phase: 'Fix', label: `review:${round}` })
    if (!r) { openBlockers = ['review did not run; fixes unverified']; break }
    openBlockers = r.blocking
    if (!openBlockers.length) break
    if (round === 3) break
    const f = await agent(`Fix these blocking review findings on ${branch}, rerun the pipeline, commit (Conventional Commits) and push:\n- ${openBlockers.join('\n- ')}`,
      { phase: 'Fix', label: `fix:${round}` })
    if (!f) break
  }
  if (openBlockers.length) fixState = 'blocked'
}

phase('Docs')
const docs = await agent(
  `Document the pipeline audit${fixState === 'applied' ? ' and its fixes (on branch ci/pipeline-audit-fixes)' : ' (on a branch named docs/pipeline-audit)'} in the project's docs, as the only agent editing these files.
Pages planned: ${JSON.stringify(plan.docs)}
Findings: ${JSON.stringify(findings)}
Record open findings and owner-only actions in the pipeline reference (status section), not as instructions inside reference.
${DOCS_FRAGMENT}
Commit (docs: ...), push. Return pages touched.`,
  { phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  'Check the pipeline audit documentation changes against the Diataxis review checklist: one kind per page, how-to titles name a goal, explanation titles read "About ...", reference matches sibling format, links connect the kinds. Report problems with page and line.',
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check' })

const docProblems = !docs ? ['documentation agent returned nothing'] : !dc ? ['documentation check did not run; docs unverified'] : dc.problems
return {
  decision: fixState === 'blocked' || docProblems.length ? 'blocked' : 'done',
  fix: fixState,
  open_blockers: openBlockers,
  findings,
  owner_actions: ownerOnly,
  unverified,
  doc_problems: docProblems,
}
