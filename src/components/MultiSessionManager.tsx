import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Globe,
  ClipboardPaste,
  LogIn,
  Pickaxe
} from 'lucide-react';

export interface SessionTab {
  id: number; // 1, 2, 3...
  sessionId: string;
  url: string;
  title: string;
  isLoading: boolean;
}

interface MultiSessionManagerProps {
  onBackToBrowser: () => void;
  defaultUrl?: string;
}

const DEFAULT_FALLBACK_URL = 'https://eutechsmine.com/login';

export const MultiSessionManager: React.FC<MultiSessionManagerProps> = ({
  onBackToBrowser,
  defaultUrl = ''
}) => {
  const initialUrl = defaultUrl || DEFAULT_FALLBACK_URL;

  // 1. Tab Quantity Input State (default 10)
  const [tabQuantityInput, setTabQuantityInput] = useState<string>('10');

  // 2. Link Input State
  const [universalUrlInput, setUniversalUrlInput] = useState<string>(initialUrl);

  // 3. User & Pass System State
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [autofilledTabs, setAutofilledTabs] = useState<number[]>([]);
  const pendingAutofillsRef = useRef<Map<number, { username: string; password: string; autoSubmit: boolean }>>(new Map());

  // Active selected tab number (starts at 1)
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [isReloadingAll, setIsReloadingAll] = useState<boolean>(false);
  const [isSubmittingAll, setIsSubmittingAll] = useState<boolean>(false);
  const [isMiningAll, setIsMiningAll] = useState<boolean>(false);

  // All session tabs list - initialized with 10 tabs, only Tab 1 loads startUrl initially
  const [tabs, setTabs] = useState<SessionTab[]>(() => {
    const initialTabs: SessionTab[] = [];
    const baseKey = Date.now().toString(36);
    const startUrl = defaultUrl || DEFAULT_FALLBACK_URL;
    for (let i = 1; i <= 10; i++) {
      initialTabs.push({
        id: i,
        sessionId: `isolated_tab_${i}_${baseKey}`,
        url: i === 1 ? startUrl : '',
        title: `Tab ${i}`,
        isLoading: i === 1
      });
    }
    return initialTabs;
  });

  // Sync if defaultUrl changes from parent
  useEffect(() => {
    if (defaultUrl && defaultUrl !== universalUrlInput) {
      setUniversalUrlInput(defaultUrl);
    }
  }, [defaultUrl]);

  // Resolve URL helper
  const resolveTargetUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (!trimmed.includes(' ') && trimmed.includes('.')) {
      return `https://${trimmed}`;
    }
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
  };

  // 1. Tab Quantity Submit
  const handleGenerateTabs = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(tabQuantityInput, 10);
    if (isNaN(qty) || qty <= 0) return;

    const cappedQty = Math.min(Math.max(1, qty), 50);
    const baseKey = Date.now().toString(36);
    const newTabs: SessionTab[] = [];
    const targetUrl = resolveTargetUrl(universalUrlInput) || DEFAULT_FALLBACK_URL;

    for (let i = 1; i <= cappedQty; i++) {
      const existingTab = tabs.find((t) => t.id === i);
      const urlToUse = existingTab?.url || targetUrl;
      newTabs.push({
        id: i,
        sessionId: `isolated_tab_${i}_${baseKey}`,
        url: urlToUse,
        title: `Tab ${i}`,
        isLoading: true
      });
    }

    setTabs(newTabs);
    if (activeTabId > cappedQty) {
      setActiveTabId(1);
    }
  };

  // 2. Link Box Submit: Opens URL in all tabs
  const handleApplyUrlToAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const resolved = resolveTargetUrl(universalUrlInput);
    if (!resolved) return;

    setUniversalUrlInput(resolved);
    setTabs((prev) =>
      prev.map((tab) => ({
        ...tab,
        url: resolved,
        title: `Tab ${tab.id}`,
        isLoading: true
      }))
    );
  };

  // Reload all tabs concurrently in 1 click
  const handleReloadAllTabs = () => {
    setIsReloadingAll(true);
    setTabs((prev) =>
      prev.map((t) => (t.url ? { ...t, isLoading: true } : t))
    );

    tabs.forEach((tab) => {
      if (!tab.url) return;
      const iframe = document.getElementById(`multi-tab-frame-${tab.id}`) as HTMLIFrameElement | null;
      if (iframe) {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.location.reload();
          } else {
            throw new Error('No content window');
          }
        } catch {
          const proxySrc = getTabProxySrc(tab);
          if (proxySrc) {
            iframe.src = proxySrc;
          }
        }
      }
    });

    setBulkStatus(`✓ Reloading all ${tabs.length} tabs...`);
    setTimeout(() => {
      setIsReloadingAll(false);
    }, 1500);
    setTimeout(() => {
      setBulkStatus('');
    }, 4000);
  };

  // Trigger login button across all tabs in 1 click
  const handleTriggerAllLogin = () => {
    setIsSubmittingAll(true);
    setBulkStatus(`⚡ Triggering Login in all ${tabs.length} tabs...`);

    const triggerTabLogin = (tab: SessionTab) => {
      if (!tab.url) return;
      const iframe = document.getElementById(`multi-tab-frame-${tab.id}`) as HTMLIFrameElement | null;
      if (!iframe) return;

      // 1. Post message to bridge script inside iframe
      try {
        iframe.contentWindow?.postMessage(
          {
            type: 'TRIGGER_LOGIN_SUBMIT',
            sessionId: tab.sessionId
          },
          '*'
        );
      } catch (e) {}

      // 2. Direct DOM execution (same-origin fallback)
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const forms = Array.from(doc.querySelectorAll('form'));
          const loginForm = forms.find(
            (f) =>
              f.querySelector('input[type="password"]') ||
              f.querySelector('input[name*="user" i], input[name*="login" i], #user')
          ) || forms[0];

          if (loginForm) {
            // Trigger input & change events on inputs
            const inputs = Array.from(loginForm.querySelectorAll('input:not([type="hidden"])'));
            inputs.forEach((inp) => {
              try {
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
              } catch (e) {}
            });

            // Find submit button
            const specificBtn = loginForm.querySelector(
              'button.login_button_detail, button.log_in_button, button[name="login"], button.submit_btn_project1, button#login, button#btn-login, input[name="login"][type="submit"], button.btn-login, button[type="submit"], input[type="submit"]'
            ) as HTMLElement | null || doc.querySelector('button.login_button_detail, button[name="login"]') as HTMLElement | null;

            // Ensure name="login" is sent in POST payload
            const btnName = (specificBtn && specificBtn.getAttribute('name')) || 'login';
            if (btnName && !loginForm.querySelector(`input[type="hidden"][name="${btnName}"]`)) {
              try {
                const hidden = doc.createElement('input');
                hidden.type = 'hidden';
                hidden.name = btnName;
                hidden.value = (specificBtn && specificBtn.getAttribute('value')) || '1';
                loginForm.appendChild(hidden);
              } catch (e) {}
            }

            // Route form action to proxy
            const rawAction = loginForm.getAttribute('action') || '';
            const targetAction = rawAction
              ? new URL(rawAction, doc.baseURI || tab.url).href
              : (doc.baseURI || tab.url);
            const proxiedAction = `/api/proxy?url=${encodeURIComponent(targetAction)}&sessionId=${encodeURIComponent(tab.sessionId)}`;
            try {
              HTMLFormElement.prototype.setAttribute.call(loginForm, 'action', proxiedAction);
              HTMLFormElement.prototype.setAttribute.call(loginForm, 'target', '_self');
            } catch (e) {
              loginForm.setAttribute('action', proxiedAction);
            }

            // Submit form
            let submitted = false;
            if (specificBtn && typeof specificBtn.click === 'function') {
              try {
                specificBtn.click();
                submitted = true;
              } catch (e) {}
            }

            if (typeof (loginForm as any).requestSubmit === 'function' && specificBtn) {
              try {
                (loginForm as any).requestSubmit(specificBtn);
                submitted = true;
              } catch (e) {}
            }

            if (!submitted) {
              try {
                HTMLFormElement.prototype.submit.call(loginForm);
              } catch (e) {
                try { loginForm.submit(); } catch (e2) {}
              }
            }
          } else {
            const standaloneBtn = doc.querySelector(
              'button.login_button_detail, button.log_in_button, button[name="login"], button#login, input[name="login"][type="submit"]'
            ) as HTMLElement | null;
            if (standaloneBtn && typeof standaloneBtn.click === 'function') {
              standaloneBtn.click();
            }
          }
        }
      } catch (e) {}
    };

    // Stagger submission across tabs by 50ms to prevent browser network stall with 20 tabs
    tabs.forEach((tab, index) => {
      setTimeout(() => {
        triggerTabLogin(tab);
      }, index * 50);
    });

    // Gentle follow-up retry after 1.5s for any background tab that was delayed
    setTimeout(() => {
      tabs.forEach((tab, index) => {
        setTimeout(() => {
          triggerTabLogin(tab);
        }, index * 40);
      });
    }, 1400);

    setTimeout(() => {
      setIsSubmittingAll(false);
      setBulkStatus('✓ Login triggered across all tabs');
    }, Math.max(2000, tabs.length * 60 + 500));

    setTimeout(() => {
      setBulkStatus('');
    }, 5500);
  };

  // Trigger "START FREE MINING" button across all tabs in 1 click
  const handleTriggerAllMining = () => {
    setIsMiningAll(true);
    setBulkStatus(`⛏️ Triggering Start Free Mining in all ${tabs.length} tabs...`);

    const triggerTabMining = (tab: SessionTab) => {
      if (!tab.url) return;
      const iframe = document.getElementById(`multi-tab-frame-${tab.id}`) as HTMLIFrameElement | null;
      if (!iframe) return;

      // 1. Post message to bridge script inside iframe
      try {
        iframe.contentWindow?.postMessage(
          {
            type: 'TRIGGER_START_MINING',
            sessionId: tab.sessionId
          },
          '*'
        );
      } catch (e) {}

      // 2. Direct DOM execution (same-origin fallback)
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const isExcluded = (el: Element | null): boolean => {
            if (!el) return true;
            // STRICT: Never match links in sidebar navigation, menus, or income reports
            if (el.closest('.sidebar-wrapper, .metismenu, nav, .side-mobile-menu, header, footer, .main-menu')) return true;
            const href = (el.getAttribute('href') || '').toLowerCase();
            if (href.includes('income/details') || href.includes('source=') || href.includes('logout') || href.includes('register')) return true;
            return false;
          };

          let specificBtn: HTMLElement | null = null;

          // Check inside .mining_btn container first
          const container = doc.querySelector('.mining_btn');
          if (container) {
            specificBtn = container.querySelector('a.free-btn, a.btn-start-mining, a[href*="order_ids="], a') as HTMLElement | null;
          }

          // Live dot container inside free mining button
          if (!specificBtn || isExcluded(specificBtn)) {
            const liveDot = doc.querySelector('#liveDot, .live-dot');
            if (liveDot) {
              specificBtn = liveDot.closest('a, button') as HTMLElement | null;
            }
          }

          // Direct specific classes
          if (!specificBtn || isExcluded(specificBtn)) {
            const candidates = Array.from(
              doc.querySelectorAll('a.btn-start-mining.free-btn, a.free-btn, a[href*="order_ids="], a.btn-start-mining')
            );
            specificBtn = (candidates.find((el) => !isExcluded(el)) as HTMLElement | null) || null;
          }

          // Scan by text (Must strictly match "START FREE MINING" or "START MINING", never sidebar!)
          if (!specificBtn || isExcluded(specificBtn)) {
            const allElements = Array.from(doc.querySelectorAll('a, button, [role="button"]'));
            specificBtn = (allElements.find((el) => {
              if (isExcluded(el)) return false;
              const txt = (el.textContent || '').trim().toUpperCase();
              return txt.includes('START FREE MINING') || txt === 'START MINING';
            }) as HTMLElement | null) || null;
          }

          if (specificBtn && !isExcluded(specificBtn)) {
            try {
              specificBtn.click();
            } catch (e) {}

            const rawHref = specificBtn.getAttribute('href');
            if (rawHref && !rawHref.startsWith('javascript:') && !rawHref.startsWith('#')) {
              try {
                const targetResolved = new URL(rawHref, doc.baseURI || tab.url).href;
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetResolved)}&sessionId=${encodeURIComponent(tab.sessionId)}`;
                iframe.src = proxyUrl;
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };

    // Stagger execution across tabs by 50ms
    tabs.forEach((tab, index) => {
      setTimeout(() => {
        triggerTabMining(tab);
      }, index * 50);
    });

    // Follow-up check after 1.2s for background tabs
    setTimeout(() => {
      tabs.forEach((tab, index) => {
        setTimeout(() => {
          triggerTabMining(tab);
        }, index * 40);
      });
    }, 1200);

    setTimeout(() => {
      setIsMiningAll(false);
      setBulkStatus('✓ Free Mining triggered in all tabs');
    }, Math.max(1800, tabs.length * 60));

    setTimeout(() => {
      setBulkStatus('');
    }, 5500);
  };

  // Reload the active tab safely without re-rendering all other tabs
  const handleReloadActiveTab = () => {
    const iframe = document.getElementById(`multi-tab-frame-${activeTabId}`) as HTMLIFrameElement | null;
    if (iframe) {
      try {
        iframe.contentWindow?.location.reload();
      } catch {
        const currentTab = tabs.find((t) => t.id === activeTabId);
        if (currentTab && currentTab.url) {
          iframe.src = getTabProxySrc(currentTab) || '';
        }
      }
    }
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, isLoading: true } : t
      )
    );
  };

  // Switch tab and lazily populate URL if empty
  const handleSelectTab = (tabId: number) => {
    setActiveTabId(tabId);
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId && !t.url && universalUrlInput) {
          return {
            ...t,
            url: resolveTargetUrl(universalUrlInput) || DEFAULT_FALLBACK_URL,
            isLoading: true
          };
        }
        return t;
      })
    );
  };

  // Listen to postMessage from tabs
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.sessionId) return;
      const { sessionId, type, title, originalUrl, url } = event.data;

      // Handle URL changes and navigation completions
      if (type === 'BROWSER_URL_CHANGED') {
        const targetUrl = originalUrl || url;
        setTabs((prev) => {
          let hasChanges = false;
          const next = prev.map((t) => {
            if (t.sessionId === sessionId) {
              const newUrl = targetUrl || t.url;
              const newTitle = title && title !== 'Web Page' ? title : t.title;
              if (t.url !== newUrl || t.title !== newTitle || t.isLoading) {
                hasChanges = true;
                return {
                  ...t,
                  url: newUrl,
                  title: newTitle,
                  isLoading: false
                };
              }
            }
            return t;
          });
          return hasChanges ? next : prev;
        });
      }

      // Page loaded and bridge is ready inside iframe: send pending credentials immediately!
      if (type === 'PAGE_READY_FOR_AUTOFILL') {
        setTabs((prev) => {
          const foundTab = prev.find((t) => t.sessionId === sessionId);
          if (foundTab) {
            const pending = pendingAutofillsRef.current.get(foundTab.id);
            if (pending && (pending.username || pending.password)) {
              const iframe = document.getElementById(`multi-tab-frame-${foundTab.id}`) as HTMLIFrameElement | null;
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  {
                    type: 'AUTOFILL_CREDENTIALS',
                    username: pending.username,
                    password: pending.password,
                    autoSubmit: pending.autoSubmit
                  },
                  '*'
                );
              }
            }
          }
          return prev;
        });
      }

      // Autofill succeeded in target page
      if (type === 'AUTOFILL_RESULT') {
        setTabs((prev) => {
          const foundTab = prev.find((t) => t.sessionId === sessionId);
          if (foundTab && event.data && event.data.success) {
            setAutofilledTabs((old) => Array.from(new Set([...old, foundTab.id])));
          }
          return prev;
        });
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  const parseCredentialLine = (line: string) => {
    let user = '';
    let pass = '';
    const trimmed = line.trim();
    if (!trimmed) return { user, pass };

    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      user = parts[0].trim();
      pass = parts.slice(1).join(',').trim();
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      user = parts[0].trim();
      pass = parts.slice(1).join(':').trim();
    } else if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      user = parts[0].trim();
      pass = parts.slice(1).join('|').trim();
    } else if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      user = parts[0].trim();
      pass = parts.slice(1).join('\t').trim();
    } else {
      const parts = trimmed.split(/\s+/);
      user = parts[0]?.trim() || '';
      pass = parts.slice(1).join(' ').trim();
    }
    return { user, pass };
  };

  const sendAutofillToTab = (tabId: number, username: string, password: string) => {
    if (!username && !password) return;
    pendingAutofillsRef.current.set(tabId, {
      username,
      password,
      autoSubmit: false // strictly manual login as requested
    });

    setAutofilledTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));

    const postToTab = () => {
      const iframe = document.getElementById(`multi-tab-frame-${tabId}`) as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            {
              type: 'AUTOFILL_CREDENTIALS',
              username,
              password,
              autoSubmit: false
            },
            '*'
          );
        } catch (e) {}
      }
    };

    // Dispatch cleanly without stacking heavy timer cascades
    setTimeout(postToTab, 50);
    setTimeout(postToTab, 500);
  };

  const handleDistributeCredentials = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const targetUrl = resolveTargetUrl(universalUrlInput) || DEFAULT_FALLBACK_URL;
    const isSingleAccount = lines.length === 1;

    // Ensure tabs exist for all lines
    setTabs((prev) => {
      let nextTabs = [...prev];
      if (!isSingleAccount && lines.length > prev.length) {
        const baseKey = Date.now().toString(36);
        for (let i = prev.length + 1; i <= lines.length; i++) {
          nextTabs.push({
            id: i,
            sessionId: `sess-${i}-${baseKey}`,
            url: targetUrl,
            title: `Tab ${i}`,
            isLoading: true
          });
        }
        setTabQuantityInput(String(lines.length));
      }
      return nextTabs.map((t) => (!t.url ? { ...t, url: targetUrl, isLoading: true } : t));
    });

    if (isSingleAccount) {
      const { user, pass } = parseCredentialLine(lines[0]);
      tabs.forEach((tab) => {
        sendAutofillToTab(tab.id, user, pass);
      });
      setBulkStatus(`✓ Pasted to all tabs`);
    } else {
      lines.forEach((line, idx) => {
        const tabId = idx + 1;
        const { user, pass } = parseCredentialLine(line);
        sendAutofillToTab(tabId, user, pass);
      });
      setBulkStatus(`✓ Pasted to ${lines.length} tabs`);
    }

    setTimeout(() => setBulkStatus(''), 4000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setBulkText(clipText);
          handleDistributeCredentials(clipText);
          // Dismiss keyboard if open to prevent blink/lag
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          return;
        }
      }
    } catch (err) {}

    // Fallback if clipboard API permission is blocked: use current textarea content
    if (bulkText && bulkText.trim()) {
      handleDistributeCredentials(bulkText);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const getTabProxySrc = (tab: SessionTab) => {
    if (!tab.url) return undefined;
    return `/api/proxy?url=${encodeURIComponent(tab.url)}&sessionId=${encodeURIComponent(tab.sessionId)}`;
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="w-screen h-screen min-h-screen max-h-screen overflow-hidden bg-black text-white flex flex-col font-sans select-none">
      {/* 1. TOP HEADER: Back, Tab Qty, Link Input */}
      <header className="h-10 bg-black border-b border-neutral-900 px-3 flex items-center gap-2 shrink-0 z-40">
        {/* Back Button */}
        <button
          id="btn-back-to-browser"
          onClick={onBackToBrowser}
          className="h-7 px-2.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer shrink-0"
          title="Back to Browser"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
          <span>Back</span>
        </button>

        <div className="h-4 w-px bg-neutral-800 shrink-0" />

        {/* Tab Quantity Form */}
        <form onSubmit={handleGenerateTabs} className="flex items-center gap-1 shrink-0">
          <input
            id="input-tab-quantity"
            type="number"
            min="1"
            max="50"
            value={tabQuantityInput}
            onChange={(e) => setTabQuantityInput(e.target.value)}
            placeholder="Qty"
            className="w-14 h-7 bg-neutral-950 border border-neutral-800 rounded px-1.5 text-xs font-mono text-white text-center placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
            title="Enter Tab Quantity (e.g. 10)"
          />
          <button
            id="btn-create-tabs"
            type="submit"
            className="h-7 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-2 rounded text-xs font-mono cursor-pointer transition-colors shrink-0"
            title="Create Tabs"
          >
            Create
          </button>
        </form>

        <div className="h-4 w-px bg-neutral-800 shrink-0" />

        {/* Link Input Box */}
        <form onSubmit={handleApplyUrlToAll} className="flex-1 flex items-center gap-1 min-w-0">
          <input
            id="input-universal-link"
            type="text"
            value={universalUrlInput}
            onChange={(e) => setUniversalUrlInput(e.target.value)}
            placeholder="Enter link (e.g. https://eutechsmine.com/login2)"
            className="flex-1 min-w-0 h-7 bg-neutral-950 border border-neutral-800 rounded px-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
          />
          <button
            id="btn-open-all-tabs"
            type="submit"
            className="h-7 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-2.5 rounded text-xs font-mono cursor-pointer transition-colors shrink-0 whitespace-nowrap"
            title="Open link in all tabs"
          >
            Open in All
          </button>
        </form>
      </header>

      {/* 2. PASTE OPTION BAR (Directly below Header) */}
      <div className="h-10 bg-black border-b border-neutral-900 px-3 flex items-center justify-between gap-2.5 shrink-0 z-30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            id="btn-paste-bulk"
            type="button"
            onClick={handlePasteFromClipboard}
            className="h-7 px-3 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Paste user,pass lines from clipboard into tabs"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          <textarea
            id="bulk-credential-box"
            rows={1}
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDistributeCredentials(bulkText);
                e.currentTarget.blur();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (pasted) {
                e.preventDefault();
                setBulkText(pasted);
                handleDistributeCredentials(pasted);
                e.currentTarget.blur();
              }
            }}
            placeholder="EU035872,EU035872 (Line 1 to Tab 1, Line 2 to Tab 2...)"
            className="h-7 flex-1 max-w-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded px-2.5 py-1 text-xs font-mono text-neutral-100 placeholder-neutral-600 resize-none overflow-x-auto whitespace-pre leading-tight focus:outline-none transition-colors"
            title="Paste bulk user,pass lines here"
          />

          {bulkStatus && (
            <span className="text-[11px] font-mono text-emerald-400 font-medium shrink-0 animate-pulse">
              {bulkStatus}
            </span>
          )}
        </div>

        {/* Reload Controls: 1-Click Reload All Tabs & Single Tab Reload */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
          <button
            id="btn-reload-all-tabs"
            onClick={handleReloadAllTabs}
            className="h-7 px-2.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-700/80 flex items-center gap-1.5 cursor-pointer transition-all font-medium shadow-sm active:scale-95"
            title="1 click me sabhi tabs reload karein (Reload All Tabs)"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isReloadingAll ? 'animate-spin text-sky-400' : 'text-sky-300'}`}
            />
            <span className="text-[11px] font-semibold">Reload All ({tabs.length})</span>
          </button>

          <button
            id="btn-reload-active-tab"
            onClick={handleReloadActiveTab}
            className="h-7 px-2 rounded bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
            title={`Reload Tab ${activeTabId} only`}
          >
            <RotateCw
              className={`w-3 h-3 ${activeTab?.isLoading && !isReloadingAll ? 'animate-spin text-sky-400' : ''}`}
            />
            <span className="text-[11px]">Tab {activeTabId}</span>
          </button>
        </div>
      </div>

      {/* 3. TAB NUMBERS & ACTION ROW: LOGIN BUTTON DIRECTLY UNDER PASTE OPTION */}
      <div className="h-10 bg-black border-b border-neutral-900 px-3 flex items-center gap-2 overflow-x-auto scrollbar-thin shrink-0 z-20">
        {/* Login Button directly under Paste button: 1 tap triggers login in all tabs */}
        <button
          id="btn-login-all-tabs"
          type="button"
          onClick={handleTriggerAllLogin}
          disabled={isSubmittingAll}
          className="h-7 px-3 rounded bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-mono text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
          title="1 tap me sabhi tabs me Login button trigger karein (Trigger Login in All Tabs)"
        >
          <LogIn className={`w-3.5 h-3.5 ${isSubmittingAll ? 'animate-bounce' : ''}`} />
          <span>{isSubmittingAll ? 'Logging in...' : 'Login All'}</span>
        </button>

        {/* Mine Button right next to Login button: 1 tap triggers START FREE MINING in all tabs */}
        <button
          id="btn-mine-all-tabs"
          type="button"
          onClick={handleTriggerAllMining}
          disabled={isMiningAll}
          className="h-7 px-3 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
          title="1 tap me sabhi tabs me 'START FREE MINING' trigger karein (Trigger Start Free Mining in All Tabs)"
        >
          <Pickaxe className={`w-3.5 h-3.5 ${isMiningAll ? 'animate-bounce text-emerald-200' : ''}`} />
          <span>{isMiningAll ? 'Mining...' : 'Mine All'}</span>
        </button>

        <div className="h-4 w-px bg-neutral-800 shrink-0" />

        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isFilled = autofilledTabs.includes(tab.id);

          return (
            <button
              key={tab.id}
              id={`tab-number-box-${tab.id}`}
              onClick={() => handleSelectTab(tab.id)}
              className={`h-7 min-w-[38px] px-2.5 rounded flex items-center justify-center font-mono text-xs cursor-pointer border transition-all relative shrink-0 ${
                isActive
                  ? 'bg-neutral-800 text-white border-neutral-500 font-bold shadow-sm ring-1 ring-neutral-700'
                  : 'bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 border-neutral-850'
              }`}
              title={`Tab ${tab.id}: ${tab.url || 'Empty'}${isFilled ? ' (User & Pass Pasted)' : ''}`}
            >
              <span>{tab.id}</span>
              {isFilled && (
                <span
                  className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.9)]"
                  title="User & Pass Pasted"
                />
              )}
              {tab.isLoading && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. ACTIVE TAB VIEWPORT */}
      <main className="flex-1 min-h-0 bg-neutral-950 relative">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasUrl = Boolean(tab.url);

          return (
            <div
              key={tab.sessionId}
              className={`w-full h-full absolute inset-0 bg-white transition-opacity duration-150 ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              {/* Tab Loading Pill Overlay */}
              {tab.isLoading && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all">
                  <div className="flex items-center gap-2 bg-neutral-950/95 border border-neutral-800 px-3.5 py-1.5 rounded-full text-xs text-sky-400 font-mono shadow-2xl backdrop-blur-md">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Loading Tab {tab.id}...</span>
                  </div>
                </div>
              )}

              {hasUrl ? (
                <iframe
                  id={`multi-tab-frame-${tab.id}`}
                  key={tab.sessionId}
                  src={getTabProxySrc(tab)}
                  loading="eager"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
                  className="w-full h-full border-0 bg-white"
                  title={`Tab ${tab.id}`}
                  onLoad={() => {
                    setTabs((prev) =>
                      prev.map((t) =>
                        t.id === tab.id && t.isLoading ? { ...t, isLoading: false } : t
                      )
                    );
                    const pending = pendingAutofillsRef.current.get(tab.id);
                    if (pending && (pending.username || pending.password)) {
                      [100, 450, 1200, 2500].forEach((delay) => {
                        setTimeout(() => {
                          const iframe = document.getElementById(`multi-tab-frame-${tab.id}`) as HTMLIFrameElement | null;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage(
                              {
                                type: 'AUTOFILL_CREDENTIALS',
                                username: pending.username,
                                password: pending.password,
                                autoSubmit: pending.autoSubmit
                              },
                              '*'
                            );
                          }
                        }, delay);
                      });
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-mono text-neutral-200 mb-1">
                    Tab {tab.id} (Session {tab.sessionId.slice(-6)})
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mb-4 max-w-sm">
                    Enter a link above and click &quot;Open in All&quot; or choose a quick website below:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    <button
                      onClick={() => {
                        const url = 'https://eutechsmine.com/login';
                        setTabs((prev) =>
                          prev.map((t) =>
                            t.id === tab.id
                              ? { ...t, url, isLoading: true }
                              : t
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-800 cursor-pointer"
                    >
                      Eutechsmine Login
                    </button>
                    <button
                      onClick={() => {
                        const url = 'https://html.duckduckgo.com/html/';
                        setTabs((prev) =>
                          prev.map((t) =>
                            t.id === tab.id
                              ? { ...t, url, isLoading: true }
                              : t
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-800 cursor-pointer"
                    >
                      DuckDuckGo
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};
