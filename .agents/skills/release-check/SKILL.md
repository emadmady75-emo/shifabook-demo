---
name: release-check
description: Checks release evidence, rollback, migrations, and approvals without deploying.
---

# release-check

Verify CI, reviews, UAT, changelog, environment separation, migrations, and rollback. Never merge or deploy; return blockers to Hermes/X.

## Hard stops

Secrets/production access, scope expansion, default-branch push, destructive Git, merge, deploy, or release.
