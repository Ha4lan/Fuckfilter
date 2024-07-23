interface Options {
  url?: string;
  relativePath?: string;
  origin?: string;
  completeUrl?: string;
  proxyOrigin: string;
}

export function createProxyUrl(options: Options): string | undefined {
  let completeUrl = options.completeUrl;

  if (completeUrl) {
    return `${options.proxyOrigin}/?q=${btoa(encodeURIComponent(completeUrl))}`;
  }

  if (options.origin && options.relativePath) {
    completeUrl = `${options.proxyOrigin}/?q=${
      btoa(encodeURIComponent(options.origin + options.relativePath))
    }`;
  }

  if (options.url && options.relativePath) {
    completeUrl = `${options.proxyOrigin}/?q=${
      btoa(encodeURIComponent(new URL(options.relativePath, options.url).href))
    }`;
  }

  return completeUrl;
}
