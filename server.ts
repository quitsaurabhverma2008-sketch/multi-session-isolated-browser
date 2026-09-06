import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface CookieData {
  value: string;
  domain: string;
  path: string;
  expires?: number;
}

// In-memory cookie jars per isolated session: Map<sessionId, Map<domain, Map<cookieName, CookieData>>>
const sessionCookieJars: Map<string, Map<string, Map<string, CookieData>>> = new Map();

function storeSetCookies(sessionId: string, urlObj: URL, setCookieHeaders: string[]) {
  if (!sessionCookieJars.has(sessionId)) {
    sessionCookieJars.set(sessionId, new Map());
  }
  const jar = sessionCookieJars.get(sessionId)!;
  const reqHostname = urlObj.hostname.toLowerCase();

  for (const rawHeader of setCookieHeaders) {
    if (!rawHeader) continue;

    const cookieTokens = splitSetCookieString(rawHeader);

    for (const singleCookie of cookieTokens) {
      const parts = singleCookie.split(";").map((p) => p.trim());
      if (parts.length === 0) continue;

      const firstPart = parts[0];
      const eqIdx = firstPart.indexOf("=");
      if (eqIdx <= 0) continue;

      const name = firstPart.substring(0, eqIdx).trim();
      const value = firstPart.substring(eqIdx + 1).trim();

      let domain = reqHostname;
      let cookiePath = "/";
      let expires: number | undefined = undefined;

      for (let i = 1; i < parts.length; i++) {
        const attr = parts[i];
        const attrEq = attr.indexOf("=");
        const attrName = (attrEq > -1 ? attr.substring(0, attrEq) : attr).toLowerCase().trim();
        const attrVal = attrEq > -1 ? attr.substring(attrEq + 1).trim() : "";

        if (attrName === "domain" && attrVal) {
          domain = attrVal.startsWith(".") ? attrVal.substring(1).toLowerCase() : attrVal.toLowerCase();
        } else if (attrName === "path" && attrVal) {
          cookiePath = attrVal.startsWith("/") ? attrVal : "/" + attrVal;
        } else if (attrName === "max-age" && attrVal) {
          const seconds = parseInt(attrVal, 10);
          if (!isNaN(seconds)) {
            expires = Date.now() + seconds * 1000;
          }
        } else if (attrName === "expires" && attrVal) {
          const expTime = Date.parse(attrVal);
          if (!isNaN(expTime)) {
            expires = expTime;
          }
        }
      }

      if (!jar.has(domain)) {
        jar.set(domain, new Map());
      }
      jar.get(domain)!.set(name, {
        value,
        domain,
        path: cookiePath,
        expires,
      });
    }
  }
}

function splitSetCookieString(setCookieStr: string): string[] {
  if (!setCookieStr) return [];
  const cookies: string[] = [];
  let current = "";
  let inExpiresDate = false;

  for (let i = 0; i < setCookieStr.length; i++) {
    const char = setCookieStr[i];
    if (char === "," && !inExpiresDate) {
      if (current.trim()) cookies.push(current.trim());
      current = "";
      continue;
    }
    current += char;
    const lower = current.toLowerCase();
    if (lower.includes("expires=") && !lower.includes(";")) {
      inExpiresDate = true;
    } else if (char === ";") {
      inExpiresDate = false;
    }
  }
  if (current.trim()) cookies.push(current.trim());
  return cookies;
}

function getCookiesForUrl(sessionId: string, urlObj: URL): string {
  const jar = sessionCookieJars.get(sessionId);
  if (!jar) return "";

  const reqHostname = urlObj.hostname.toLowerCase();
  const reqPath = urlObj.pathname || "/";
  const now = Date.now();
  const cookies: string[] = [];

  for (const [domain, cookieMap] of jar.entries()) {
    // Check domain match
    if (
      reqHostname === domain ||
      reqHostname.endsWith("." + domain) ||
      (domain.startsWith(".") && ("." + reqHostname).endsWith(domain))
    ) {
      for (const [name, data] of cookieMap.entries()) {
        // Remove expired cookies
        if (data.expires && data.expires < now) {
          cookieMap.delete(name);
          continue;
        }
        // Match path
        const cPath = data.path || "/";
        if (
          cPath === "/" ||
          reqPath === cPath ||
          reqPath.startsWith(cPath.endsWith("/") ? cPath : cPath + "/")
        ) {
          cookies.push(`${name}=${data.value}`);
        }
      }
    }
  }

  return cookies.join("; ");
}

