// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'add-build-target',
  description: 'Add a new platform build target end to end: design, pinned reproducible CI build, signing and store sheet, SBOM and license coverage, independent verification, and docs. args: { target: "<platform/arch, e.g. linux-x86_64>" (required), store?: "<store name>" }',
  phases: [
    { title: 'Plan', detail: 'runner, toolchain pins, artifact name, signing, docs to touch' },
    { title: 'Build', detail: 'one agent implements the build script and CI job' },
    { title: 'Verify', detail: 'parallel read-only checks: reproducibility, signing/store, compliance; fix loop' },
    { title: 'Docs', detail: 'reference row, how-to, explanation of choices' },
    { title: 'Docs check', detail: 'one Diataxis kind per page' },
  ],
}

const USAGE = 'usage: add-build-target { target: "<platform-arch>", store?: "<store>" }'
const target = args && typeof args.target === 'string' ? args.target.trim() : ''
if (!target) return `missing target. ${USAGE}`
const store = args && typeof args.store === 'string' ? args.store.trim() : ''

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' },
  runner: { type: 'string' },
  toolchain_pins: { type: 'array', items: { type: 'string' } },
  build_options: { type: 'array', items: { type: 'string' } },
  artifact_name: { type: 'string' },
  signing: { type: 'string' },
  owner_actions: { type: 'array', items: { type: 'string' } },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['branch', 'runner', 'toolchain_pins', 'build_options', 'artifact_name', 'docs'] }

const CHECK = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  owner_actions: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
}, required: ['blocking', 'evidence'] }

const DOCCHECK = { type: 'object', properties: {
  problems: { type: 'array', items: { type: 'string' } },
}, required: ['problems'] }

phase('Plan')
const plan = await agent(
  `Plan a new build target "${target}"${store ? ` distributed through ${store}` : ''}; planning only, write nothing. Read the project's CLAUDE.md and profile. Follow the devops-engineer cross-platform-builds skill (method: adding a build target)${store ? ' and store-distribution skill' : ''}.
Return: a branch name (e.g. build/add-${target}), runner choice and why, exact toolchain/SDK pins with checksum sources, the explicit build options the job will pass, the artifact name pattern, the signing approach, steps only the owner can take, and (Diataxis compass) the doc pages to touch: at least a reference row in the build targets table and a how-to "How to build ${target} locally"; an explanation if a runner or toolchain choice was made between alternatives.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was built'

phase('Build')
const built = await agent(
  `On branch ${plan.branch}, as the only agent editing files, implement the ${target} build:
- runner: ${plan.runner}
- toolchain pins (verify each download's checksum or signature): ${plan.toolchain_pins.join('; ')}
- explicit build options for this job: ${plan.build_options.join('; ')}
- artifact: ${plan.artifact_name} plus SHA-256 checksum; smoke test on the target
Use one build script the developer can also run; the CI job calls it. Make sure any new option you add does not change the behaviour of existing jobs (set it explicitly in each). Every new file carries the project's license header, never a template default. Run the full matrix, commit (build:/ci: Conventional Commits), push, open a draft PR. Return the PR URL and CI run links.`,
  { phase: 'Build', label: 'build' })
if (!built) return { decision: 'blocked', reason: 'build agent returned nothing', plan }

phase('Verify')
const checks = [
  ['reproducibility', `Build ${target} twice from the PR head in clean environments (or compare two CI runs) and compare digests; walk the nondeterminism checklist; confirm a cold (no-cache) build passes and cache keys include OS, arch, toolchain version, lockfile hash and build config (cross-platform-builds skill).`],
  ['matrix', `Confirm every pre-existing CI job still passes with unchanged behaviour, every job passes its build options explicitly, and all downloads are pinned and checksum-verified (ci-pipelines skill).`],
  ['compliance', `Confirm the ${target} artifact is covered by the SBOM, bundles the notices file from the single credits source, new files carry the project license, and any new toolchain-bundled runtime libraries have recorded, compatible licenses (license-compliance, supply-chain-security skills).`],
  ...(store ? [['store', `Draft or update the store sheet for ${store} for this target and confirm signing is set up in CI and verified after signing; list every owner-only step with exact instructions; never act in the owner's name (store-distribution skill). Return the sheet text in evidence; do not edit files.`]] : []),
]
let open = []
let owner_actions = plan.owner_actions || []
let evidence = []
for (let round = 1; round <= 3; round++) {
  const res = await pipeline(checks, ([name, task]) =>
    agent(`${task}\nBranch ${plan.branch}. Read-only: do not edit, commit or push; return findings.`, { schema: CHECK, phase: 'Verify', label: `${name}:${round}` })
      .then(r => r ? { name, ...r } : { name, blocking: [`${name}: checker returned nothing; unverified`], evidence: [] }))
  open = res.flatMap(r => r.blocking.map(b => `${r.name}: ${b}`))
  owner_actions = [...new Set([...owner_actions, ...res.flatMap(r => r.owner_actions || [])])]
  evidence = res.map(r => ({ check: r.name, evidence: r.evidence }))
  if (!open.length || round === 3) break
  const f = await agent(`On ${plan.branch}, as the only editor, fix these verification findings, rerun CI, commit and push:\n- ${open.join('\n- ')}`, { phase: 'Verify', label: `fix:${round}` })
  if (!f) break
}
if (open.length) return { decision: 'blocked', open, owner_actions, evidence, plan }

phase('Docs')
const docs = await agent(
  `On ${plan.branch}, as the only agent editing docs, document the new ${target} target.
Pages planned: ${JSON.stringify(plan.docs)}
Facts: runner ${plan.runner}; pins ${plan.toolchain_pins.join('; ')}; options ${plan.build_options.join('; ')}; artifact ${plan.artifact_name}; signing ${plan.signing || 'n/a'}; evidence ${JSON.stringify(evidence)}.
${store ? `Add the ${store} store sheet as reference from the store check evidence.` : ''}
${DOCS_FRAGMENT}
Commit (docs: ...), push. Return pages touched.`,
  { phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  `Check the docs changes on ${plan.branch} against the Diataxis review checklist: one kind per page, "How to ..." and "About ..." titles, reference rows match the existing table format, links connect the kinds; if a tutorial changed, run it from a clean start. Report problems with page and line.`,
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check' })
const docProblems = !docs ? ['documentation agent returned nothing'] : !dc ? ['documentation check did not run; docs unverified'] : dc.problems

return {
  decision: docProblems.length ? 'blocked' : 'ready-for-review',
  target,
  branch: plan.branch,
  doc_problems: docProblems,
  owner_actions,
  evidence,
}
