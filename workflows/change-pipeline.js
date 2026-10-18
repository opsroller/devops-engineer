// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'change-pipeline',
  description: 'Add or change one CI/CD stage or check end to end: purpose and failure meaning, scope, pinned tools, least-privilege permissions, artifact retention and visibility, a run on a branch compared with baseline timings, independent verification, the pipeline reference doc, and the required-check decision. args: { change: "<the stage or check to add or change, and why>" (required), required?: "yes"|"no"|"decide" (default "decide") }',
  phases: [
    { title: 'Plan', detail: 'purpose, failure meaning, scope, pins, permissions, artifacts, baseline, owned paths, docs' },
    { title: 'Build', detail: 'one agent edits the pipeline on a branch, runs it and opens a draft PR' },
    { title: 'Verify', detail: 'parallel read-only checks: behaviour, security, timing, ownership; fix loop' },
    { title: 'Required check', detail: 'decide whether the check gates merges, with evidence' },
    { title: 'Docs', detail: 'pipeline reference, local-reproduction how-to, explanation of choices' },
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

const USAGE = 'usage: change-pipeline { change: "<stage or check to add or change, and why>", required?: "yes"|"no"|"decide" }'
const change = args && typeof args.change === 'string' ? args.change.trim() : ''
if (!change) return `missing change. ${USAGE}`
const required = args && args.required !== undefined ? String(args.required) : 'decide'
if (!['yes', 'no', 'decide'].includes(required)) return `required must be "yes", "no" or "decide", got "${required}". ${USAGE}`

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' },
  purpose: { type: 'string' },
  failure_meaning: { type: 'string' },
  local_command: { type: 'string' },
  scope: { type: 'object', properties: {
    pipeline_files: { type: 'array', items: { type: 'string' } },
    triggers: { type: 'array', items: { type: 'string' } },
    paths: { type: 'array', items: { type: 'string' } },
    jobs_affected: { type: 'array', items: { type: 'string' } },
  }, required: ['pipeline_files', 'triggers', 'jobs_affected'] },
  pins: { type: 'array', items: { type: 'string' } },
  permissions: { type: 'string' },
  secrets: { type: 'array', items: { type: 'string' } },
  artifacts: { type: 'array', items: { type: 'object', properties: {
    name: { type: 'string' }, retention: { type: 'string' }, visibility: { type: 'string' }, contains: { type: 'string' } },
    required: ['name', 'retention', 'visibility', 'contains'] } },
  repo_public: { type: 'boolean' },
  baseline: { type: 'string' },
  budget: { type: 'string' },
  cross_role: { type: 'array', items: { type: 'object', properties: {
    path: { type: 'string' }, owner: { type: 'string' }, edit: { type: 'string' }, why_here: { type: 'string' } },
    required: ['path', 'owner', 'edit', 'why_here'] } },
  rollback: { type: 'string' },
  owner_actions: { type: 'array', items: { type: 'string' } },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['branch', 'purpose', 'failure_meaning', 'local_command', 'scope', 'pins', 'permissions', 'artifacts', 'repo_public', 'baseline', 'budget', 'cross_role', 'rollback', 'docs'] }

const BUILD = { type: 'object', properties: {
  pr: { type: 'string' },
  runs: { type: 'array', items: { type: 'string' } },
  timings: { type: 'string' },
  result: { type: 'string', enum: ['green', 'red'] },
}, required: ['pr', 'runs', 'timings', 'result'] }

const CHECK = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  owner_actions: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
}, required: ['blocking', 'evidence'] }

const GATE = { type: 'object', properties: {
  decision: { type: 'string', enum: ['required-now', 'required-after-green-runs', 'not-required'] },
  green_runs_needed: { type: 'integer' },
  reason: { type: 'string' },
  owner_actions: { type: 'array', items: { type: 'string' } },
}, required: ['decision', 'reason'] }

const DOCCHECK = { type: 'object', properties: {
  problems: { type: 'array', items: { type: 'string' } },
}, required: ['problems'] }

