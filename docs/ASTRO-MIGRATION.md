# Astro + Cloudflare migration

The playable portfolio now runs on Astro 7, React 19 islands, Tailwind 4's
Vite integration, and the official Cloudflare adapter 14. The adapter uses
Vite and `workerd` for development, production builds, and local preview.
This follows the [current adapter contract](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

## Entrypoints and preserved routes

| Route / file | Responsibility |
| --- | --- |
| `src/pages/index.astro`, `src/pages/en.astro` | Italian / English SSR pages |
| `src/layouts/SiteLayout.astro` | HTML locale, canonical / alternate links, SEO, JSON-LD, local fonts |
| `components/portfolio-app.tsx` | Shared React application, hydrated with `client:load` |
| `src/pages/api/personai.ts` | Existing real RAG endpoint on Workers AI |
| `src/pages/cv/[lang].ts` | IT / EN CV download, same curriculum upstream |
| `src/pages/sitemap.xml.ts` | Crawlable locale URLs |
| `src/pages/[wellKnown]/api-catalog.ts`, `src/pages/docs/api.astro` | Guarded `/.well-known/api-catalog` / human API discovery |
| `src/middleware.ts` | Security headers and existing country-based first landing |

The React application is server-rendered, not `client:only`. Portfolio content
must remain present in semantic HTML while the Three.js game progressively
enhances it. All visible portfolio translations still belong to
`content/i18n.ts`, and the facts remain in `lib/data.ts`.

`app/` route files, `next.config.ts`, and `open-next.config.ts` are retained
as historical source. They are not loaded by Astro and are excluded from its
typecheck. Shared styles remain under `app/` to avoid unrelated CSS rewrites;
`SiteLayout.astro` imports `app/globals.css` directly.
OpenNext and its Next-specific ESLint preset are removed. Next itself is a
development-only dependency for retained, unmounted source modules; it does
not own any active route or deployment entrypoint.

## Commands

```sh
npm run dev       # Astro/Vite + workerd, default http://127.0.0.1:3010
npm run lint      # TypeScript, React hooks, Astro ESLint checks
npm run build     # Existing knowledge sync, Astro typecheck, production bundle
npm run preview   # Preview the built Worker locally
npm run cf-typegen
```

Node.js 22.12 or later is required by the installed Astro release.
`npm run deploy` builds and runs Wrangler; **deployment and push require
explicit, separate authorization**. Neither migration nor local preview
deploys the Worker or changes custom domains.

## Cloudflare runtime and security

`wrangler.toml` retains Worker name `web-portfolio`, custom domains, AI
binding, compatibility date, `nodejs_compat`, and disabled observability.
Its `main` is `@astrojs/cloudflare/entrypoints/server`; generated build output
is under `dist/` and is ignored by Git.

Bindings use `env` from `cloudflare:workers`; OpenNext context and the removed
`Astro.locals.runtime` API are not used. `lib/turnstile.ts` now reads
`TURNSTILE_SECRET_KEY` from this runtime and fails closed when missing.
Existing secret values are never copied into code or browser bundles.
`RESEND_API_KEY` remains an existing deployment secret for the archived
contact action; the current contact surface uses direct contact links.

The AI endpoint retains trusted-origin checks, the per-isolate 8-request /
5-minute burst limiter, mandatory Turnstile verification, question bounds,
and the real `answerPersonAIQuestion` knowledge/model pipeline. Malformed JSON
returns 400; API responses are `no-store`. The in-memory limiter is not a
globally coordinated quota: Turnstile remains the primary abuse gate.

`remoteBindings: false` in the adapter makes local UI checks independent of
Cloudflare credentials and prevents unintended remote AI consumption.
Live AI verification requires explicitly enabling remote bindings and valid
Turnstile / Cloudflare credentials; no synthetic provider is substituted.

The CSP permits WebAssembly compilation (`wasm-unsafe-eval`) for Rapier,
local `data:` / `blob:` media for Howler, and blob workers. It does not enable
general `unsafe-eval`. WebSocket connect permission is development-only.
Turnstile and existing Cloudflare analytics origins remain explicitly allowed.

`session: false` and `imageService: "passthrough"` prevent unused session KV
or Cloudflare Images bindings from being automatically provisioned. Local
Fontsource variable fonts replace the former Next/Google font loader.

## Verification boundary

Run the required lint/build and inspect the actual SSR routes, hydration,
keyboard/touch game controls, content panels, and preserved chat UI. Test API
validation without a Turnstile token to avoid remote inference in local QA.
Passing those checks is not evidence of deployment or live provider acceptance.
The previous generated Next OG-image routes are archival; current social
metadata points to the existing portrait image.