// Compute a safe base href that doesn't strip or corrupt CodeIgniter / PHP framework routes
function computeProperBaseHref(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const pathname = u.pathname;
    const idxPhp = pathname.toLowerCase().indexOf("index.php");
    if (idxPhp !== -1) {
      // Base is everything up to index.php
      const basePath = pathname.substring(0, idxPhp);
      return u.origin + (basePath.endsWith("/") ? basePath : basePath + "/");
    }
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash > 0) {
      return u.origin + pathname.substring(0, lastSlash + 1);
    }
    return u.origin + "/";
  } catch (e) {
    return urlStr;
  }
}

// Inspector Bridge Script to inject into pages
function getInspectorBridgeScript(originalUrl: string, sessionId: string): string {
  return `
<!-- INJECTED BY ISOLATED BROWSER ENGINE -->
<script id="__isolated_browser_bridge__">
(function() {
  const TARGET_ORIGIN = '*';
  let currentTargetUrl = ${JSON.stringify(originalUrl)};
  const sessionId = ${JSON.stringify(sessionId)};
  let lastReportedHtml = '';
  let throttleTimer = null;

  // Use absolute URL from window.location.origin so browser NEVER resolves against <base href>
  const PROXY_ORIGIN = window.location.origin;
  const PROXY_BASE = PROXY_ORIGIN + '/api/proxy';

  function getProxiedUrl(targetResolvedUrl) {
    return PROXY_BASE + '?url=' + encodeURIComponent(targetResolvedUrl) + '&sessionId=' + encodeURIComponent(sessionId);
  }

  function resolveTargetUrl(rawHref) {
    if (!rawHref) return currentTargetUrl;
    try {
      let resolved = new URL(rawHref, currentTargetUrl).href;
      if (resolved.startsWith(PROXY_ORIGIN) && !resolved.includes('/api/proxy')) {
        const targetObj = new URL(currentTargetUrl);
        resolved = targetObj.origin + resolved.substring(PROXY_ORIGIN.length);
      }
      return resolved;
    } catch (e) {
      return rawHref;
    }
  }

  // Instant notification to parent window when URL is active or changed
  function notifyUrlActive() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'BROWSER_URL_CHANGED',
          url: currentTargetUrl,
          originalUrl: currentTargetUrl,
          sessionId: sessionId,
          title: document.title || 'Web Page'
        }, TARGET_ORIGIN);
      }
    } catch (e) {}
  }

  // Sync internal iframe history so location.href reflects proxied target
  try {
    const desiredProxyUrl = getProxiedUrl(currentTargetUrl);
    if (window.location.href !== desiredProxyUrl) {
      window.history.replaceState(null, document.title || '', desiredProxyUrl);
    }
  } catch (e) {}

  // Immediate notification on bridge initialization
  notifyUrlActive();

  function broadcastDom(reason) {
    // Only broadcast full DOM mutations for the primary single-tab devtools session
    if (sessionId !== 'persistent-user-session') {
      return;
    }

    try {
      const currentHtml = document.documentElement ? document.documentElement.outerHTML : '';
      if (currentHtml === lastReportedHtml && reason !== 'initial' && reason !== 'window_load') return;
      lastReportedHtml = currentHtml;

      const metadata = {
        type: 'BROWSER_DOM_MUTATION',
        reason: reason || 'mutation',
        url: window.location.href,
        originalUrl: currentTargetUrl,
        sessionId: sessionId,
        title: document.title || 'Web Page',
        timestamp: Date.now(),
        nodeCount: document.querySelectorAll('*').length,
        html: currentHtml,
        cookies: document.cookie,
        activeElement: document.activeElement ? document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? '#' + document.activeElement.id : '') : null
      };

      if (window.parent && window.parent !== window) {
        window.parent.postMessage(metadata, TARGET_ORIGIN);
      }
    } catch (e) {
      console.error('[Bridge] Error broadcasting DOM:', e);
    }
  }

  function queueBroadcast(reason) {
    if (sessionId !== 'persistent-user-session') return;
    if (throttleTimer) clearTimeout(throttleTimer);
    throttleTimer = setTimeout(() => {
      broadcastDom(reason);
    }, 1500);
  }

  // Observe DOM changes ONLY for primary session when idle
  if (sessionId === 'persistent-user-session' && window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      // Ignore trivial attribute changes like hover/anim classes to save CPU
      let hasStructuralChange = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].type === 'childList') {
          hasStructuralChange = true;
          break;
        }
      }
      if (hasStructuralChange) {
        queueBroadcast('mutation');
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        if (document.documentElement) {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
        }
        notifyUrlActive();
        queueBroadcast('dom_content_loaded');
      });
    }
  }

  // Intercept inputs/changes ONLY with throttled queue
  if (sessionId === 'persistent-user-session') {
    document.addEventListener('change', () => queueBroadcast('change'), true);
  }

  // Allow parent UI to request fresh DOM snapshot on-demand (e.g. when opening source view)
  window.addEventListener('message', function(ev) {
    if (!ev.data) return;
    if (ev.data.type === 'REQUEST_DOM_SYNC') {
      broadcastDom('manual_request');
    }

    // Auto Fill User & Password directly into target page form
    if (ev.data.type === 'AUTOFILL_CREDENTIALS') {
      const username = ev.data.username || '';
      const password = ev.data.password || '';
      const autoSubmit = Boolean(ev.data.autoSubmit);

      function typeValue(input, val) {
        if (!input || val === undefined || val === null) return;
        const strVal = String(val);
        if (input.value === strVal) return; // Already populated, avoid redundant events
        try {
          // CRITICAL: Never invoke input.focus() or dispatch focus/blur events in background tabs/iframes!
          // Calling focus() across multi-tabs causes the virtual/mobile keyboard to open/close frantically ("blink") and lag.
          const proto = window.HTMLInputElement ? window.HTMLInputElement.prototype : null;
          const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value')?.set : null;
          if (nativeSetter) {
            nativeSetter.call(input, strVal);
          } else {
            input.value = strVal;
          }
          input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          try { input.value = strVal; } catch (e2) {}
        }
      }

      function findLoginInputs() {
        // 1. Direct targeted selector match first (works even for background tabs!)
        let user = document.querySelector('#user, #username, input[name="username"], input[name="user"], input[name="login"], input.data_input[type="text"], input[placeholder*="Username" i], input[placeholder*="User" i]');
        let pass = document.querySelector('#password, #pass, input[name="password"], input[name="pass"], input[name="pwd"], input[type="password"], input.data_input[type="password"], input[placeholder*="Password" i]');

        if (user && pass) {
          return { user: user, pass: pass };
        }

        // 2. Scan all candidate inputs
        const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"])')).filter(el => !el.disabled && !el.readOnly);

        if (!pass) {
          pass = allInputs.find(function(i) {
            const t = (i.type || '').toLowerCase();
            const n = (i.name || '').toLowerCase();
            const id = (i.id || '').toLowerCase();
            const ph = (i.placeholder || '').toLowerCase();
            const ac = (i.getAttribute('autocomplete') || '').toLowerCase();
            return t === 'password' || n.includes('pass') || n.includes('pwd') || id.includes('pass') || id.includes('pwd') || ph.includes('pass') || ac.includes('password');
          });
        }

        if (!user) {
          user = allInputs.find(function(i) {
            if (i === pass) return false;
            const t = (i.type || '').toLowerCase();
            const n = (i.name || '').toLowerCase();
            const id = (i.id || '').toLowerCase();
            const ph = (i.placeholder || '').toLowerCase();
            const ac = (i.getAttribute('autocomplete') || '').toLowerCase();
            return t === 'email' || t === 'tel' || n.includes('user') || n.includes('login') || n.includes('email') || n.includes('phone') || n.includes('mobile') || n.includes('account') || n.includes('member') || id.includes('user') || id.includes('login') || id.includes('email') || id.includes('phone') || id.includes('account') || ph.includes('user') || ph.includes('email') || ph.includes('phone') || ph.includes('login') || ac.includes('username') || ac.includes('email');
          });
        }

        // Fallback: If pass is found, user is the input right before pass!
        if (pass && !user) {
          const pIdx = allInputs.indexOf(pass);
          if (pIdx > 0) {
            user = allInputs[pIdx - 1];
          }
        }

        // Fallback: If 2 visible inputs exist in a form or page, input 0 is user and input 1 is pass!
        if (!user && !pass && allInputs.length >= 2) {
          user = allInputs[0];
          pass = allInputs[1];
        } else if (!user && allInputs.length >= 1) {
          user = allInputs[0];
        } else if (!pass && allInputs.length >= 2) {
          pass = allInputs.find(function(i) { return i !== user; });
        }

        return { user: user, pass: pass };
      }

      function attemptFill() {
        const inputs = findLoginInputs();
        let filledAny = false;

        if (inputs.user && username) {
          typeValue(inputs.user, username);
          filledAny = true;
        }
        if (inputs.pass && password) {
          typeValue(inputs.pass, password);
          filledAny = true;
        }

        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'AUTOFILL_RESULT',
              sessionId: sessionId,
              success: filledAny,
              userFound: Boolean(inputs.user),
              passFound: Boolean(inputs.pass)
            }, TARGET_ORIGIN);
          }
        } catch (e) {}

        if (autoSubmit && (inputs.pass || inputs.user)) {
          setTimeout(function() {
            const form = (inputs.pass && inputs.pass.form) || (inputs.user && inputs.user.form) || document.querySelector('form');
            const submitBtn = form ? (form.querySelector('button[type="submit"], input[type="submit"], button:not([type])') || form) : null;
            if (submitBtn && typeof submitBtn.click === 'function') {
              submitBtn.click();
            } else if (form && typeof form.submit === 'function') {
              form.submit();
            }
          }, 350);
        }

        return { userFound: Boolean(inputs.user), passFound: Boolean(inputs.pass), success: filledAny };
      }

      // Prevent overlapping interval loops if already running
      if (window.__autofill_timer__) {
        clearInterval(window.__autofill_timer__);
        window.__autofill_timer__ = null;
      }

      const initResult = attemptFill();
      if (initResult.userFound && initResult.passFound) {
        return; // Complete, no background polling needed!
      }

      // Gentle polling for pages still executing initial scripts (max 4 attempts, 350ms apart)
      let attempts = 0;
      const maxAttempts = 4;
      window.__autofill_timer__ = setInterval(function() {
        attempts++;
        const res = attemptFill();
        if ((res.userFound && res.passFound) || attempts >= maxAttempts) {
          if (window.__autofill_timer__) {
            clearInterval(window.__autofill_timer__);
            window.__autofill_timer__ = null;
          }
        }
      }, 350);
      attemptFill();
    }
  });

  function notifyBridgeReady() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'PAGE_READY_FOR_AUTOFILL',
          sessionId: sessionId,
          url: currentTargetUrl
        }, TARGET_ORIGIN);
      }
    } catch (e) {}
  }

  // Initial broadcasts
  broadcastDom('initial');
  notifyBridgeReady();
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    notifyUrlActive();
    notifyBridgeReady();
    broadcastDom('initial');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      notifyUrlActive();
      notifyBridgeReady();
      broadcastDom('dom_content_loaded');
    });
    window.addEventListener('load', () => {
      notifyUrlActive();
      notifyBridgeReady();
      broadcastDom('window_load');
    });
  }

  // Notify navigation start so UI address bar updates immediately
  function notifyNavigating(targetUrl) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'BROWSER_NAVIGATING',
          url: targetUrl,
          sessionId: sessionId
        }, TARGET_ORIGIN);
      }
    } catch (e) {}
  }

  // Intercept navigation links
  document.addEventListener('click', function(e) {
    const anchor = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!anchor) return;

    const rawHref = anchor.getAttribute('href');
    if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('#')) return;

    e.preventDefault();
    anchor.removeAttribute('target');
    const targetResolved = resolveTargetUrl(rawHref);
    notifyNavigating(targetResolved);
    window.location.href = getProxiedUrl(targetResolved);
  }, true);

  // Helper function to prepare and route form submissions correctly
  function prepareAndRouteForm(form, submitEvent) {
    const rawAction = form.getAttribute('action') || '';
    const method = (form.getAttribute('method') || 'GET').toUpperCase();
    const targetAction = resolveTargetUrl(rawAction);

    notifyNavigating(targetAction);

    if (method === 'GET') {
      if (submitEvent) submitEvent.preventDefault();
      const formData = new FormData(form);
      const targetObj = new URL(targetAction);
      for (const [key, value] of formData.entries()) {
        targetObj.searchParams.set(key, typeof value === 'string' ? value : '');
      }
      const finalTarget = targetObj.href;
      notifyNavigating(finalTarget);
      window.location.href = getProxiedUrl(finalTarget);
      return false;
    } else {
      // POST Form: Set form action safely via prototype to avoid input[name="action"] collision
      const proxiedAction = getProxiedUrl(targetAction);
      try {
        HTMLFormElement.prototype.setAttribute.call(form, 'action', proxiedAction);
        HTMLFormElement.prototype.setAttribute.call(form, 'target', '_self');
      } catch (e) {
        form.setAttribute('action', proxiedAction);
      }
      return true;
    }
  }

  // Intercept HTML forms (Multi-step wizards, logins, checkout)
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form || form.nodeName !== 'FORM') return;
    prepareAndRouteForm(form, e);
  }, true);

  // Monkey-patch HTMLFormElement.prototype.submit for programmatic form submissions
  if (typeof HTMLFormElement !== 'undefined' && HTMLFormElement.prototype) {
    const originalFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      prepareAndRouteForm(this, null);
      return originalFormSubmit.call(this);
    };
  }

  // Monkey-patch window.fetch for AJAX requests made by pages
  const originalFetch = window.fetch;
  window.fetch = function(resource, init) {
    let url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
    try {
      const resolved = resolveTargetUrl(url);
      if (!resolved.includes('/api/proxy')) {
        url = getProxiedUrl(resolved);
      }
    } catch (err) {}

    if (typeof resource === 'string') {
      return originalFetch.call(this, url, init);
    } else {
      const newRequest = new Request(url, init || resource);
      return originalFetch.call(this, newRequest);
    }
  };

  // Monkey-patch XMLHttpRequest.open for AJAX/jQuery/Axios calls
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    let rewrittenUrl = url;
    try {
      const resolved = resolveTargetUrl(url);
      if (!resolved.includes('/api/proxy')) {
        rewrittenUrl = getProxiedUrl(resolved);
      }
    } catch (err) {}
    const restArgs = Array.prototype.slice.call(arguments, 2);
    return originalXhrOpen.apply(this, [method, rewrittenUrl, ...restArgs]);
  };

  // Monkey-patch window.location.assign and replace
  try {
    const originalAssign = window.location.assign ? window.location.assign.bind(window.location) : null;
    if (originalAssign) {
      window.location.assign = function(url) {
        const resolved = resolveTargetUrl(url);
        notifyNavigating(resolved);
        window.location.href = getProxiedUrl(resolved);
      };
    }
    const originalReplace = window.location.replace ? window.location.replace.bind(window.location) : null;
    if (originalReplace) {
      window.location.replace = function(url) {
        const resolved = resolveTargetUrl(url);
        notifyNavigating(resolved);
        window.location.replace(getProxiedUrl(resolved));
      };
    }
  } catch (err) {}

  // Monkey-patch window.open so popup links stay inside the isolated proxy viewport
  try {
    const originalOpen = window.open ? window.open.bind(window) : null;
    if (originalOpen) {
      window.open = function(url) {
        if (url) {
          const resolved = resolveTargetUrl(url);
          notifyNavigating(resolved);
          window.location.href = getProxiedUrl(resolved);
          return window;
        }
        return null;
      };
    }
  } catch (err) {}

  // Listen to popstate / history changes
  window.addEventListener('popstate', () => {
    notifyUrlActive();
    queueBroadcast('popstate');
  });

  console.log('[Isolated Browser Engine] Bridge Initialized for', currentTargetUrl);
})();
</script>
`;
}

