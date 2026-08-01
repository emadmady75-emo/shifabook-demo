---
task_id: SB-001
status: UAT
owner: hermes-x
approved_by: Emad
risk: high
worktree_mode: required
model_policy: pro-required
next_gate: product-owner-release
---

# SB-001 — Make the ShifaBook baseline reproducibly green and secure

## Business outcome

Create a trustworthy delivery baseline so future ShifaBook features cannot pass Build while TypeScript, lint, tests, or known High dependency vulnerabilities are hidden. This reduces rework and production risk before the first feature experiment.

## Current behavior

Application behavior was verified from commit `6e2ecf0`. Software Delivery OS controls and this Task Packet were preserved in the local-only governance baseline commit `fa92d8b`; no push occurred:

- `npm ci --no-audit --no-fund` passes.
- `npx tsc --noEmit --incremental false` fails with five errors across three files.
- `CI=1 npm run lint` fails because deprecated `next lint` opens an interactive configuration prompt.
- package.json has no test script or test framework.
- `npm audit --omit=dev --json` reports three High vulnerable production packages: `next`, transitive `postcss`, and transitive `sharp`.
- `npm run build` fails without Supabase variables; with synthetic non-secret values it passes because `next.config.js` skips type and lint validation.
- Next.js resolves to 15.5.19. Registry and audit verification on 2026-08-01 show Next.js 15.5.21 and aligned `eslint-config-next` 15.5.21 are available and remediate the listed Next.js advisories.

## Desired behavior

A clean checkout installs and passes non-interactive typecheck, lint, tests, secret scan, dependency audit, and production build with synthetic test configuration. Build no longer suppresses TypeScript or lint failures. Existing booking, role, dashboard, schedule, profile, and authentication behavior remains unchanged except that existing `confirmed_by` and `confirmed_at` appointment metadata is preserved through the current mapping so the already-defined attendance denominator receives its intended inputs.

## Scope in

- Upgrade Next.js and aligned `eslint-config-next` to 15.5.21 and update the lockfile.
- Resolve the audited High findings using explicit `package.json` overrides where required. Pin Next.js and `eslint-config-next` to 15.5.21, override PostCSS to 8.5.25 and Sharp to 0.35.3, regenerate the lockfile, and verify compatibility through typecheck, tests, and production build. A direct root dependency alone is not remediation if `npm ls` still exposes a vulnerable nested copy.
- Add ESLint 9.39.5-compatible non-interactive configuration and replace `next lint` with ESLint CLI.
- Add Vitest 4.1.10, jsdom 30.0.1, `@testing-library/react` 16.3.2, and `cross-env` 10.1.0 with minimal deterministic configuration.
- Add `secretlint` 13.0.4 and `@secretlint/secretlint-rule-preset-recommend` 13.0.4 with committed, narrow exclusions for generated/ignored/dependency paths.
- Add `.nvmrc` or `engines.node` pinned to Node 24.15.0 and use the same version in CI.
- Add `typecheck`, `lint`, `test`, `test:run`, `build:ci`, `audit:prod`, and `secrets:scan` scripts. `build:ci` must use `cross-env` with the approved synthetic values so it works on Windows and CI.
- Fix the five verified TypeScript errors with the smallest behavior-preserving changes.
- Add regression tests for settings-tab component routing and attendance/cancellation metadata logic where those changes touch behavior.
- Preserve existing `confirmed_by` and `confirmed_at` fields through the existing Supabase-to-`PatientBooking` mappings. Do not alter the attendance denominator formula or appointment status semantics.
- Remove `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` from `next.config.js` after gates pass.
- Replace the failing CI placeholder with real install/typecheck/lint/test/build/audit commands using synthetic environment values.
- Update `TEST_PLAN.md` and the Run Report with exact evidence.

## Scope out

- New product features, UI redesign, copy changes, data migrations, Supabase schema changes, production configuration, deployment, or Vercel changes.
- Changes to booking rules, role permissions, revenue formulas, attendance formulas/status semantics, password policy, or unrelated API contracts. Propagation of the existing `confirmed_by`/`confirmed_at` metadata through current mappings is explicitly in scope.
- Full E2E/browser suite, coverage threshold, visual regression platform, or broad component refactor.
- Upgrading React, Supabase, Tailwind, TypeScript, or unrelated packages unless a verified compatibility blocker requires a Finding Packet and approval.
- Fixing the dirty canonical `migration_followup_visits.sql`; it is preserved separately and outside this worktree.

## Acceptance criteria

