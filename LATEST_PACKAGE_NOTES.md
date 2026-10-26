# Latest RideBlue Package Notes

This package is assembled from the latest Phase 3–6 RideBlue source package available in this conversation, with the latest build-repair audit report included. It preserves the existing application and package manifests; it is not a rebuild or a claim of production readiness.

## Included
- Existing React/TypeScript frontend and Express server source
- `package.json` and `package-lock.json`
- Supabase migrations 01–07, tests, `.env.example` files, and deployment documentation
- Latest build-repair and verification audit

## Excluded
- `node_modules/`, generated `dist/`, `.git/`, and real `.env` files

## Verification status
- The latest audit could not complete dependency installation because npm registry DNS/network access failed (`EAI_AGAIN registry.npmjs.org`).
- The production build, full lint/type check, and full `npm test` entrypoint remain unverified/blocked. See `BUILD_REPAIR_AND_VERIFICATION_AUDIT.md`.
- No Supabase migration was applied to a live database. Migrations must be reviewed and tested in staging in order before production deployment.
- Keep `ENABLE_LIVE_BOOKING`, `VITE_ENABLE_LIVE_BOOKING`, `ENABLE_LIVE_PAYMENTS`, and `ENABLE_REFUNDS` disabled until the documented release gates pass.
