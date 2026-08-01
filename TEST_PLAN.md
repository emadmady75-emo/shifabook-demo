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

Task `SB-001` is `READY`, but execution remains prohibited until the Antigravity Project permission/Always On/overages preflight is verified and recorded. Until SB-001 is green, feature tasks remain blocked.
