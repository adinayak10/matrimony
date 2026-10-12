# docs/

Design plans, the pre-migration audit and the documentation inherited from
the three original app folders.

## plans/ — what is being built and in which order

| File | Content |
|---|---|
| `plans/00-master-plan.md` | Executable summary: decisions, prioritised findings, target monorepo layout, Phases 0-7, verification, owner actions, risks. Start here. |
| `plans/monorepo-deploy-infra.md` | Track B: repo skeleton, minimal deploy edits, `deploy/` tooling, server migration runbook (M0-M4), nginx, GitHub side, Flutter layout, observability. |
| `plans/api-security-logic.md` | Track A: API authentication/identity, kill switches, hardening, business-logic and filter fixes, socket auth, data migrations, tests. |
| `plans/admin-base-ui.md` | Track C: admin panel base layout, server-side auth gate, `/api/*` proxy, page-by-page migration, API fixes per page. |
| `plans/website-seo-perf.md` | Track D: website UI fixes, honest content, SEO structure, resilience, performance build, sitemaps. |
| `plans/integrator.md` | Conflict resolutions between the four tracks (these override the track docs), phase sequence, missing pieces, owner actions, master verification list. |

## audit/ — read-only findings the plans are based on

| File | Scope |
|---|---|
| `audit/api-auth-security.md` | API auth, JWT, IDOR, upload and settings endpoints |
| `audit/api-business-logic-matching.md` | Matching, filters, blocks, interests, membership |
| `audit/api-chat-social-notify.md` | socket.io chat, icebreaker game, notifications, email |
| `audit/admin-panel.md` | Admin panel pages, auth, API usage |
| `audit/web-routes-seo.md` | Website routes, redirects, canonical/meta, sitemaps |
| `audit/web-perf-ui.md` | Website performance and UI |
| `audit/web-user-area.md` | Logged-in website pages |
| `audit/flutter-app.md` | Flutter app code and API usage |
| `audit/infra-deploy.md` | Servers, pm2, nginx, backups, secrets |
| `audit/live-crawl-audit.md` | Crawl of the live site (status, canonicals, titles) |
| `audit/gap-*.md` | Follow-up passes on areas the first pass did not cover (uncovered controllers/scripts, Flutter<->API contract, infra runtime evidence, regional/blog verification, unread web pages/assets) |
| `audit/crit-high.txt` | Critical/high findings in one list |

## legacy-*.md — inherited documentation

Copied from the old `banjaramatch.com`, `api.banjaramatch.com` and
`admin.banjaramatch.com` folders. They describe how features were built at
the time and may be out of date; the plans above take precedence. Files that
contained credentials were deleted, not moved.

| File | Origin |
|---|---|
| `legacy-README.md` | Admin panel README |
| `legacy-ADMIN_PANEL_INTEGRATION_GUIDE.md`, `legacy-ADMIN_PANEL_REFACTORING_COMPLETE.md`, `legacy-DASHBOARD_IMPLEMENTATION.md`, `legacy-PROFILE_DETAILS_IMPLEMENTATION.md` | Admin panel feature notes |
| `legacy-APK_MANAGER_GUIDE.md` | Admin APK manager (forced-update flow) |
| `legacy-BETA_TESTER_IMPLEMENTATION.md` | Beta tester programme |
| `legacy-REGIONAL_PAGES_REFACTORING_PLAN.md`, `legacy-REGIONAL_PAGES_SPLIT_COMPLETE.md` | Regional (state/city) page schema split |
| `legacy-DELETE_USERS_README.md`, `legacy-LOCATION_SEEDING_README.md` | API maintenance scripts (now under `apps/api/tools/`) |

Flutter-specific notes live next to the app: `apps/mobile/README.md`,
`apps/mobile/UPDATE_FEATURE_README.md`, `apps/mobile/PERFORMANCE_OPTIMIZATIONS.md`.
