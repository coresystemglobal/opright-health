/**
 * CI guard: fails the build if any route is reachable without a declared
 * access policy.
 *
 *   npm run verify:policy              # fail on unprotected routes
 *   npm run verify:policy -- --strict  # also fail on entries still marked review
 *
 * This imports the real router, so it catches routes added anywhere in the
 * tree. It performs no I/O and needs no database.
 */
import '../security/install';
import router from '../router';
import { reconcile } from '../security/reconcile';

const strict = process.argv.includes('--strict');
const report = reconcile(router);

console.log(
  `Routes: ${report.totalRoutes}  Policies: ${report.totalPolicies}  ` +
    `Orphaned: ${report.orphaned.length}  Awaiting review: ${report.unreviewed.length}`
);

let failed = false;

if (report.unprotected.length > 0) {
  failed = true;
  console.error(`\n✗ ${report.unprotected.length} route(s) have no access policy:\n`);
  for (const r of report.unprotected) console.error(`    ${r.method.padEnd(7)} ${r.path}`);
  console.error(`\n  Add an entry to src/security/policy.ts for each of these.`);
  console.error(`  Until then they are denied at runtime (403 NO_POLICY).`);
}

if (report.orphaned.length > 0) {
  console.warn(`\n! ${report.orphaned.length} policy entries match no route (stale):`);
  for (const k of report.orphaned.slice(0, 20)) console.warn(`    ${k}`);
  if (report.orphaned.length > 20) console.warn(`    ...and ${report.orphaned.length - 20} more`);
}

if (strict && report.unreviewed.length > 0) {
  failed = true;
  console.error(`\n✗ ${report.unreviewed.length} policy entries still carry review: true.`);
  console.error(`  Confirm each derived permission against the role model, then remove the flag.`);
}

if (failed) process.exit(1);
console.log('\n✓ Every route has an access policy.');
