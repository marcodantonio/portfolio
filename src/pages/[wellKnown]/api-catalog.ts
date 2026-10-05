import type { APIRoute } from "astro";
import { agentCatalog } from "@/lib/agent-discovery";

// Astro ignores dot-prefixed page directories, so match the public discovery
// path through a guarded dynamic segment instead.
export const GET: APIRoute = ({ params }) => params.wellKnown === ".well-known" ? Response.json(agentCatalog, {
  headers: {
    "Cache-Control": "public, max-age=3600",
    "Link": '</docs/api>; rel="service-doc"; type="text/html"',
  },
}) : new Response("Not found", { status: 404 });
