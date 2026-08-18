const UPSTREAM = "https://hbdtthxljihphdfvqxdm.supabase.co/functions/v1/sim-ciera-mcp";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "Mcp-Session-Id",
};

function toLegacy(value: string) {
  return value
    .replaceAll("CIERA MATILDA", "SIM-CIERA")
    .replaceAll("Ciera Matilda", "Sim-Ciera")
    .replaceAll("ciera-matilda", "sim-ciera");
}

function toMatilda(value: string) {
  return value
    .replaceAll("SIM-CIERA", "CIERA MATILDA")
    .replaceAll("Sim-Ciera", "Ciera Matilda")
    .replaceAll("sim-ciera", "ciera-matilda");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        "access-control-allow-methods": "POST,GET,OPTIONS",
        "access-control-allow-headers": "content-type,accept,mcp-session-id,mcp-protocol-version",
      },
    });
  }

  if (request.method === "GET") {
    return new Response(JSON.stringify({
      name: "ciera-matilda",
      displayName: "Ciera Matilda",
      status: "ok",
      mcp: true,
      upstream: "sim-ciera-mcp",
    }), {
      headers: { "content-type": "application/json", ...cors },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  const rawBody = await request.text();
  const upstreamBody = toLegacy(rawBody);

  const headers = new Headers();
  headers.set("content-type", request.headers.get("content-type") || "application/json");
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const protocol = request.headers.get("mcp-protocol-version");
  if (protocol) headers.set("mcp-protocol-version", protocol);
  const session = request.headers.get("mcp-session-id");
  if (session) headers.set("mcp-session-id", session);

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers,
    body: upstreamBody,
  });

  const responseText = await upstream.text();
  const exposed = toMatilda(responseText);
  const responseHeaders = new Headers(cors);
  responseHeaders.set("content-type", upstream.headers.get("content-type") || "application/json");
  const upstreamSession = upstream.headers.get("mcp-session-id");
  if (upstreamSession) responseHeaders.set("mcp-session-id", upstreamSession);

  return new Response(exposed, {
    status: upstream.status,
    headers: responseHeaders,
  });
});
