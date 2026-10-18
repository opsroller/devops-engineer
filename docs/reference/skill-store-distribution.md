# store-distribution skill

*Reference, for anyone looking up what the store-distribution skill covers.*

| Field | Value |
|---|---|
| Files | `skills/store-distribution/SKILL.md`, `skills/store-distribution/store-checklist.md` |
| Used when | preparing, signing or submitting to stores or registries; signing setup; staged rollout |
| Produces | store sheets, CI signing steps, metadata files, owner instructions |

## Owner-only actions

Account creation, agreements, tax and payment, fees, identity verification, production keys and certificates, submit/release (unless delegated through an owner-configured pipeline).

## Store sheet sections

Identity; build requirements; signing; metadata; declarations; release; owner-only steps. Template: `store-checklist.md`.

## Signing rules

- Keys only in the CI secret store or a managed key service.
- Prefer store-managed app signing; separate upload and release keys.
- Verify signatures in CI after signing; timestamp signatures.
- Alert 30 days before certificate expiry.

## Rollout

Internal/test track, beta, staged production (e.g. 1% -> 10% -> 50% -> 100%), gated on release health versus the previous version.

## Docs owed

Reference: a store sheet per store; how-to for signing setup and submission; explanation for signing architecture.