phase('Plan')
const plan = await agent(
  `Plan this pipeline change; planning only, write nothing: "${change}".
Read the project's CLAUDE.md, profile (CI provider, required checks, runner types, which role owns which paths) and the existing pipeline definitions. Follow the devops-engineer ci-pipelines skill (method: adding or changing a stage) and supply-chain-security skill.
Return:
- branch: a name such as ci/<slug>.
- purpose, and failure_meaning in the form "red means X; to fix, do Y".
- local_command: the one command a contributor runs to reproduce the check locally.
- scope: pipeline files to edit, triggers (which events and branches; fork PRs run without secrets), path filters if any, and every existing job whose behaviour could change.
- pins: every runner image, toolchain and third-party step the stage uses, each with its exact immutable reference (commit SHA or digest) and checksum source.
- permissions: the token scopes per job, read-only by default, write only where a job needs it and why; secrets: each secret and the one job that gets it.
- artifacts: each one's name, retention period (shortest that serves its use), visibility and contents. repo_public: whether the repository is public; if so, assume anything uploaded, logged or cached can be read by anyone with read access and keep secrets, signing material and unreleased builds the project has not cleared out of it.
- baseline: duration and result of the affected pipelines from recent default-branch runs (pipeline-observability skill); budget: the time this stage may add (PR feedback target <= 10 minutes unless the profile says otherwise).
- cross_role: every path the change must touch that the profile assigns to another role, with its owner, the minimal edit and why it cannot live in a path you own (engineering-practices peer-coordination skill, cross-role edits). Empty if none.
- rollback: how to undo the change.
- owner_actions: steps only the owner can take (repository settings, new secrets).
- docs (Diataxis compass): at least the pipeline reference (stages, triggers, required checks, artifacts, retention); a how-to if contributors must do something new; an explanation if a choice was made between alternatives.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was changed'

const FACTS = `Change: ${change}
Branch: ${plan.branch}
Purpose: ${plan.purpose}
Failure meaning: ${plan.failure_meaning}
Local command: ${plan.local_command}
Scope: ${JSON.stringify(plan.scope)}
Pins: ${plan.pins.join('; ')}
Permissions: ${plan.permissions}
Secrets: ${(plan.secrets || []).join('; ') || 'none'}
Artifacts: ${JSON.stringify(plan.artifacts)}
Repository public: ${plan.repo_public}
Baseline: ${plan.baseline}
Time budget: ${plan.budget}
Cross-role edits: ${plan.cross_role.length ? JSON.stringify(plan.cross_role) : 'none'}
Rollback: ${plan.rollback}`

phase('Build')
const built = await agent(
  `As the only agent editing files, implement this pipeline change on branch ${plan.branch}:
${FACTS}
Rules: one stage or check per change; set least-privilege permissions at the top of each pipeline file and grant write scopes only to the job that needs them; reference every third-party step by its pinned immutable reference and verify every download's checksum; pass untrusted input (PR titles, branch names) through environment variables, never into shell text; set each artifact's retention explicitly and upload nothing the plan did not list; every job passes its build options explicitly; keep the old path until the new one has run green. Give the stage a name that says what it checks, and make its failure message state the failure meaning and the local command. Every new file carries the project's license header.
${plan.cross_role.length ? 'For each cross-role edit: make only the planned minimal edit, in its own commit, and list it under a "Cross-role edits" heading in the PR description (path, owner, what changed, why it could not live elsewhere). Then message each owner directly with that list and the PR link (engineering-practices peer-coordination skill).' : ''}
Commit (ci: or build: Conventional Commits), push, open a draft PR, and run the pipeline on the branch. Return the PR URL, the run links, the stage's duration and the affected pipelines' total durations from these runs, and whether the run is green.`,
  { schema: BUILD, phase: 'Build', label: 'build' })
if (!built) return { decision: 'blocked', reason: 'build agent returned nothing', plan }

phase('Verify')
const checks = [
  ['behaviour', `Confirm the stage does what its purpose says and fails for the right reason: show that a known-bad input turns it red with a message that states the failure meaning, and that the current head is green. For the red case a local run is enough and preferred: run the stage's own step script or "${plan.local_command}" on a known-bad input in a scratch copy, and quote its exit code and message. Never push a deliberately broken commit to CI to get a red run. The green case is the branch's CI run. Confirm every pre-existing job listed in scope still passes with unchanged behaviour and the triggers and path filters match the plan (ci-pipelines skill).`],
  ['security', `Confirm least-privilege permissions (read-only default, write only where justified), every third-party step and download pinned and verified, no untrusted input interpolated into shell, no secrets reachable from fork or untrusted triggers, and each artifact's retention and contents match the plan. The repository is ${plan.repo_public ? 'public: confirm no secret, credential, signing material or uncleared build is uploaded, logged or cached' : 'private: confirm visibility still matches the plan'} (ci-pipelines, supply-chain-security skills).`],
  ['timing', `Compare the branch runs with the baseline (${plan.baseline}) and the budget (${plan.budget}): report the stage's duration and the change in total pipeline time, and whether caching is keyed correctly if added (cross-platform-builds skill). Over budget is blocking unless the plan gives a reason and the stage runs outside the PR path.`],
  ['ownership', plan.cross_role.length
    ? `Confirm each cross-role edit is the minimal planned one (${JSON.stringify(plan.cross_role)}), sits in its own commit, is listed under "Cross-role edits" in the PR description, and that each owner was messaged with the PR link; and that no other path outside the role's owned paths changed.`
    : 'Confirm the diff touches only paths the profile assigns to the DevOps role (or shared append-only files); any other path is blocking unless it is listed under "Cross-role edits" in the PR description with its owner notified.'],
]
let open = []
let owner_actions = plan.owner_actions || []
let evidence = []
for (let round = 1; round <= 3; round++) {
  const res = await pipeline(checks, ([name, task]) =>
    agent(`${task}\nPR ${built.pr}, branch ${plan.branch}. Read-only: do not edit, commit or push; return findings with evidence (run links, file:line).`, { schema: CHECK, phase: 'Verify', label: `${name}:${round}`, independent: true })
      .then(r => r ? { name, ...r } : { name, blocking: [`${name}: checker returned nothing; unverified`], evidence: [] }))
  open = res.flatMap(r => r.blocking.map(b => `${r.name}: ${b}`))
  owner_actions = [...new Set([...owner_actions, ...res.flatMap(r => r.owner_actions || [])])]
  evidence = res.map(r => ({ check: r.name, evidence: r.evidence }))
  if (!open.length || round === 3) break
  const f = await agent(`On ${plan.branch}, as the only editor, fix these verification findings, rerun the pipeline, commit and push. Never disable or weaken a check to get green:\n- ${open.join('\n- ')}`, { phase: 'Verify', label: `fix:${round}` })
  if (!f) break
}
if (open.length) return { decision: 'blocked', open, owner_actions, evidence, pr: built.pr, plan }

