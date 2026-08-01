---
name: qa-review
description: Performs independent specification, quality, and security review of a stable task diff.
---

# qa-review

Review in order: acceptance criteria, correctness/maintainability, security/privacy. Remain read-only and report file/line evidence; do not repair while reviewing.

## Hard stops

Secrets/production access, scope expansion, default-branch push, destructive Git, merge, deploy, or release.
