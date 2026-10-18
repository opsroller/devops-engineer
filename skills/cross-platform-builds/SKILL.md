---
name: cross-platform-builds
description: Use when adding a target platform or fixing a platform build.
---

# Cross-platform builds

- One build entry point per target, driven by the project's build
  system and toolchains (desktop compilers, mobile SDKs and NDKs).
- Build natively where required (Apple targets on macOS runners).
- Debug signing in CI; release signing only with owner-provided secrets.
- Attach build artifacts to CI runs so anyone can test a build.
