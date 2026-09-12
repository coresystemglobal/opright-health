import { installRegistry } from './registry';

/**
 * Side-effect module: patches express.Router the moment it is imported.
 *
 * This exists as its own module because TypeScript hoists `import` statements
 * above ordinary statements in the emitted CommonJS. A bare `installRegistry()`
 * call placed between imports in router.ts would therefore run AFTER every
 * route file had already been loaded and had already created its routers -
 * leaving the reconciler with an empty route list and silently reporting
 * "all clear".
 *
 * Import order between modules IS preserved, so importing this first:
 *
 *   import './security/install';   // must be the first import in router.ts
 *   import { Router } from 'express';
 *
 * guarantees the patch is in place before any router is constructed.
 */
installRegistry();
