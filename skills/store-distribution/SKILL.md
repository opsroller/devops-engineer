---
name: store-distribution
description: Use when preparing, signing or submitting builds to app stores, desktop storefronts or package registries, setting up code signing or notarization, planning a staged rollout, or listing what only the owner can do for a store.
---

# Store distribution and signing

Getting a signed, compliant build in front of users through a store or
registry, without ever acting in the owner's name. Store rules change
often: always read the store's current guidelines before a submission; this
skill gives the method, not the rules of any one store.

## Owner-only actions (never do these)

Account creation, legal agreements, tax and payment details, fees, identity
verification, generating or holding production signing keys and
certificates, and pressing "submit for review" or "release" unless the owner
has explicitly delegated it through a pipeline the owner configured. For
each, write numbered, exact instructions for the owner (where to click, what
to name things, which secret name to store the result under in CI), then
stop and report.

## Method: preparing a store

1. Read the project profile: which stores, which targets, who owns each
   account.
2. Create (in the project docs) a **store sheet** per store, from
   [store-checklist.md](store-checklist.md): identifiers, signing,
   build requirements, metadata, rating and privacy declarations, review
   risks, rollout options.
3. Read the store's current submission guidelines and policy pages; record
   the date read and any rule that affects the build (minimum OS/API level,
   architectures, package format, permissions, payments, content rules).
4. Set up signing in CI (below). Signing happens in the release stage on
   promoted artifacts.
5. Automate metadata where the store offers an API or a metadata-as-files
   tool (e.g. fastlane-style tools); keep descriptions, release notes and
   screenshot lists in the repository so they are reviewed like code.
6. Ask the graphic-designer for icons, screenshots and store art at the
   exact sizes and counts the store sheet lists. Generate screenshots from
   the product where possible.
7. Do a dry run: upload to the store's internal or test track, install from
   it on a real device or clean machine, run the smoke test.

## Signing

- Production keys live only in the CI secret store or a managed key/HSM
  service; never in the repository, never on a laptop beyond the owner's
  own backup. Prefer store-managed app signing where the store offers it,
  so a lost upload key is recoverable.
- Separate **upload/developer** keys (CI uses) from **release/distribution**
  keys (store or owner holds) when the platform allows.
- Platform steps to expect (examples): code-sign desktop binaries and
  installers; submit macOS-style builds for notarization and staple the
  ticket; sign mobile packages with the upload key; timestamp signatures so
  they outlive the certificate.
- Verify every signature in CI after signing (the platform's verify tool)
  and fail on error. Record certificate expiry dates and alert 30 days
  ahead (`pipeline-observability`).

## Rollout

- Internal/test track -> limited beta -> staged production rollout (e.g.
  1% -> 10% -> 50% -> 100%) where the store supports it.
- Gate each step on release health: crash-free rate, error reports, review
  sentiment, compared with the previous version.
- Know before release whether the store allows halting a rollout, and that
  most stores do not allow downgrades: plan to roll forward
  (`release-management`).

## Common rejection causes to pre-check

Crashes or broken features on review devices; placeholder content;
metadata that does not match the build; missing or inaccurate privacy and
data-collection declarations; missing account-deletion or login-for-review
details where required; unjustified permissions; external payment links
where forbidden; outdated target OS/API level; missing age/content rating;
trademark or third-party content without rights.

## Quality bar

- Every store has a current store sheet in the project docs, with the date
  its guidelines were last read.
- Release builds are signed and verified in CI; no key material in the repo
  or logs.
- Owner-only steps are a short numbered list the owner can do in one sitting.

## Failure modes

- Signing on a developer machine; the only copy of a key on one laptop.
- Expired certificate discovered on release day.
- Submitting a build the pipeline did not produce.
- Rollout to 100% immediately with no health gate.
- Acting on the owner's account "to save time".

## Documentation this work owes (Diataxis)

- Store sheet per store -> **reference**.
- Owner's account and signing setup steps -> **how-to** ("How to set up
  signing for <store>").
- Submission procedure -> **how-to** ("How to submit a release to
  <store>").
- Signing architecture decision -> **explanation**.
