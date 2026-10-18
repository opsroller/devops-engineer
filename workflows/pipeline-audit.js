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

// --- run-modes v2 begin ---
const RUN = ((a, realAgent, realPhase, realLog) => {
  const opted = !!(a && typeof a === 'object' && a.run && typeof a.run === 'object')
  const c = opted ? a.run : {}
  const mode = c.mode === 'inline' ? 'inline' : 'agents'
  const results = c.results && typeof c.results === 'object' ? c.results : {}
  const reviewers = c.reviewers && typeof c.reviewers === 'object' ? c.reviewers : {}
  const only = Array.isArray(c.only) && c.only.length ? c.only.map(String) : null
  const from = c.from ? String(c.from) : null
  const titles = typeof meta !== 'undefined' && meta && Array.isArray(meta.phases) ? meta.phases.map((p) => p.title) : []
  const unknown = titles.length ? (from ? [from] : []).filter((t) => !titles.includes(t)) : []
  const error = c.mode && !['agents', 'inline'].includes(c.mode)
    ? `run.mode must be "agents" or "inline", got "${c.mode}"`
    : unknown.length ? `run.from names no phase: ${unknown.join(', ')}. Phases: ${titles.join(', ')}` : null
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
  // An answer must carry every required key of its schema, as the runtime
  // enforces for agents; returns the missing keys, or null when it fits.
  const missing = (v, schema) => {
    if (v === null || v === undefined) return 'an answer'
    if (!schema || schema.type !== 'object') return null
    if (typeof v !== 'object' || Array.isArray(v)) return 'a JSON object'
    const gap = (schema.required || []).filter((k) => !has(v, k) || v[k] === undefined)
    return gap.length ? gap.join(', ') : null
  }
  const seen = {}
  const out = {}
  // Who answered each step marked independent: "subagent" when this run
  // spawned it, else the reviewer named in run.reviewers, else "self".
  const by = {}
  const who = (k) => (typeof reviewers[k] === 'string' && reviewers[k].trim() ? reviewers[k].trim() : 'self')
  const skipped = []
  const next = []
  const logs = []
  let current = ''
  let reached = !from
  let halting = false
  let release = () => {}
  const halted = new Promise((r) => { release = r })
  const picked = (ph, label) => reached && (!only || only.some((s) => s === ph || s === label || label.startsWith(s + ':')))
  const agent = (prompt, opts) => {
    const op = opts || {}
    const independent = op.independent === true
    const ph = op.phase || current
    const base = op.label || ph || 'agent'
    seen[base] = (seen[base] || 0) + 1
    const key = seen[base] > 1 ? `${base}#${seen[base]}` : base
    let note = null
    if (has(results, key)) {
      const gap = missing(results[key], op.schema)
      if (!gap) { out[key] = results[key]; if (independent) by[key] = who(key); return Promise.resolve(results[key]) }
      note = `answer missing ${gap}; answer this brief again`
    }
    if (!picked(ph, base)) { skipped.push(key); return Promise.resolve(null) }
    if (mode === 'agents') {
      const pass = Object.assign({}, op)
      delete pass.independent
      return realAgent(prompt, opts ? pass : opts).then((r) => {
        if (r !== null && r !== undefined) { out[key] = r; if (independent) by[key] = 'subagent' }
        return r
      })
    }
    const brief = { key, phase: ph, prompt, schema: op.schema || null }
    if (independent) brief.independent = true
    if (note) brief.note = note
    next.push(brief)
    if (!halting) {
      halting = true
      // Wait 200 microtask turns before pausing, so every sibling in a
      // parallel() or pipeline() fan-out queues its brief into this pause.
      ;(async () => { for (let i = 0; i < 200; i++) await null; release('__run_halted__') })()
    }
    return new Promise(() => {})
  }
  const phase = (t) => { current = t; if (from && t === from) reached = true; return realPhase(t) }
  const log = (m) => { logs.push(String(m)); return realLog(m) }
  const finish = (value) => {
    if (!opted) return value
    const self_reviewed = Object.keys(by).filter((k) => by[k] === 'self')
    if (value === '__run_halted__') {
      return {
        run: 'inline', status: 'next', next, results: out, reviewers: by, self_reviewed, skipped, logs,
        how: 'Do each brief in next, in order: follow its prompt in this session (it may tell you to edit files, commit or push), and shape your answer to its schema when one is given, with every required field. A brief marked independent reviews work this run produced, so do not answer it yourself: send its prompt to a reviewer with no part in the work (the project\'s code-reviewer role, a fresh session or a fresh subagent), use their answer, and name them in run.reviewers under its key; if you must answer it yourself, it is listed in self_reviewed and must be reported as self-reviewed. A brief with a note was answered before without the fields it names. Add each answer to results under its key, then run this workflow again with the same args, run.results set to the merged results and run.reviewers to the merged reviewers. Repeat until status is "done".',
      }
    }
    return { run: mode, status: 'done', result: value, results: out, reviewers: by, self_reviewed, skipped, logs }
  }
  return { agent, phase, log, finish, halted, error }
})(typeof args === 'undefined' ? undefined : args, agent, phase, log)
if (RUN.error) return RUN.error
const RUN_OUT = await Promise.race([RUN.halted, (async (agent, phase, log) => {
// --- run-modes v2 end (workflow body follows; close it with the tail line) ---

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
      { schema: REVIEW, phase: 'Fix', label: `review:${round}`, independent: true })
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
  'Check the pipeline audit documentation changes against the Diataxis review checklist: one kind per page, how-to titles name a goal, explanation titles read "About ...", reference matches sibling format, links connect the kinds. Do not edit anything. Report problems with page and line.',
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check', independent: true })

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
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
