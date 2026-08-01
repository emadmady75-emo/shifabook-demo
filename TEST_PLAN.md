# Test Plan

## Commands

- Install: `npm ci --no-audit --no-fund`
- Format: no formatter gate in SB-001; adding one is outside the approved baseline scope
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Focused tests: `npm run test -- <test-file-or-pattern>` after Vitest is installed by SB-001
- Full tests: `npm run test:run`
- Build: `npm run build:ci` using `cross-env` and only the committed synthetic test values
- Dependency scan: `npm run audit:prod`
- Dependency tree proof: `npm ls next postcss sharp`
- Secret scan: `npm run secrets:scan` using committed Secretlint configuration; no external source upload

Task `SB-001` is `IN_PROGRESS` under the recorded Hermes/X. bounded-execution decision. Antigravity is stopped and is not used in this run. Feature tasks remain blocked until every command above, independent quality/security reviews, and the delivery record are green.
