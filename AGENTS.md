# Project Agent Entry Point

Canonical context: `PRODUCT_BRIEF.md`, `PRD.md`, `ARCHITECTURE.md`, `PROJECT_STATE.md`, and the current READY file in `TASKS/`.

Rules:

- Work only on a READY Task Packet in an isolated worktree.
- Inspect actual manifests/code before assuming commands or paths.
- Follow `.agents/rules/00-project-governance.md` and loaded skills.
- Never read secrets or production data; use synthetic fixtures.
- Do not push unless Hermes/X. explicitly instructs a task-branch push after local gates.
- Never push default branches, merge, deploy, release, or widen scope.
- Record factual evidence in `RUNS/<TASK-ID>-run.md`.

Project commands must be populated in `TEST_PLAN.md`; unknown commands block execution.