phase('Required check')
const gate = await agent(
  `Decide whether the new or changed check "${plan.purpose}" should be a required status check that blocks merges. The caller asked: ${required === 'decide' ? 'decide on the evidence' : required === 'yes' ? 'make it required' : 'keep it non-blocking'}.
Rules (ci-pipelines skill): every check that matters is required, or it will be ignored; make it required only once it has been green on several consecutive runs and is not flaky; a check that runs only on some paths or events must not be required where it will never report, or it will block unrelated PRs; a slow check outside the PR path stays non-blocking.
Evidence: ${JSON.stringify(evidence)}; runs ${built.runs.join(', ')}.
If making it required needs a repository setting you cannot change, put the exact setting in owner_actions. Write nothing. Return the decision, the green runs still needed (0 if none), and the reason.`,
  { schema: GATE, phase: 'Required check', label: 'gate' })
if (gate) owner_actions = [...new Set([...owner_actions, ...(gate.owner_actions || [])])]

phase('Docs')
const docs = await agent(
  `On ${plan.branch}, as the only agent editing docs, document this pipeline change.
Pages planned: ${JSON.stringify(plan.docs)}
${FACTS}
Required check: ${gate ? `${gate.decision}${gate.green_runs_needed ? ` after ${gate.green_runs_needed} more green runs` : ''}: ${gate.reason}` : 'undecided (decision step returned nothing)'}
The pipeline reference must list the stage's name, purpose, triggers, failure meaning, local command, permissions, artifacts with retention and visibility, and whether it is required.
${DOCS_FRAGMENT}
Commit (docs: ...), push. Return pages touched.`,
  { phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  `Check the docs changes on ${plan.branch} against the Diataxis review checklist: one kind per page, how-to titles name a goal, explanation titles read "About ...", reference rows match the existing table format, links connect the kinds, and the pipeline reference matches the pipeline files on the branch. Do not edit anything. Report problems with page and line.`,
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check', independent: true })
const docProblems = !docs ? ['documentation agent returned nothing'] : !dc ? ['documentation check did not run; docs unverified'] : dc.problems

return {
  decision: docProblems.length || !gate ? 'blocked' : 'ready-for-review',
  branch: plan.branch,
  pr: built.pr,
  failure_meaning: plan.failure_meaning,
  baseline: plan.baseline,
  timings: built.timings,
  required_check: gate || 'undecided: decision step returned nothing',
  cross_role: plan.cross_role,
  doc_problems: docProblems,
  owner_actions,
  evidence,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
