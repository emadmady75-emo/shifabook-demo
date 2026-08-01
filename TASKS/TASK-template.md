---
task_id: SB-000
status: DRAFT
owner: unassigned
approved_by: pending
risk: medium
worktree_mode: required
model_policy: flash-first
next_gate: scope-approval
---

# SB-000 — Outcome-oriented title

## Business outcome
TBD

## Current behavior
TBD with evidence.

## Desired behavior
TBD

## Scope in
- TBD

## Scope out
- TBD

## Acceptance criteria
- [ ] Given … when … then …
- [ ] Existing critical behavior does not regress.

## Constraints and prohibited changes
- No production/secrets/real customer data.
- No default-branch push, merge, deploy, or release.

## Repository context to inspect
- Manifest, existing implementation, tests, and neighboring patterns.

## Test requirements
1. Failing test or reproducible check first where practical.
2. Exact focused and full commands before READY.

## Security and privacy
- Data classification: TBD
- Trust-boundary change: TBD
- Synthetic data: required

## Permission envelope
- Allowed folders: task worktree only
- Allowed commands: TBD
- Allowed domains: official docs/package registries only when approved
- Denied: secrets, production, `.git/` writes, destructive Git

## Required execution evidence
- Diff summary; commands and real exits; CI/PR links; limitations; artifacts.

## Rollback
TBD

## Stop conditions
- Scope expansion, secret/production need, irreversible migration, repo mismatch, or same failure twice.

## Review sequence
- [ ] Scope approved
- [ ] Specification review
- [ ] Automated gates
- [ ] Code-quality review
- [ ] Security review or N/A reason
- [ ] Browser/visual QA or N/A reason
- [ ] UAT
- [ ] Release approval

## Decision log
| Date | Decision | Owner | Reason |
|---|---|---|---|
