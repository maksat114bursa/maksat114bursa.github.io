import type { Context } from "https://edge.netlify.com";

const HEDEF = "https://maksat114-panel.maksat114.workers.dev";
const SILINECEK = ["host", "x-vekil", "x-istemci-ip", "x-istemci-ulke", "x-istemci-sehir", "cf-connecting-ip", "x-forwarded-for", "x-real-ip"];

export default async (istek: Request, context: Context) => {
  const url = new URL(istek.url);
  if (url.pathname === "/") return Response.redirect(url.origin + "/panel", 302);

  const basliklar = new Headers(istek.headers);
  for (const b of SILINECEK) basliklar.delete(b);
  basliklar.set("x-vekil", Netlify.env.get("VEKIL_ANAHTAR") ?? "");
  basliklar.set("x-istemci-ip", context.ip ?? "");
  basliklar.set("x-istemci-ulke", context.geo?.country?.code ?? "");
  basliklar.set("x-istemci-sehir", context.geo?.city ?? "");

  const govdeVar = !["GET", "HEAD"].includes(istek.method);
  const yanit = await fetch(HEDEF + url.pathname + url.search, {
    method: istek.method,
    headers: basliklar,
    body: govdeVar ? await istek.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const cikis = new Headers(yanit.headers);
  const yer = cikis.get("location");
  if (yer?.startsWith(HEDEF)) cikis.set("location", url.origin + yer.slice(HEDEF.length));
  return new Response(yanit.body, { status: yanit.status, headers: cikis });
};

export const config = { path: "/*" };
