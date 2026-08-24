# Documentation index

Everything that isn't the top-level [README](../README.md) lives here. These
were written during development as one-off notes rather than maintained
docs, so treat them as historical context, not a source of truth about the
current codebase — when in doubt, trust the code and `git log` over these.

## Setup & reference

- [SETUP.md](SETUP.md) — local development setup
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — common code patterns/snippets

## Architecture

- [ROLE_PERMISSIONS_SYSTEM.md](ROLE_PERMISSIONS_SYSTEM.md) — role hierarchy (platform admin / owner / admin / security / member)
- [IMPROVEMENTS.md](IMPROVEMENTS.md) — architectural improvements writeup (types, service layer, validation, error boundaries, hooks)
- [IMPROVEMENT_SUMMARY.md](IMPROVEMENT_SUMMARY.md) — summary of the above
- [SUMMARY.md](SUMMARY.md) — project-wide upgrade summary
- [COMPREHENSIVE_REFACTOR_PLAN.md](COMPREHENSIVE_REFACTOR_PLAN.md) — a refactor plan; check against current code before assuming any of it still applies

## Features (what was built, and how)

- [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md)
- [RESIDENTIAL_DASHBOARD_SETUP.md](RESIDENTIAL_DASHBOARD_SETUP.md)
- [ROUTING_UPGRADE.md](ROUTING_UPGRADE.md)
- [NAVBAR_REDESIGN.md](NAVBAR_REDESIGN.md)
- [USER_MENU_DROPDOWN.md](USER_MENU_DROPDOWN.md)
- [UNIT_MANAGEMENT_SIDEBAR.md](UNIT_MANAGEMENT_SIDEBAR.md)
- [UNIT_MANAGER_IMPLEMENTATION.md](UNIT_MANAGER_IMPLEMENTATION.md)
- [UNIT_WIZARD.md](UNIT_WIZARD.md)
- [MANAGER_IMPROVEMENTS.md](MANAGER_IMPROVEMENTS.md)
- [BUILDING_FLOOR_MIGRATION.md](BUILDING_FLOOR_MIGRATION.md)
- [LOCATION_UPGRADE_GUIDE.md](LOCATION_UPGRADE_GUIDE.md)
- [LOCATION_TYPE_CRUD_SUMMARY.md](LOCATION_TYPE_CRUD_SUMMARY.md)
- [ADDON_REFACTOR_SUMMARY.md](ADDON_REFACTOR_SUMMARY.md)

## History (resolved bugs / one-time migrations)

Postmortems and troubleshooting notes for issues that were fixed at the
time. The underlying fixes are in git history and the current code; these
are kept for context, not as active guidance.

- [ACCESS_ISSUE_FIX.md](ACCESS_ISSUE_FIX.md)
- [RLS_AUTH_FIX.md](RLS_AUTH_FIX.md)
- [COMPLETE_RLS_FIX.md](COMPLETE_RLS_FIX.md)
- [RLS_FIXES_SUMMARY.md](RLS_FIXES_SUMMARY.md)
- [USEACCESS_ROLE_UPDATE.md](USEACCESS_ROLE_UPDATE.md)
- [INFINITE_LOOP_FIX.md](INFINITE_LOOP_FIX.md)
- [OTP_EMAIL_FIX.md](OTP_EMAIL_FIX.md)
- [SIGNOUT_FIX.md](SIGNOUT_FIX.md)
- [SUPABASE_RESTART_FIX.md](SUPABASE_RESTART_FIX.md)
- [MIGRATION_FIXED.md](MIGRATION_FIXED.md)
- [MIGRATION_INSTRUCTIONS.md](MIGRATION_INSTRUCTIONS.md)
- [CLEAR_SESSION.md](CLEAR_SESSION.md)
- [DIAGNOSTIC_CHECKLIST.md](DIAGNOSTIC_CHECKLIST.md)
- [TEST_RLS.md](TEST_RLS.md)
