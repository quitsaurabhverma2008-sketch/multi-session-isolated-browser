import { SandboxPreset } from '../types';

export const SANDBOX_PRESETS: SandboxPreset[] = [
  {
    id: 'nexusops',
    title: 'NexusOps Cloud (Auth & Dashboard)',
    description: 'Realistic SaaS platform. Experience live login transition to a full cloud infrastructure dashboard.',
    category: 'Cloud SaaS',
    initialUrl: 'sandbox://nexusops.cloud/login',
    iconName: 'Server',
    badge: 'Popular Demo'
  },
  {
    id: 'finbank',
    title: 'FinBank Secure Banking',
    description: 'Financial portal with 2FA authentication, account balance, wire transfers, and audit trails.',
    category: 'Fintech',
    initialUrl: 'sandbox://finbank.global/auth',
    iconName: 'ShieldCheck',
    badge: '2FA Flow'
  },
  {
    id: 'novacommerce',
    title: 'NovaCommerce Store & Checkout',
    description: 'Modern storefront with dynamic cart drawer, reactive item updates, and checkout flow.',
    category: 'E-Commerce',
    initialUrl: 'sandbox://novacommerce.shop',
    iconName: 'ShoppingBag',
    badge: 'Dynamic DOM'
  },
  {
    id: 'playground',
    title: 'Interactive Form & DOM Playground',
    description: 'Interactive playground with rich forms, counter, live modal dialogs, and real-time element toggles.',
    category: 'Developer Tool',
    initialUrl: 'sandbox://playground.local',
    iconName: 'Code',
    badge: 'Lab'
  }
];

export function getBridgeScriptCode(): string {
  return `
  <script id="__isolated_browser_bridge__">
  (function() {
    let lastHtml = '';
    let throttleTimeout = null;

    function reportDom(reason) {
      try {
        const html = document.documentElement ? document.documentElement.outerHTML : '';
        if (html === lastHtml && reason !== 'initial') return;
        lastHtml = html;

        const data = {
          type: 'BROWSER_DOM_MUTATION',
          reason: reason || 'mutation',
          url: window.location.href,
          title: document.title || 'Sandbox Window',
          timestamp: Date.now(),
          nodeCount: document.querySelectorAll('*').length,
          html: html,
          activeElement: document.activeElement ? (document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? '#' + document.activeElement.id : '')) : null
        };

        if (window.parent && window.parent !== window) {
          window.parent.postMessage(data, '*');
        }
      } catch (err) {
        console.error('DOM Bridge report error:', err);
      }
    }

    function queueReport(reason) {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      throttleTimeout = setTimeout(() => {
        reportDom(reason);
      }, 50);
    }

    if (window.MutationObserver) {
      const obs = new MutationObserver(() => queueReport('mutation'));
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }

    document.addEventListener('input', () => queueReport('input'), true);
    document.addEventListener('change', () => queueReport('change'), true);
    document.addEventListener('click', () => queueReport('click'), true);
    document.addEventListener('submit', () => queueReport('submit'), true);

    window.addEventListener('load', () => reportDom('initial'));
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      reportDom('initial');
    }
  })();
  </script>
  `;
}

/**
 * Generates the NexusOps SaaS Application HTML
 */