- [ ] Given a clean worktree on Node 24.15.0, when `npm ci --no-audit --no-fund` runs, then installation exits 0 without modifying tracked files.
- [ ] Given the five baseline TypeScript failures, when `npm run typecheck` runs after implementation, then it exits 0 and no build-ignore flag masks errors.
- [ ] Given CI/non-interactive execution, when `npm run lint` runs, then it exits 0 without prompting and uses committed ESLint configuration.
- [ ] Given the added regression tests, when `npm run test:run` runs, then it exits 0 and covers settings-section routing plus cancellation-confirmation metadata behavior touched by the type fixes.
- [ ] Given synthetic Supabase values, when `npm run build:ci` runs, then Next.js production build exits 0 and does not skip type or lint validation through `next.config.js`.
- [ ] Given the production dependency tree, when `npm run audit:prod` runs, then it exits 0 with zero High and zero Critical vulnerabilities.
- [ ] `npm ls next postcss sharp` shows no PostCSS version `<=8.5.17` and no Sharp version `<0.35.0` anywhere in the production tree; `npm audit --omit=dev --audit-level=high` exits 0.
- [ ] package-lock.json deterministically resolves Next.js and `eslint-config-next` 15.5.21; PostCSS and Sharp resolve outside the audited vulnerable ranges.
- [ ] `npm run secrets:scan` exits 0 against the final tracked tree and excludes only generated, ignored, dependency, and encrypted backup paths through committed configuration; no source or diff path is broadly excluded.
- [ ] The build route table retains `/`, `/book/[doctorHandle]`, `/doctor`, `/doctor/login`, and the existing API routes recorded in the baseline Run Report.
- [ ] Git diff contains no secrets, real patient data, database migration, production URL/key, deployment, or unrelated refactor.
- [ ] CI workflow contains only read permissions, synthetic environment values, and the exact green commands.

## Constraints and prohibited changes

- Work only in `D:\FastTech-Worktrees\shifabook-pilot` on `pilot/software-delivery-os-v1`.
- Do not read or copy `D:\MyProject\Antigravity\.env.local`.
- Use synthetic values: `NEXT_PUBLIC_SUPABASE_URL=https://synthetic-pilot.supabase.co` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-pilot-key-not-a-secret`.
- No production Supabase/Vercel/browser console, real patient data, migration execution, secret creation, or external mutation.
- No direct/default-branch push, force push, merge, deploy, release, or AI credit overage.
- Dependency installation/update is permitted only after Product Owner reapproval of the expanded Scope in. Any package beyond the explicitly listed packages requires a Finding Packet before installation.
- One writer only. Reviewers remain read-only and inspect a stable diff.

## Repository context to inspect

- `package.json`, `package-lock.json`, `next.config.js`, `tsconfig.json`, and existing scripts.
- `src/app/doctor/DoctorDashboardClient.tsx:26,350-351` and child prop unions in `ScheduleBuilder.tsx` and `ProfileSettings.tsx`.
- `src/components/BookingContext.tsx:101-120,321,723-762,1748-1749` for booking metadata and non-null `DoctorProfile` state.
- `src/components/doctor/StatsDashboard.tsx:37-52` for attendance denominator behavior.
- Existing GitHub CI placeholder, `TEST_PLAN.md`, and neighboring import/style conventions.

## Test requirements

1. Record the existing TypeScript failures and absence of a runnable lint/test gate before code changes.
2. Add test configuration and one focused failing regression test before each behavior-affecting implementation change.
3. Keep pure calculations separate where necessary for deterministic tests, without broad refactor.
4. Run in order:
   - `npm ci --no-audit --no-fund`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test:run`
   - `npm run secrets:scan`
   - `npm ls next postcss sharp`
   - `npm run audit:prod`
   - `npm run build:ci`
5. Re-run all commands after final refactor and report real exits; do not rewrite failures as passes.

## Security and privacy

- Data classification: source code and synthetic test data; no patient/customer data.
- Trust-boundary change: dependency and CI configuration plus propagation of already-existing confirmation metadata through the current appointment mapping; application auth/data boundaries and attendance semantics must not change.
- Review current Next.js advisories and lockfile resolution before accepting upgrade.
- Tests must use synthetic objects and must not log phone numbers, credentials, tokens, or environment values.
- Security reviewer is required because dependencies, middleware-compatible framework code, and CI change.

## Permission envelope

- Allowed folders: the task worktree only.
- Allowed writes: package/config/test/source files directly required by Scope in, `TEST_PLAN.md`, `RUNS/SB-001-run.md`, and CI workflow.
- Allowed commands: npm install/update limited to approved packages; npm scripts listed under Test requirements; read-only Git status/diff/log; official npm/Next.js advisory lookups.
- Allowed domains: npm registry, official Next.js/npm/GitHub advisory documentation, and synthetic local build targets.
- Ask: any additional dependency, network domain, task-branch push, or change outside listed files.
- Denied: secrets, production systems/data, `.git/` writes, destructive Git, default-branch push, merge, deploy, release.
- Antigravity prerequisite: if Antigravity is used for implementation, Hermes must first verify and record its effective Project permission profile. Because Antigravity 2.4.3 rendered an inaccessible blank Electron canvas during repeated controlled launches, this run uses Hermes/X. direct execution in the isolated task worktree instead; the Antigravity process was stopped before writes. Hermes is limited to this packet's paths/commands, synthetic data, no production access, and no push/merge/deploy. Antigravity may not be reintroduced mid-run without completing the original UI preflight.

