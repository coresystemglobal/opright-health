import express from 'express';

/**
 * ============================================================================
 *  ROUTE REGISTRY - discovers every route the app actually declares.
 * ============================================================================
 *
 *  Used by the boot-time reconciler to prove that every reachable route has a
 *  policy entry.
 *
 *  WHY NOT WALK app.router.stack?
 *  Express 5 removed `layer.regexp` in favour of `layer.matchers`, and
 *  `layer.path` is undefined until a request matches. The Express 4 idiom of
 *  parsing `layer.regexp.source` to recover a mount path therefore yields
 *  nothing on Express 5 - and yields it silently, so the reconciler would
 *  report "all clear" forever. We record paths at declaration time instead,
 *  which depends on no Express internals and survives version bumps.
 *
 *  IMPORTANT: this module must be imported BEFORE any file that calls
 *  express.Router(). router.ts imports it on its first line.
 *
 *  Under `module: "commonjs"` (this project's tsconfig) a named import compiles
 *  to `express_1.Router()` - a property read at call time - so patching the
 *  export catches `import { Router } from 'express'` as well as
 *  `import express from 'express'`. Verified against Express 5.2.
 */

export interface DeclaredRoute {
  method: string;
  path: string;
}

interface Tracked {
  __routes?: DeclaredRoute[];
  __mounts?: Array<{ path: string; child: Tracked }>;
}

const VERBS = ['get', 'post', 'put', 'patch', 'delete', 'all'] as const;

let installed = false;

/** Patch express.Router so every declaration records its own path. */
export function installRegistry(): void {
  if (installed) return;
  installed = true;

  const OriginalRouter = express.Router;

  (express as any).Router = function patchedRouter(this: unknown, ...args: any[]) {
    const router: any = (OriginalRouter as any).apply(this, args);
    router.__routes = [] as DeclaredRoute[];
    router.__mounts = [] as Array<{ path: string; child: Tracked }>;

    for (const verb of VERBS) {
      const original = router[verb].bind(router);
      router[verb] = function (path: any, ...handlers: any[]) {
        if (typeof path === 'string') {
          router.__routes.push({ method: verb.toUpperCase(), path });
        }
        return original(path, ...handlers);
      };
    }

    const originalUse = router.use.bind(router);
    router.use = function (path: any, ...handlers: any[]) {
      if (typeof path === 'string') {
        for (const h of handlers) {
          if (h && Array.isArray(h.__routes)) {
            router.__mounts.push({ path, child: h });
          }
        }
      }
      return originalUse(path, ...handlers);
    };

    return router;
  };
}

/** Flatten a router tree into fully-qualified routes. */
export function collectRoutes(router: unknown, prefix = ''): DeclaredRoute[] {
  const r = router as Tracked;
  if (!r || !Array.isArray(r.__routes)) return [];

  const join = (a: string, b: string) => {
    const joined = `${a}${b === '/' ? '' : b}`;
    return (joined.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/');
  };

  const out: DeclaredRoute[] = r.__routes.map((rt) => ({
    method: rt.method,
    path: join(prefix, rt.path),
  }));

  for (const mount of r.__mounts ?? []) {
    out.push(...collectRoutes(mount.child, join(prefix, mount.path)));
  }
  return out;
}
