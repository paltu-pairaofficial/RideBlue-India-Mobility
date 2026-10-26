# Reconciliation package notes

This package preserves the uploaded application source and migrations. The only modifications are documentation corrections plus the read-only database inspection SQL and reconciliation reports.

No application TypeScript/JavaScript code, numbered migration SQL, or live database was modified by this reconciliation pass. No Supabase connection was made and no SQL was executed against any database.

Start here:
1. `DATABASE_RECONCILIATION_AUDIT.md`
2. `HISTORICAL_SQL_RECONCILIATION.md`
3. `sql/inspection/inspect_supabase_state_read_only.sql`
4. `PRODUCTION_DATABASE_RECONCILIATION_CHECKLIST.md`

The package does not contain a database-specific write migration because the actual production schema and applied migration history have not yet been inspected. Generate that only after reviewing read-only query results.
