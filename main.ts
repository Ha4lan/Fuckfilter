import { DOMParser, Element } from "deno_dom";
import { Hono } from "hono";
import { createProxyUrl } from "./utils/createProxyurl.ts";

const app = new Hono();

app.all("/", async (c) => {
  try {
    const query = c.req.query("q");

    if (!query) {
      return c.text("Please use ?q=base64_url", 400);
    }

    const url = decodeURIComponent(atob(query));
    const method = c.req.method;
    const body = await c.req.blob();
    const headers = await c.req.raw.headers;

    const response = await fetch(url, {
      method,
      body: method === "GET" || method === "HEAD" ? null : body,
      headers,
      redirect: "manual",
    });
    const locationHeader = response.headers.get("Location");

    if (locationHeader) {
      // In Redirect
      let locationUrl;
      if (
        locationHeader.startsWith("http://") ||
        locationHeader.startsWith("https://")
      ) {
        locationUrl = createProxyUrl({
          completeUrl: locationHeader,
          proxyOrigin: new URL(c.req.url).origin,
        });
      } else {
        locationUrl = createProxyUrl({
          origin: new URL(url).origin,
          relativePath: locationHeader.startsWith("/")
            ? locationHeader
            : "/" + locationHeader,
          proxyOrigin: new URL(c.req.url).origin,
        });
      }

      return new Response(response.body, {
        ...response,
        status: 302,
        statusText: "Redirect by Proxy",
        headers: new Headers({
          ...response.headers,
          "Location": locationUrl ?? "",
        }),
      });
    } else {
      if ((response.headers.get("Content-Type") ?? "").includes("text/html")) {
        // In HTML
        const body = await response.text();
        const doc = new DOMParser().parseFromString(body, "text/html");
        const href = doc.querySelectorAll("[href]");
        const src = doc.querySelectorAll("[src]");
        const actions = doc.querySelectorAll("[action]");

        href.forEach((element) => {
          const rawUrl = (element as Element).getAttribute("href")!;
          let hrefUrl;
          if (
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ||
            rawUrl.startsWith("//")
          ) {
            hrefUrl = createProxyUrl({
              completeUrl: rawUrl.replace(
                /^\/\//,
                new URL(url).protocol + "//",
              ),
              proxyOrigin: new URL(c.req.url).origin,
            });
          } else {
            hrefUrl = createProxyUrl({
              url,
              relativePath: rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl,
              proxyOrigin: new URL(c.req.url).origin,
            });
          }

          (element as Element).setAttribute("href", hrefUrl ?? "");
        });

        src.forEach((element) => {
          const rawUrl = (element as Element).getAttribute("src")!;
          let srcUrl;
          if (
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ||
            rawUrl.startsWith("//")
          ) {
            srcUrl = createProxyUrl({
              completeUrl: rawUrl.replace(
                /^\/\//,
                new URL(url).protocol + "//",
              ),
              proxyOrigin: new URL(c.req.url).origin,
            });
          } else {
            srcUrl = createProxyUrl({
              url,
              relativePath: rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl,
              proxyOrigin: new URL(c.req.url).origin,
            });
          }

          (element as Element).setAttribute("src", srcUrl ?? "");
        });

        actions.forEach((element) => {
          const rawUrl = (element as Element).getAttribute("action")!;
          let actionUrl;
          if (
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ||
            rawUrl.startsWith("//")
          ) {
            actionUrl = createProxyUrl({
              completeUrl: rawUrl.replace(
                /^\/\//,
                new URL(url).protocol + "//",
              ),
              proxyOrigin: new URL(c.req.url).origin,
            });
          } else {
            actionUrl = createProxyUrl({
              url,
              relativePath: rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl,
              proxyOrigin: new URL(c.req.url).origin,
            });
          }

          (element as Element).setAttribute("src", actionUrl ?? "");
        });

        try {
          doc.querySelectorAll("[http-equiv='content-security-policy']").forEach(el => {
            (el as Element).remove()
          })
        }catch {/* Do Nothing */}

        let nonce = ""; 

        try {
          // @ts-ignore: NOT TYPED WELL
          nonce = doc.querySelector("script[nonce]")?.nonce;
        }catch {/* Do Nothing */}

        return new Response(doc.documentElement?.outerHTML, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      return response;
    }
  } catch {
    return c.text("Error", 500);
  }
});



Deno.serve(app.fetch);
