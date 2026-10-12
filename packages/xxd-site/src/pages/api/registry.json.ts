import type { APIRoute } from "astro";
import { registry } from "../../lib/data.js";
export const GET: APIRoute = () => new Response(JSON.stringify(registry, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
