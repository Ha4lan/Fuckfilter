import { DOMParser, Element } from "deno_dom";
import { Hono } from "hono";
import { createProxyUrl } from "./utils/createProxyurl.ts";

const app = new Hono();

const nonSec = {
  "Content-Security-Policy": "",
  "Access-Controll-Allow-Origin": "*"
}

const parseHeader = (headers: Headers, sub?: Record<string, string>) => {
  const headersObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  return new Headers({
    ...headersObj,
    ...nonSec,
    ...sub
  })
}

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
        headers: parseHeader(new Headers(response.headers), {
          "Location": locationUrl ?? ""
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

        // TODO: joinPathとincludes query
        const scriptTag = 
        `
        <!-- fuck-filter -->
        <script fuck-filter ${nonce !== "" && `nonce="${nonce}"`}>
        console.log("%c[Created-By]", "color: #00cc00", "@amex2189 / @EdamAme-x")
        window._open = window.open;
        window.open = (target, ...args) => {
            const proxyHostname = new URL(window.location.href).origin;
            let proxyTarget = decodeURIComponent(atob(new URL(window.location.href).searchParams.get("q")));
            if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("//")) {
                const url = proxyHostname + "/?q=" + btoa(encodeURIComponent(target));
                return window._open(url, ...args);
            }else {
                const url = proxyHostname + "/?q=" + btoa(encodeURIComponent(proxyTarget));
                return window._open(url, ...args);
            }
        }
        /* FETCH */
        window._fetch = window.fetch;
        window.fetch = (target, ...args) => {
            const proxyHostname = new URL(window.location.href).origin;
            const proxyTarget = new URL(window.location.href).pathname.replace(/\\//, "");
        
            if (target instanceof Request) {
                const url = proxyHostname + "/" + target.url;
                return window._fetch(url, {
                    headers: target.headers,
                    method: target.method,
                    body: target.body ?? null
                })
            }
        
            if (target.startsWith("http") || target.startsWith("//")) {
                // const url = proxyHostname + "/?q=" + btoa(encodeURIComponent(target);
                const url = new URL(\`/?q=\${btoa(encodeURIComponent(target))}\`, proxyHostname).toString();
                return window._fetch(url, ...args);
            }else {
                // const url = proxyHostname + "/?q=" + btoa(encodeURIComponent(proxyTarget + "/" + target.replace(/^\\.*\\//, "")));
                const url = new URL(\`/?q=\${btoa(encodeURIComponent(proxyPath + "/" + target.replace(/^\//, "")))}\`, proxyHostname).toString();
                return window._fetch(url, ...args);
            }
            
        }
        /* XML-HTTP-REQUEST */
        window._XMLHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new window._XMLHttpRequest();
        
            const proxyHostname = new URL(window.location.href).origin;
            const proxyTarget = new URL(window.location.href).pathname.replace(/\\//, "");
            this._open = xhr.open;
        
            xhr.open = function(method, url, ...args) {
                if (url instanceof URL) {
                    url = url.toString()
                }
                let newUrl = "";
                if (url.startsWith("http") || url.startsWith("//")) {
                    newUrl = proxyHostname + "/" + url;
                } else {
                    newUrl = proxyHostname + "/" + proxyTarget + "/" + url.replace(/^\\.*\\//, "");
                }
                return this._open(method, newUrl, ...args);
            };
        
            return this;
        }
        /* OBSERVER */
        const url = new URL(window.location.href);
        const proxyURL = url.origin;
        const baseURL = new URL(url.pathname.replace(/\\//, "")).origin;
        
        function normalizeURL(relativeURL) {
            const trimmedRelativeURL = relativeURL.startsWith("/") ? relativeURL.slice(1) : relativeURL;
            return  baseURL + "/" + trimmedRelativeURL;
        }
        
        const observer = new MutationObserver((mutationsList, observer) => {
          for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
              document.body.querySelectorAll("*").forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const aTags = node.querySelectorAll("a");
        
                  aTags.forEach((a) => {
                    const href = a.getAttribute("href");
                    if (!href) return;
                    if (href.includes(window.location.hostname)) return;
                    if (!href.startsWith("http") && !href.startsWith("//")) {
                      const absoluteURL = normalizeURL(href);
                      a.setAttribute("href", proxyURL + "/" + absoluteURL);
                    } else if (href.startsWith("http") || href.startsWith("//")) {
                      a.setAttribute("href", proxyURL + "/" + href);
                    }
                  });
        
                  const srcHrefs = node.querySelectorAll("[src]");
        
                  srcHrefs.forEach((tag) => {
                    const href = tag.getAttribute("src");
                    if (!href) return;
                    if (href.includes(window.location.hostname)) return;
                    if (!href.startsWith("http") && !href.startsWith("//")) {
                      const absoluteURL = normalizeURL(href);
                      tag.setAttribute("src", proxyURL + "/" + absoluteURL);
                    } else if (href.startsWith("http") || href.startsWith("//")) {
                      tag.setAttribute("src", proxyURL + "/" + href);
                    }
                  });
        
                  const actionHrefs = node.querySelectorAll("[action]");
        
                  actionHrefs.forEach((tag) => {
                    const href = tag.getAttribute("action");
                    if (!href) return;
                    if (href.includes(window.location.hostname)) return;
                    if (!href.startsWith("http") && !href.startsWith("//")) {
                      const absoluteURL = normalizeURL(href);
                      tag.setAttribute("action", proxyURL + "/" + absoluteURL);
                    } else if (href.startsWith("http") || href.startsWith("//")) {
                      tag.setAttribute("action", proxyURL + "/" + href);
                    }
                  });
        
                  observer.observe(node, { childList: true, attributes: true, subtree: true });
                }
              });
            }
          }
        });
        
        observer.observe(document.body, { childList: true, attributes: true, subtree: true });
        </script>
        <!-- fuck-filter -->
        `

        return new Response(doc.documentElement?.outerHTML, {
          status: response.status,
          statusText: response.statusText,
          headers: parseHeader(response.headers)
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: parseHeader(response.headers)
      });
    }
  } catch {
    return c.text("Error", 500);
  }
})

Deno.serve(app.fetch);
// といれ