## Required execution evidence

- Before/after package versions and audit counts.
- Exact changed-file and diff summary.
- Red/green test evidence for behavior-affecting fixes.
- Real exit result for every required command.
- Build route table and warnings, with unresolved warnings classified.
- CI workflow diff and local command parity.
- Execution-engine evidence: either a passing Antigravity Project permission preflight, or a recorded Hermes-only execution decision showing Antigravity was stopped and all writes/commands remained inside this packet.
- `RUNS/SB-001-run.md` containing limitations and Finding Packets.
- No PR or push link until Hermes/X. authorizes push after reviews.

## Rollback

Roll back implementation by reverting the bounded implementation commit(s), preserving the committed READY/control-plane baseline and Product Owner approval history. If file-level restoration is required, restore only implementation-touched application files from application baseline `6e2ecf0`. No database or production rollback is required because migrations and deployment are prohibited.

## Stop conditions

- Any upgrade requires React/Supabase/Tailwind/TypeScript changes not listed in Scope in.
- Fixing a type error requires changing approved role, booking, revenue, attendance, or authentication behavior.
- A secret, production environment, Vercel/Supabase console, real patient data, or migration is required.
- `npm audit` cannot reach zero High/Critical without a breaking major upgrade.
- Next.js 15.5.21 is incompatible with the approved PostCSS/Sharp overrides or needs an unapproved framework/package upgrade.
- The same quality gate fails twice without new evidence.
- Repository/branch/baseline differs from this packet.
- A write outside the task worktree or an irreversible action is required.

## Review sequence

- [x] Expanded Scope reapproved by Product Owner
- [x] Specification review passed
- [x] Automated quality gates passed
- [x] Code-quality review passed
- [x] Security review passed
- [x] Browser/visual QA completed through an isolated synthetic harness against the committed code
- [x] Local technical UAT passed under the Product Owner's explicit delegated completion instruction
- [ ] Release approved

## Decision log

| Date | Decision | Owner | Reason |
|---|---|---|---|
| 2026-08-01 | Baseline hardening selected as first pilot task | Emad | User chose Software Delivery OS V1 and Task Packet 001 after Phase 0 |
| 2026-08-01 | Status set to READY | Hermes/X. | Repository inspected, commands and acceptance criteria made concrete, permissions bounded |
| 2026-08-01 | Pro-required model policy | Hermes/X. | Dependency advisories, CI, auth-adjacent middleware, and cross-cutting baseline risk |
| 2026-08-01 | Status returned to SCOPE_APPROVED | Hermes/X. | Independent specification review found baseline, dependency, permission, and reproducibility blockers; Antigravity execution remains prohibited pending remediation and Product Owner reapproval |
| 2026-08-01 | Local baseline commit deferred | Emad/Hermes | User clarified that unfinished Antigravity projects are preservation candidates, not automatically uploadable or ready for repository normalization; no commit/push/delete until project disposition is chosen |
| 2026-08-01 | Expanded SB-001 scope and local-only pilot baseline approved | Emad | User selected the isolated ShifaBook Pilot, approved the listed quality/security tools and limited confirmation-metadata propagation, and explicitly allowed a local Git restore point without push |
| 2026-08-01 | Final specification readiness review passed | Independent reviewer | PASS with no blocking findings; Antigravity permission preflight may remain pending after READY but is mandatory before IN_PROGRESS |
| 2026-08-01 | Use Hermes/X. as bounded executor for SB-001 | Hermes/X. | Antigravity 2.4.3 started twice but rendered an inaccessible blank Electron canvas; user directed the department manager to choose the best non-blocking path and complete development. Antigravity was stopped, and direct execution remains isolated, synthetic, local-only, and subject to the same gates. |
| 2026-08-01 | Automated quality/security gates passed | Hermes/X. | Clean install, typecheck, scoped non-interactive lint, 6 regression tests, Secretlint, zero production audit findings, dependency-tree proof, Windows-compatible build, route inventory, and limited synthetic browser smoke passed. |
| 2026-08-01 | Final independent code and security reviews passed | Independent reviewers | Stable implementation commit `546504b` received PASS with no blocking quality or security findings. |
| 2026-08-01 | Local synthetic Browser QA/UAT passed | Independent reviewer | Isolated temporary harness exercised the committed dashboard and helpers with synthetic fixtures; all required interactions passed, no JavaScript errors occurred, and the harness/worktree were removed afterward. |
| 2026-08-01 | Task branch push approved and completed | Emad / Hermes/X. | Product Owner explicitly requested push; `pilot/software-delivery-os-v1` was pushed without modifying `main`. Remote SHA matched and Vercel reported a successful automatic branch deployment. |
| 2026-08-01 | Pull Request opened and CI passed | Emad / Hermes/X. | Product Owner approved the recommended PR path. PR `#1` targets `main`; GitHub Actions run `30717625963`, `project-gates`, Vercel, and Vercel Preview Comments all passed. Merge remains a separate approval gate. |
