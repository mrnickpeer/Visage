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
      title: "Investigate \"%s\" in Visage",
      contexts: ["selection"]
    });

    browser.contextMenus.create({
      id: "visage-add-link",
      title: "Send Link to Visage Dossier",
      contexts: ["link"]
    });

    browser.contextMenus.create({
      id: "visage-add-page",
      title: "Send Current Page to Visage Dossier",
      contexts: ["page"]
    });

    browser.contextMenus.create({
      id: "visage-open-dash",
      title: "Open Visage Workstation",
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