export function getNexusOpsHtml(view: 'login' | 'dashboard' = 'login'): string {
  const bridge = getBridgeScriptCode();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NexusOps Cloud Platform | ${view === 'login' ? 'Authentication' : 'Infrastructure Dashboard'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
    .pulse-dot { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  </style>
  ${bridge}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
  <div id="nexus-app" class="w-full min-h-screen flex flex-col">
    <!-- Navigation Bar -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
          N
        </div>
        <div>
          <span class="font-bold tracking-tight text-white text-base">NexusOps</span>
          <span class="text-xs text-indigo-400 font-mono ml-2 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">v2.4-prod</span>
        </div>
      </div>

      <div id="auth-status-badge" class="flex items-center space-x-3 text-xs">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot"></span>
          Cluster: US-East-1 (Operational)
        </span>
        <span id="session-display" class="text-slate-400 font-mono">Status: Guest</span>
      </div>
    </header>

    <!-- Main Content Container -->
    <main id="app-view-container" class="flex-1 flex items-center justify-center p-6">
      
      <!-- LOGIN VIEW -->
      <section id="login-view" class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold tracking-tight text-white">Sign In to Dashboard</h1>
          <p class="text-sm text-slate-400 mt-1">Authenticate into your isolated infrastructure cluster</p>
        </div>

        <form id="nexus-login-form" onsubmit="handleLoginSubmit(event)" class="space-y-4">
          <div>
            <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Work Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value="admin@nexusops.io" 
              required
              class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="password" class="text-xs font-semibold uppercase tracking-wider text-slate-300">Password</label>
              <a href="javascript:void(0)" onclick="alert('Password reset link sent to registered email in sandbox!')" class="text-xs text-indigo-400 hover:underline">Forgot?</a>
            </div>
            <input 
              type="password" 
              id="password" 
              name="password" 
              value="NexusEnterprise2026!" 
              required
              class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
            />
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" id="remember" checked class="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0" />
              <span>Remember in isolated session</span>
            </label>
            <span class="text-indigo-400 font-medium">RBAC Admin</span>
          </div>

          <button 
            type="submit" 
            id="btn-login" 
            class="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span id="btn-login-text">Sign In to Dashboard</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Test account prefilled</span>
          <button onclick="fillSecondaryDemo()" class="text-cyan-400 hover:underline font-mono">Use DevOps Lead &rarr;</button>
        </div>
      </section>

      <!-- DASHBOARD VIEW (Shown when authenticated) -->
      <section id="dashboard-view" class="w-full max-w-6xl hidden space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              AR
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 id="user-display-name" class="text-xl font-bold text-white">Alex Rivera</h2>
                <span class="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-medium">Cluster Admin</span>
              </div>
              <p id="user-email-display" class="text-xs text-slate-400 font-mono mt-0.5">admin@nexusops.io &bull; Session token active</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <button onclick="toggleDeployModal(true)" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-colors cursor-pointer">
              <span>+ Deploy Service</span>
            </button>
            <button onclick="handleLogout()" class="px-3.5 py-2 bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer">
              Logout
            </button>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span class="text-xs font-medium text-slate-400">Containers</span>
            <div class="flex items-baseline justify-between mt-1">
              <span id="metric-containers" class="text-2xl font-bold text-white font-mono">24/24</span>
              <span class="text-xs text-emerald-400 font-semibold">&uarr; 100% OK</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div class="bg-emerald-500 h-full rounded-full w-full"></div>
            </div>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span class="text-xs font-medium text-slate-400">CPU Compute</span>
            <div class="flex items-baseline justify-between mt-1">
              <span id="metric-cpu" class="text-2xl font-bold text-white font-mono">42.8%</span>
              <span class="text-xs text-slate-400 font-semibold">16 Cores</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div id="cpu-bar" class="bg-indigo-500 h-full rounded-full" style="width: 42.8%"></div>
            </div>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span class="text-xs font-medium text-slate-400">Memory Utilization</span>
            <div class="flex items-baseline justify-between mt-1">
              <span id="metric-mem" class="text-2xl font-bold text-white font-mono">8.4 GB</span>
              <span class="text-xs text-slate-400 font-semibold">of 32 GB</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div class="bg-cyan-500 h-full rounded-full" style="width: 26%"></div>
            </div>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span class="text-xs font-medium text-slate-400">P99 API Latency</span>
            <div class="flex items-baseline justify-between mt-1">
              <span class="text-2xl font-bold text-white font-mono">14.2 ms</span>
              <span class="text-xs text-emerald-400 font-semibold">&minus; 4ms</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div class="bg-amber-500 h-full rounded-full" style="width: 15%"></div>
            </div>
          </div>
        </div>

        <!-- Deployments Table -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 class="font-semibold text-sm text-white">Live Cluster Services</h3>
            <div class="flex items-center space-x-2">
              <button onclick="scaleCluster()" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg border border-slate-700 cursor-pointer">
                Simulate Load
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th class="px-6 py-3">SERVICE</th>
                  <th class="px-6 py-3">REPLICAS</th>
                  <th class="px-6 py-3">STATUS</th>
                  <th class="px-6 py-3">UPTIME</th>
                  <th class="px-6 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody id="services-table-body" class="divide-y divide-slate-800/60 font-sans">
                <tr class="hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-3.5 font-medium text-white flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    api-gateway-v2
                  </td>
                  <td class="px-6 py-3.5 font-mono text-slate-300">6 / 6 pods</td>
                  <td class="px-6 py-3.5"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">HEALTHY</span></td>
                  <td class="px-6 py-3.5 text-slate-400">14d 6h</td>
                  <td class="px-6 py-3.5 text-right">
                    <button onclick="restartService('api-gateway-v2')" class="text-indigo-400 hover:text-indigo-300 font-mono">Restart</button>
                  </td>
                </tr>
                <tr class="hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-3.5 font-medium text-white flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    auth-identity-svc
                  </td>
                  <td class="px-6 py-3.5 font-mono text-slate-300">4 / 4 pods</td>
                  <td class="px-6 py-3.5"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">HEALTHY</span></td>
                  <td class="px-6 py-3.5 text-slate-400">42d 1h</td>
                  <td class="px-6 py-3.5 text-right">
                    <button onclick="restartService('auth-identity-svc')" class="text-indigo-400 hover:text-indigo-300 font-mono">Restart</button>
                  </td>
                </tr>
                <tr class="hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-3.5 font-medium text-white flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                    billing-worker-async
                  </td>
                  <td class="px-6 py-3.5 font-mono text-slate-300">8 / 8 pods</td>
                  <td class="px-6 py-3.5"><span class="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">SYNCING</span></td>
                  <td class="px-6 py-3.5 text-slate-400">2d 18h</td>
                  <td class="px-6 py-3.5 text-right">
                    <button onclick="restartService('billing-worker-async')" class="text-indigo-400 hover:text-indigo-300 font-mono">Restart</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- DEPLOY MODAL (Dynamically appended to DOM when triggered) -->
      <div id="deploy-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 class="font-bold text-white text-base">Deploy Microservice</h4>
            <button onclick="toggleDeployModal(false)" class="text-slate-400 hover:text-white">&times;</button>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Image Repository</label>
            <input type="text" id="service-name-input" value="nexus/edge-caching:latest" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Target Replicas</label>
            <input type="number" id="service-replicas-input" value="3" min="1" max="10" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white" />
          </div>
          <div class="pt-2 flex justify-end space-x-2">
            <button onclick="toggleDeployModal(false)" class="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">Cancel</button>
            <button onclick="confirmDeployService()" class="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg text-xs">Deploy Container</button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    let isLogged = false;

    function handleLoginSubmit(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const btn = document.getElementById('btn-login');
      const btnText = document.getElementById('btn-login-text');
      
      btnText.innerText = 'Authenticating session...';
      btn.classList.add('opacity-75');

      setTimeout(() => {
        isLogged = true;
        document.title = 'NexusOps Cloud Platform | Dashboard (Live)';
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        document.getElementById('user-email-display').innerText = email + ' • Session token active';
        document.getElementById('session-display').innerText = 'Auth: Logged In';
        document.getElementById('auth-status-badge').className = 'flex items-center space-x-3 text-xs';
      }, 350);
    }

    function handleLogout() {
      isLogged = false;
      document.title = 'NexusOps Cloud Platform | Authentication';
      document.getElementById('dashboard-view').classList.add('hidden');
      document.getElementById('login-view').classList.remove('hidden');
      document.getElementById('session-display').innerText = 'Status: Guest';
      const btnText = document.getElementById('btn-login-text');
      const btn = document.getElementById('btn-login');
      btnText.innerText = 'Sign In to Dashboard';
      btn.classList.remove('opacity-75');
    }

    function fillSecondaryDemo() {
      document.getElementById('email').value = 'elena.rostova@nexusops.io';
      document.getElementById('password').value = 'LeadEngineer#2026';
    }

    function toggleDeployModal(show) {
      const modal = document.getElementById('deploy-modal');
      if (show) modal.classList.remove('hidden');
      else modal.classList.add('hidden');
    }

    function confirmDeployService() {
      const repo = document.getElementById('service-name-input').value;
      const replicas = document.getElementById('service-replicas-input').value;
      const tbody = document.getElementById('services-table-body');

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/30 transition-colors bg-indigo-950/20';
      tr.innerHTML = \`
        <td class="px-6 py-3.5 font-medium text-white flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-indigo-400 pulse-dot"></span>
          \${repo.split('/')[1] || repo}
        </td>
        <td class="px-6 py-3.5 font-mono text-slate-300">\${replicas} / \${replicas} pods</td>
        <td class="px-6 py-3.5"><span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">DEPLOYED</span></td>
        <td class="px-6 py-3.5 text-slate-400">Just now</td>
        <td class="px-6 py-3.5 text-right">
          <button onclick="this.closest('tr').remove()" class="text-rose-400 hover:underline font-mono">Remove</button>
        </td>
      \`;
      tbody.prepend(tr);
      toggleDeployModal(false);

      const countSpan = document.getElementById('metric-containers');
      if (countSpan) countSpan.innerText = '25/25';
    }

    function restartService(name) {
      alert('Triggered rolling restart for pod: ' + name);
    }

    function scaleCluster() {
      const cpu = document.getElementById('metric-cpu');
      const bar = document.getElementById('cpu-bar');
      const newVal = (Math.random() * 30 + 40).toFixed(1);
      cpu.innerText = newVal + '%';
      bar.style.width = newVal + '%';
    }
  </script>
</body>
</html>`;
}

/**
 * Generates the FinBank Banking Application HTML
 */
export function getFinBankHtml(): string {
  const bridge = getBridgeScriptCode();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FinBank Global | Secure Customer Portal</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  ${bridge}
</head>
<body class="bg-stone-100 text-stone-800 min-h-screen antialiased">
  <div class="min-h-screen flex flex-col">
    <nav class="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-emerald-950">
          $
        </div>
        <span class="font-serif font-bold text-lg tracking-wide">FinBank Private</span>
      </div>
      <div id="fin-auth-badge" class="text-xs bg-emerald-800/80 px-3 py-1 rounded-full border border-emerald-700">
        256-bit SSL Isolated Vault
      </div>
    </nav>

    <main class="flex-1 flex items-center justify-center p-6">
      <!-- LOGIN -->
      <div id="fin-login" class="w-full max-w-md bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
        <h2 class="text-xl font-serif font-bold text-stone-900 mb-1">Client Login</h2>
        <p class="text-xs text-stone-500 mb-6">Enter your isolated banking credentials</p>

        <form id="fin-form" onsubmit="handleFinLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-stone-600 mb-1">Account Number</label>
            <input type="text" id="acc-num" value="8820-4921-99" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono" required />
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-600 mb-1">Access PIN</label>
            <input type="password" id="acc-pin" value="7391" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono" required />
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-600 mb-1">2FA Security Token</label>
            <input type="text" id="acc-token" value="592-108" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono text-emerald-700 font-bold" required />
          </div>
          <button type="submit" id="btn-fin-login" class="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer">
            Authorize & Open Vault
          </button>
        </form>
      </div>

      <!-- DASHBOARD -->
      <div id="fin-dashboard" class="w-full max-w-4xl bg-white border border-stone-200 rounded-xl p-8 shadow-sm hidden space-y-6">
        <div class="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 class="text-xl font-serif font-bold text-stone-900">Vault Overview: Jonathan Vance</h2>
            <p class="text-xs text-stone-500">Account: 8820-4921-99 &bull; Premier Wealth</p>
          </div>
          <button onclick="handleFinLogout()" class="text-xs text-stone-500 hover:text-stone-900 border border-stone-300 px-3 py-1.5 rounded-lg cursor-pointer">
            Lock Vault (Sign Out)
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span class="text-xs font-medium text-emerald-800">Primary Checking</span>
            <div id="balance-display" class="text-3xl font-bold font-serif text-emerald-950 mt-1">$148,250.00</div>
            <span class="text-xs text-emerald-600 font-medium">Available for immediate wire</span>
          </div>
          <div class="p-5 bg-stone-50 border border-stone-200 rounded-xl">
            <span class="text-xs font-medium text-stone-600">Treasury Yield Fund</span>
            <div class="text-3xl font-bold font-serif text-stone-900 mt-1">$450,190.40</div>
            <span class="text-xs text-stone-500 font-medium">+4.85% APY locked</span>
          </div>
        </div>

        <!-- Wire transfer interaction -->
        <div class="border border-stone-200 rounded-xl p-5 bg-stone-50/50">
          <h4 class="text-sm font-bold text-stone-800 mb-3">Initiate Instant Domestic Wire</h4>
          <div class="grid grid-cols-3 gap-3">
            <input type="text" id="wire-recipient" placeholder="Recipient Name" value="Apex Capital Group" class="px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs" />
            <input type="number" id="wire-amount" placeholder="Amount ($)" value="2500" class="px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs" />
            <button onclick="executeWireTransfer()" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer">
              Send Wire
            </button>
          </div>
          <div id="wire-feedback" class="mt-3 text-xs text-emerald-700 hidden"></div>
        </div>

        <!-- Transactions -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Recent Transactions</h4>
          <ul id="transactions-list" class="divide-y divide-stone-100 text-xs">
            <li class="py-2.5 flex justify-between">
              <span class="font-medium text-stone-800">Direct Deposit - Corporate Dividend</span>
              <span class="text-emerald-600 font-mono font-semibold">+$12,500.00</span>
            </li>
            <li class="py-2.5 flex justify-between">
              <span class="font-medium text-stone-800">Wire: Zurich Tech AG</span>
              <span class="text-stone-700 font-mono">&minus;$4,200.00</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  </div>

  <script>
    let currentBalance = 148250;

    function handleFinLogin(e) {
      e.preventDefault();
      document.title = 'FinBank Global | Vault Dashboard';
      document.getElementById('fin-login').classList.add('hidden');
      document.getElementById('fin-dashboard').classList.remove('hidden');
    }

    function handleFinLogout() {
      document.title = 'FinBank Global | Secure Customer Portal';
      document.getElementById('fin-dashboard').classList.add('hidden');
      document.getElementById('fin-login').classList.remove('hidden');
    }

    function executeWireTransfer() {
      const recipient = document.getElementById('wire-recipient').value || 'Unknown';
      const amount = parseFloat(document.getElementById('wire-amount').value) || 0;
      if (amount <= 0) return;

      currentBalance -= amount;
      document.getElementById('balance-display').innerText = '$' + currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });

      const feedback = document.getElementById('wire-feedback');
      feedback.classList.remove('hidden');
      feedback.innerText = '✓ Successfully wired $' + amount.toLocaleString() + ' to ' + recipient;

      const list = document.getElementById('transactions-list');
      const li = document.createElement('li');
      li.className = 'py-2.5 flex justify-between bg-emerald-50/50 px-2 rounded';
      li.innerHTML = \`
        <span class="font-medium text-stone-800">Wire: \${recipient}</span>
        <span class="text-rose-600 font-mono font-semibold">-\$\${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      \`;
      list.prepend(li);
    }
  </script>
</body>
</html>`;
}

/**
 * Generates NovaCommerce Storefront HTML
 */
export function getNovaCommerceHtml(): string {
  const bridge = getBridgeScriptCode();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NovaCommerce | Modern Storefront</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  ${bridge}
</head>
<body class="bg-neutral-900 text-neutral-100 min-h-screen antialiased">
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-neutral-800 px-6 py-4 flex items-center justify-between bg-neutral-950">
      <div class="flex items-center space-x-2">
        <span class="w-3 h-3 rounded-full bg-violet-500"></span>
        <span class="font-bold text-lg tracking-wider">NOVA</span>
      </div>
      <button onclick="toggleCart()" class="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-full border border-neutral-700 flex items-center gap-2 cursor-pointer">
        <span>Cart</span>
        <span id="cart-counter" class="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold text-[10px]">0</span>
      </button>
    </header>

    <main class="flex-1 max-w-5xl mx-auto w-full p-6">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">Featured Hardware</h1>
        <p class="text-xs text-neutral-400 mt-1">Select products to watch DOM mutations live</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div class="h-36 rounded-xl bg-gradient-to-tr from-neutral-800 to-neutral-700 mb-4 flex items-center justify-center text-3xl">💻</div>
            <h3 class="font-bold text-white text-base">Titan Pro Display</h3>
            <p class="text-xs text-neutral-400 mt-1">32-inch 6K Retina OLED monitor with studio sound.</p>
          </div>
          <div class="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
            <span class="font-mono font-bold text-violet-400">$1,499</span>
            <button onclick="addToCart('Titan Pro Display', 1499)" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold cursor-pointer">+ Add to Cart</button>
          </div>
        </div>

        <div class="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div class="h-36 rounded-xl bg-gradient-to-tr from-neutral-800 to-neutral-700 mb-4 flex items-center justify-center text-3xl">⌨️</div>
            <h3 class="font-bold text-white text-base">Keychron Custom</h3>
            <p class="text-xs text-neutral-400 mt-1">Gasket mounted aluminum mechanical keyboard.</p>
          </div>
          <div class="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
            <span class="font-mono font-bold text-violet-400">$219</span>
            <button onclick="addToCart('Keychron Custom', 219)" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold cursor-pointer">+ Add to Cart</button>
          </div>
        </div>

        <div class="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div class="h-36 rounded-xl bg-gradient-to-tr from-neutral-800 to-neutral-700 mb-4 flex items-center justify-center text-3xl">🎧</div>
            <h3 class="font-bold text-white text-base">Spatial Audio Headset</h3>
            <p class="text-xs text-neutral-400 mt-1">Planar magnetic wireless studio headphones.</p>
          </div>
          <div class="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
            <span class="font-mono font-bold text-violet-400">$399</span>
            <button onclick="addToCart('Spatial Audio Headset', 399)" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold cursor-pointer">+ Add to Cart</button>
          </div>
        </div>
      </div>

      <!-- Cart Drawer -->
      <div id="cart-drawer" class="fixed right-0 top-0 bottom-0 w-80 bg-neutral-950 border-l border-neutral-800 p-6 shadow-2xl hidden flex-col z-50">
        <div class="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <h3 class="font-bold text-sm">Your Cart</h3>
          <button onclick="toggleCart()" class="text-neutral-400 hover:text-white">&times;</button>
        </div>
        <div id="cart-items" class="flex-1 overflow-y-auto space-y-3 text-xs">
          <p id="empty-cart-msg" class="text-neutral-500 text-center py-8">Your cart is empty.</p>
        </div>
        <div class="border-t border-neutral-800 pt-4 mt-4">
          <div class="flex justify-between font-bold text-sm mb-4">
            <span>Total:</span>
            <span id="cart-total" class="font-mono text-violet-400">$0.00</span>
          </div>
          <button onclick="alert('Order placed successfully in sandbox session!')" class="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs cursor-pointer">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </main>
  </div>

  <script>
    let cart = [];

    function toggleCart() {
      const drawer = document.getElementById('cart-drawer');
      if (drawer.classList.contains('hidden')) {
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
      } else {
        drawer.classList.add('hidden');
        drawer.classList.remove('flex');
      }
    }

    function addToCart(title, price) {
      cart.push({ title, price, id: Date.now() });
      updateCartUi();
      const drawer = document.getElementById('cart-drawer');
      drawer.classList.remove('hidden');
      drawer.classList.add('flex');
    }

    function updateCartUi() {
      document.getElementById('cart-counter').innerText = cart.length;
      const itemsContainer = document.getElementById('cart-items');
      const emptyMsg = document.getElementById('empty-cart-msg');
      
      if (cart.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        document.getElementById('cart-total').innerText = '$0.00';
        return;
      }

      if (emptyMsg) emptyMsg.classList.add('hidden');
      
      let total = 0;
      let html = '';
      cart.forEach((item, index) => {
        total += item.price;
        html += \`
          <div class="flex items-center justify-between p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg">
            <div>
              <div class="font-semibold text-white">\${item.title}</div>
              <div class="text-violet-400 font-mono">\$\${item.price}</div>
            </div>
            <button onclick="removeFromCart(\${index})" class="text-rose-400 hover:underline">Remove</button>
          </div>
        \`;
      });
      itemsContainer.innerHTML = html;
      document.getElementById('cart-total').innerText = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }

    function removeFromCart(index) {
      cart.splice(index, 1);
      updateCartUi();
    }
  </script>
</body>
</html>`;
}

/**
 * Generates Interactive Lab Playground HTML
 */
export function getPlaygroundHtml(): string {
  const bridge = getBridgeScriptCode();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DOM Mutation & Form Playground</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  ${bridge}
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-8 antialiased">
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="border-b border-slate-800 pb-4">
      <h1 class="text-2xl font-bold">Interactive DOM Playground</h1>
      <p class="text-xs text-slate-400 mt-1">Interact with controls below and watch the right pane update HTML code instantly.</p>
    </div>

    <!-- Live Counter -->
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
      <div>
        <h3 class="font-semibold text-sm">Reactive State Counter</h3>
        <p class="text-xs text-slate-400">Triggers element characterData and attribute mutations</p>
      </div>
      <div class="flex items-center space-x-3">
        <button onclick="decrement()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 font-mono font-bold text-white cursor-pointer">&minus;</button>
        <span id="counter-val" data-count="0" class="text-xl font-mono font-bold text-indigo-400 w-12 text-center">0</span>
        <button onclick="increment()" class="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-mono font-bold text-white cursor-pointer">+</button>
      </div>
    </div>

    <!-- Live Input Mirror -->
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-3">
      <h3 class="font-semibold text-sm">Real-time Keystroke Mirror</h3>
      <input 
        type="text" 
        id="mirror-input" 
        oninput="updateMirror(this.value)" 
        placeholder="Type anything here..." 
        class="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white" 
      />
      <div class="text-xs text-slate-400">
        Live Echo: <span id="mirror-output" class="text-cyan-400 font-semibold font-mono">None</span>
      </div>
    </div>

    <!-- Dynamic Element Injection -->
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-sm">Dynamic Tag Injection</h3>
        <button onclick="injectTag()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer">
          + Inject Tag Node
        </button>
      </div>
      <div id="injected-tags-container" class="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-900/50 rounded-lg border border-slate-800">
        <span class="text-xs text-slate-500 italic p-1">No nodes injected yet</span>
      </div>
    </div>
  </div>

  <script>
    let count = 0;
    let tagIdx = 1;

    function increment() {
      count++;
      document.getElementById('counter-val').innerText = count;
      document.getElementById('counter-val').setAttribute('data-count', count);
    }

    function decrement() {
      count--;
      document.getElementById('counter-val').innerText = count;
      document.getElementById('counter-val').setAttribute('data-count', count);
    }

    function updateMirror(val) {
      document.getElementById('mirror-output').innerText = val || 'None';
    }

    function injectTag() {
      const container = document.getElementById('injected-tags-container');
      if (tagIdx === 1) container.innerHTML = '';
      const badge = document.createElement('span');
      badge.id = 'badge-node-' + tagIdx;
      badge.className = 'px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-mono flex items-center gap-1.5';
      badge.innerHTML = 'node #' + tagIdx + ' <button onclick="this.parentElement.remove()" class="hover:text-rose-400">&times;</button>';
      container.appendChild(badge);
      tagIdx++;
    }
  </script>
</body>
</html>`;
}
