---
name: fix-bug
description: Reproduces and fixes a bounded bug using test-first root-cause evidence.
---

# fix-bug

Reproduce first, write a failing regression test, make the minimum fix, run focused then full gates, and document root cause. Do not mask failures.

## Hard stops

Secrets/production access, scope expansion, default-branch push, destructive Git, merge, deploy, or release.