// Safe helper to read request body stream without throwing 'stream is not readable'
async function readRequestBodyStream(req: express.Request): Promise<Buffer> {
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.length > 0) {
    return Buffer.from(req.body);
  }
  if (Buffer.isBuffer((req as any).rawBody) && (req as any).rawBody.length > 0) {
    return (req as any).rawBody;
  }
  if (req.readableEnded || !req.readable) {
    return Buffer.alloc(0);
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      const fullBuffer = Buffer.concat(chunks);
      (req as any).rawBody = fullBuffer;
      resolve(fullBuffer);
    });
    req.on("error", () => {
      resolve(Buffer.alloc(0));
    });
  });
}

// Core proxy fetch handler with automated redirect loop and cookie synchronization
async function handleProxyRequest(
  req: express.Request,
  res: express.Response,
  targetUrl: string,
  sessionId: string
) {
  let urlObj: URL;
  try {
    const normalizedUrl =
      targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
        ? targetUrl
        : `https://${targetUrl}`;
    urlObj = new URL(normalizedUrl);
  } catch (e) {
    return res.status(400).send(`
      <html>
        <body style="font-family:sans-serif;padding:2rem;background:#000000;color:#ffffff;">
          <h2>Invalid Web Address</h2>
          <p>Could not parse URL: <code>${targetUrl}</code></p>
        </body>
      </html>
    `);
  }

  try {
    let currentHopUrl = urlObj.href;
    let currentMethod = req.method.toUpperCase();
    let redirectHops = 0;
    const MAX_HOPS = 8;
    let finalResponse: any = null;
    let finalHopUrl = currentHopUrl;

    // Prepare raw POST/PUT/PATCH body safely if applicable
    const incomingContentType = req.headers["content-type"] || "";
    let requestBody: Buffer | undefined = undefined;
    if (currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH") {
      const buf = await readRequestBodyStream(req);
      if (buf.length > 0) {
        requestBody = buf;
      }
    }

    // Resolve target referer to avoid CSRF cross-origin blocks from CodeIgniter / PHP
    let lastReferer = urlObj.href;
    const incomingReferer = req.headers.referer as string | undefined;
    if (incomingReferer) {
      try {
        if (incomingReferer.includes("/api/proxy")) {
          const refUrl = new URL(incomingReferer);
          const targetInRef = refUrl.searchParams.get("url");
          if (targetInRef) {
            lastReferer = targetInRef;
          }
        } else {
          lastReferer = incomingReferer;
        }
      } catch (e) {}
    }

    while (redirectHops < MAX_HOPS) {
      const currentUrlObj = new URL(currentHopUrl);

      const outgoingHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Host": currentUrlObj.host,
        "Origin": currentUrlObj.origin,
        "Referer": lastReferer,
      };

      if (req.headers["x-requested-with"]) {
        outgoingHeaders["X-Requested-With"] = req.headers["x-requested-with"] as string;
      }

      // Add active cookies for this domain
      const cookieHeader = getCookiesForUrl(sessionId, currentUrlObj);
      if (cookieHeader) {
        outgoingHeaders["Cookie"] = cookieHeader;
      }

      if (currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH") {
        if (incomingContentType) {
          outgoingHeaders["Content-Type"] = incomingContentType;
        } else {
          outgoingHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        }
        if (requestBody && requestBody.length > 0) {
          outgoingHeaders["Content-Length"] = requestBody.length.toString();
        }
      }

      const fetchOptions: RequestInit = {
        method: currentMethod,
        headers: outgoingHeaders,
        body: currentMethod !== "GET" && currentMethod !== "HEAD" ? requestBody : undefined,
        redirect: "manual",
      };

      const response = await fetch(currentHopUrl, fetchOptions);

      // Store any cookies returned on this hop (critical for multi-step PHP / CodeIgniter sessions!)
      const setCookies: string[] =
        typeof (response.headers as any).getSetCookie === "function"
          ? (response.headers as any).getSetCookie()
          : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")!]
          : [];

      if (setCookies.length > 0) {
        storeSetCookies(sessionId, currentUrlObj, setCookies);
      }

      const status = response.status;
      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.get("location");
        if (location) {
          const nextHopUrl = new URL(location, currentHopUrl).href;
          const isAjax = Boolean(
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers["sec-fetch-mode"] === "cors" ||
            (req.headers["accept"] && req.headers["accept"].includes("application/json"))
          );

          if (!isAjax) {
            // Standard browser document navigation (form POST, link click) -> redirect iframe directly
            const proxiedRedirect = `/api/proxy?url=${encodeURIComponent(nextHopUrl)}&sessionId=${encodeURIComponent(sessionId)}`;
            return res.redirect(302, proxiedRedirect);
          } else {
            // Internal script fetch/XHR -> follow redirect hops internally
            lastReferer = currentHopUrl;
            currentHopUrl = nextHopUrl;
            finalHopUrl = nextHopUrl;

            // Convert POST to GET on 302/303 standard browser redirect behavior
            if (status === 302 || status === 303) {
              currentMethod = "GET";
              requestBody = undefined;
            }
            redirectHops++;
            continue;
          }
        }
      }

      finalResponse = response;
      finalHopUrl = currentHopUrl;
      break;
    }

    if (!finalResponse) {
      throw new Error("No response received from target website after following redirects.");
    }

    const contentType = finalResponse.headers.get("content-type") || "text/html";
    const finalUrlObj = new URL(finalHopUrl);

    // If it's HTML, inject base tag and bridge script with the final resolved URL
    if (contentType.includes("text/html")) {
      let htmlText = await finalResponse.text();

      // Rewrite any <meta http-equiv="refresh" content="... url=..."> tags to route through proxy
      htmlText = htmlText.replace(
        /<meta\s+[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,
        (metaTag) => {
          return metaTag.replace(/url\s*=\s*([^"'>;\s]+)/i, (match, rawUrl) => {
            try {
              const cleanUrl = rawUrl.replace(/['"]/g, "").trim();
              const resolved = new URL(cleanUrl, finalUrlObj.href).href;
              const proxied = `/api/proxy?url=${encodeURIComponent(resolved)}&sessionId=${encodeURIComponent(sessionId)}`;
              return `url=${proxied}`;
            } catch (e) {
              return match;
            }
          });
        }
      );

      // Check if document already has a <base ...> tag
      const hasExistingBase = /<base\s+[^>]*href=/i.test(htmlText);
      let baseTag = "";
      if (!hasExistingBase) {
        const properBase = computeProperBaseHref(finalUrlObj.href);
        baseTag = `<base href="${properBase}">`;
      }

      const bridgeScript = getInspectorBridgeScript(finalUrlObj.href, sessionId);

      const headRegex = /<head[^>]*>/i;
      const htmlRegex = /<html[^>]*>/i;
      if (headRegex.test(htmlText)) {
        htmlText = htmlText.replace(headRegex, (match) => `${match}\n${baseTag}\n${bridgeScript}`);
      } else if (htmlRegex.test(htmlText)) {
        htmlText = htmlText.replace(htmlRegex, (match) => `${match}\n<head>${baseTag}\n${bridgeScript}</head>`);
      } else {
        htmlText = `<head>${baseTag}\n${bridgeScript}</head>\n` + htmlText;
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Content-Security-Policy", "frame-ancestors *;");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("x-frame-options");
      res.removeHeader("Content-Security-Policy-Report-Only");
      res.removeHeader("content-security-policy-report-only");
      res.removeHeader("Cross-Origin-Embedder-Policy");
      res.removeHeader("Cross-Origin-Opener-Policy");
      res.removeHeader("Cross-Origin-Resource-Policy");
      return res.status(finalResponse.status).send(htmlText);
    } else {
      // Non-HTML content (images, fonts, stylesheets, scripts)
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("x-frame-options");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("content-security-policy");
      res.removeHeader("Content-Security-Policy-Report-Only");
      res.removeHeader("content-security-policy-report-only");
      res.removeHeader("Cross-Origin-Embedder-Policy");
      res.removeHeader("Cross-Origin-Opener-Policy");
      res.removeHeader("Cross-Origin-Resource-Policy");
      const buffer = await finalResponse.arrayBuffer();
      return res.status(finalResponse.status).send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error("[Proxy Error]", err);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Navigation Error - Isolated Browser</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #000000; color: #f1f5f9; padding: 2.5rem; }
          .card { background: #111111; border: 1px solid #262626; border-radius: 12px; padding: 2rem; max-width: 600px; margin: 0 auto; }
          h2 { color: #f87171; margin-top: 0; font-size: 1.2rem; }
          p { color: #888888; font-size: 0.9rem; line-height: 1.6; }
          code { background: #181818; padding: 3px 6px; border-radius: 4px; color: #38bdf8; font-family: monospace; font-size: 0.85rem; }
        </style>
        ${getInspectorBridgeScript(urlObj.href, sessionId)}
      </head>
      <body>
        <div class="card">
          <h2>Connection Issue</h2>
          <p>Could not load target address: <code>${urlObj.href}</code></p>
          <p style="color:#ef4444; font-size: 0.8rem;">Details: ${err.message || String(err)}</p>
        </div>
      </body>
      </html>
    `;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(502).send(errorHtml);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Session management: get cookies
  app.get("/api/sessions/:sessionId/cookies", (req, res) => {
    const { sessionId } = req.params;
    const jar = sessionCookieJars.get(sessionId);
    const result: Record<string, Record<string, string>> = {};
    if (jar) {
      for (const [dom, cookieMap] of jar.entries()) {
        result[dom] = {};
        for (const [k, v] of cookieMap.entries()) {
          result[dom][k] = v.value;
        }
      }
    }
    res.json({ sessionId, cookies: result });
  });

  // Session management: clear cookies
  app.post("/api/sessions/:sessionId/clear", (req, res) => {
    const { sessionId } = req.params;
    sessionCookieJars.delete(sessionId);
    res.json({ success: true, message: `Session ${sessionId} storage & cookies reset.` });
  });

  // Body parser for proxy endpoint (supports forms, JSON, multipart, binary)
  app.use("/api/proxy", express.raw({ type: "*/*", limit: "50mb" }));

  // Proxy Endpoint
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    const sessionId = (req.query.sessionId as string) || "persistent-user-session";

    if (!targetUrl) {
      return res.status(400).send(`
        <html>
          <body style="font-family:sans-serif;padding:2rem;background:#000000;color:#ffffff;">
            <h2>Isolated Browser Proxy</h2>
            <p>Please specify a <code>url</code> parameter.</p>
          </body>
        </html>
      `);
    }

    return handleProxyRequest(req, res, targetUrl, sessionId);
  });

  // Fallback Proxy Middleware for Subresources & Relative Links:
  // If browser requests /css/*, /images/*, /index.php/* with a Referer from /api/proxy?url=TARGET
  app.use(async (req, res, next) => {
    const referer = req.headers.referer;
    if (referer && referer.includes("/api/proxy")) {
      // Allow internal dev server modules to pass through to Vite
      if (
        req.path.startsWith("/api/") ||
        req.path.startsWith("/@") ||
        req.path.startsWith("/src/") ||
        req.path.startsWith("/node_modules/")
      ) {
        return next();
      }

      try {
        const refUrl = new URL(referer);
        const targetUrlParam = refUrl.searchParams.get("url");
        const sessionId = refUrl.searchParams.get("sessionId") || "persistent-user-session";
        if (targetUrlParam) {
          const targetObj = new URL(targetUrlParam);
          // Resolve requested path against target site origin
          const resolvedTarget = new URL(req.originalUrl, targetObj.origin).href;
          const isDocRequest = req.headers.accept?.includes("text/html") && !req.xhr;
          if (isDocRequest) {
            return res.redirect(302, `/api/proxy?url=${encodeURIComponent(resolvedTarget)}&sessionId=${encodeURIComponent(sessionId)}`);
          }
          return handleProxyRequest(req, res, resolvedTarget, sessionId);
        }
      } catch (err) {
        console.error("[Fallback Middleware Error]", err);
      }
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server Internal Error]", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Isolated Browser Engine] Server running on http://localhost:${PORT}`);
  });
}

startServer();
