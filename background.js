// background.js - Visage Extension Background Worker
if (typeof browser === 'undefined') {
  var browser = globalThis.browser || globalThis.chrome;
}

browser.action.onClicked.addListener(async () => {
  const url = browser.runtime.getURL("dashboard.html");
  const tabs = await browser.tabs.query({ url });
  
  if (tabs.length > 0) {
    await browser.tabs.update(tabs[0].id, { active: true });
  } else {
    await browser.tabs.create({ url });
  }
});

function setupContextMenus() {
  if (!browser || !browser.contextMenus) return;
  const createMenus = () => {
    browser.contextMenus.create({
      id: "visage-search-selection",
      title: "Audit \"%s\" in Visage",
      contexts: ["selection"]
    });

    browser.contextMenus.create({
      id: "visage-add-link",
      title: "Save Link to Visage Exposure Log",
      contexts: ["link"]
    });

    browser.contextMenus.create({
      id: "visage-add-page",
      title: "Save Current Page to Visage Exposure Log",
      contexts: ["page"]
    });

    browser.contextMenus.create({
      id: "visage-open-dash",
      title: "Open Visage Privacy Workstation",
      contexts: ["page", "link"]
    });
  };

  try {
    const p = browser.contextMenus.removeAll();
    if (p && typeof p.then === 'function') {
      p.then(createMenus).catch(createMenus);
    } else {
      createMenus();
    }
  } catch (_) {
    createMenus();
  }
}

browser.runtime.onInstalled.addListener(setupContextMenus);
browser.runtime.onStartup.addListener(setupContextMenus);

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "visage-open-dash") {
    const url = browser.runtime.getURL("dashboard.html");
    const tabs = await browser.tabs.query({ url });
    if (tabs.length > 0) {
      await browser.tabs.update(tabs[0].id, { active: true });
    } else {
      await browser.tabs.create({ url });
    }
    return;
  }

  if (info.menuItemId === "visage-search-selection" && info.selectionText) {
    const selected = info.selectionText.trim();
    const queryParam = encodeURIComponent(selected);
    const url = browser.runtime.getURL(`dashboard.html?q=${queryParam}`);
    await browser.tabs.create({ url });
    return;
  }

  if (info.menuItemId === "visage-add-link" || info.menuItemId === "visage-add-page") {
    const targetUrl = info.linkUrl || info.pageUrl || (tab && tab.url);
    if (!targetUrl || targetUrl.startsWith("about:") || targetUrl.startsWith("moz-extension://") || targetUrl.startsWith("chrome://") || targetUrl.startsWith("chrome-extension://")) return;

    try {
      const data = await browser.storage.local.get(["auditLogs"]);
      const logs = data.auditLogs || [];

      // Deduplicate by URL
      if (!logs.some(l => l.url === targetUrl)) {
        logs.push({
          id: Date.now().toString(),
          target: tab?.title || "Captured Lead",
          category: "External Reference",
          url: targetUrl,
          status: "investigating",
          severity: "info",
          notes: `Discovered via browser context menu from "${(tab && tab.title) || 'webpage'}".`,
          timestamp: new Date().toISOString()
        });
        await browser.storage.local.set({ auditLogs: logs });

        // Provide temporary badge confirmation
        if (browser.action && browser.action.setBadgeText) {
          browser.action.setBadgeText({ text: "+1" });
          browser.action.setBadgeBackgroundColor({ color: "#8b5cf6" });
          setTimeout(() => {
            browser.action.setBadgeText({ text: "" });
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Failed to log finding from context menu:", err);
    }
  }
});

// Runtime message listener for multi-platform network probing
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), message.timeout || 4000);

    fetch(message.url, {
      method: message.method || 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        ...(message.headers || {})
      },
      redirect: 'follow',
      signal: controller.signal
    })
      .then(async (resp) => {
        clearTimeout(timeout);
        let text = '';
        try {
          // Read up to first 64KB of body for error/presence signature verification
          const reader = resp.body.getReader();
          let bytesRead = 0;
          const chunks = [];
          while (bytesRead < 65536) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            bytesRead += value.length;
          }
          const blob = new Blob(chunks);
          text = await blob.text();
        } catch (_) {
          try {
            text = await resp.text();
          } catch (__) {}
        }

        sendResponse({
          ok: true,
          status: resp.status,
          redirected: resp.redirected,
          url: resp.url,
          bodySnippet: text.slice(0, 10000)
        });
      })
      .catch((err) => {
        clearTimeout(timeout);
        sendResponse({ ok: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }
});
