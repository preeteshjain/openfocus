(() => {
  if (window.__openfocusLoaded) return;
  window.__openfocusLoaded = true;

  const token = Math.random().toString(36).slice(2);
  const HIDE_ID = `openfocus-hide-${token}`;
  const PERIODIC_MS = 60000;
  const HEARTBEAT_MS = 15000;

  let overlay = null;
  let current = null;
  let counted = false;
  let dead = false;
  let checking = false;
  let pending = false;
  let wantHidden = false;
  let recheckTimer = null;
  let heartbeatTimer = null;
  let mediaTimer = null;
  let lastHref = location.href;

  const COVER_ID = `openfocus-cover-${token}`;

  // The page stays invisible until the background answers, so a feed never flashes on screen.
  // visibility:hidden alone still paints the page background on the canvas, so an opaque cover
  // sits on top as well.
  function hidePage() {
    wantHidden = true;
    if (!document.getElementById(HIDE_ID)) {
      const style = document.createElement("style");
      style.id = HIDE_ID;
      style.textContent = "html{visibility:hidden!important;overflow:hidden!important}";
      document.documentElement.append(style);
    }
    if (!document.getElementById(COVER_ID)) {
      const cover = document.createElement("openfocus-cover");
      cover.id = COVER_ID;
      cover.style.cssText =
        "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483646!important;display:block!important;visibility:visible!important;color-scheme:light dark!important;background:Canvas!important;pointer-events:auto!important;";
      document.documentElement.append(cover);
    }
  }

  function revealPage() {
    wantHidden = false;
    document.getElementById(HIDE_ID)?.remove();
    document.getElementById(COVER_ID)?.remove();
  }

  function pauseMedia() {
    for (const media of document.querySelectorAll("video, audio")) {
      try {
        if (!media.paused) media.pause();
      } catch {}
    }
  }

  const onPlay = (e) => {
    if (current && e.target instanceof HTMLMediaElement) e.target.pause();
  };

  // Key events are composed, so they would bubble out of the overlay to page shortcuts.
  // Stopping them here keeps default actions (typing, Tab, Enter on buttons) working.
  const keyGuard = (e) => {
    if (current) e.stopImmediatePropagation();
  };

  const wheelGuard = (e) => {
    if (current && e.target !== overlay?.host) e.preventDefault();
  };

  function guardOn() {
    document.addEventListener("play", onPlay, true);
    pauseMedia();
    clearInterval(mediaTimer);
    mediaTimer = setInterval(pauseMedia, 500);
  }

  function guardOff() {
    document.removeEventListener("play", onPlay, true);
    clearInterval(mediaTimer);
  }

  for (const type of ["keydown", "keyup", "keypress"]) window.addEventListener(type, keyGuard, true);
  window.addEventListener("wheel", wheelGuard, { capture: true, passive: false });
  window.addEventListener("touchmove", wheelGuard, { capture: true, passive: false });

  const observer = new MutationObserver(() => {
    if (overlay?.isAlive() && !overlay.host.isConnected) document.documentElement.append(overlay.host);
    if (wantHidden && (!document.getElementById(HIDE_ID) || !document.getElementById(COVER_ID))) hidePage();
  });
  observer.observe(document.documentElement, { childList: true });

  function shutdown() {
    dead = true;
    clearTimeout(recheckTimer);
    clearInterval(heartbeatTimer);
    guardOff();
    overlay?.destroy();
    overlay = null;
    revealPage();
    observer.disconnect();
  }

  async function send(message) {
    if (dead) return null;
    if (!chrome.runtime?.id) {
      shutdown();
      return null;
    }
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      if (!chrome.runtime?.id) shutdown();
      return null;
    }
  }

  function scheduleRecheck(at) {
    clearTimeout(recheckTimer);
    const delay = at ? Math.min(Math.max(at - Date.now(), 500), PERIODIC_MS) : PERIODIC_MS;
    recheckTimer = setTimeout(check, delay);
  }

  function startHeartbeat(siteId) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (overlay || document.visibilityState !== "visible") return;
      send({ type: "usage", siteId, seconds: HEARTBEAT_MS / 1000 });
    }, HEARTBEAT_MS);
  }

  function removeOverlay() {
    overlay?.destroy();
    overlay = null;
    current = null;
    guardOff();
  }

  function isHard(res) {
    return res.action === "block" || res.action === "limit";
  }

  // A pause runs only while its tab is in view. A tab opened in the background waits for you,
  // and a pause you leave halfway starts over when you come back. The try counts once.
  function mountOverlay() {
    const res = current;
    if (!isHard(res) && document.visibilityState !== "visible") return;
    const first = !counted;
    counted = true;
    overlay = globalThis.OpenFocusOverlay.mount({
      data: res,
      token,
      onShown: first ? () => send({ type: "shown", siteId: res.siteId, hard: isHard(res) }) : null,
      onExit: () => send({ type: "exit", siteId: res.siteId, hard: isHard(res) }),
      onContinue: async (payload) => {
        const granted = await send({ type: "continue", siteId: res.siteId, ...payload });
        const leaving = overlay;
        overlay = null;
        current = null;
        guardOff();
        revealPage();
        await leaving?.leave();
        startHeartbeat(res.siteId);
        scheduleRecheck(granted?.recheckAt);
      }
    });
  }

  function showOverlay(res) {
    removeOverlay();
    hidePage();
    guardOn();
    current = res;
    counted = false;
    clearInterval(heartbeatTimer);
    mountOverlay();
    if (isHard(res)) scheduleRecheck(res.until + 1000);
    else clearTimeout(recheckTimer);
  }

  function setAside() {
    if (!overlay || isHard(current)) return;
    overlay.destroy();
    overlay = null;
  }

  function apply(res) {
    if (res.action === "none") {
      removeOverlay();
      revealPage();
      clearInterval(heartbeatTimer);
      clearTimeout(recheckTimer);
      return;
    }
    if (res.action === "allow") {
      removeOverlay();
      revealPage();
      startHeartbeat(res.siteId);
      scheduleRecheck(res.recheckAt);
      return;
    }
    const same = current && current.action === res.action && current.siteId === res.siteId;
    if (same && overlay?.isAlive()) {
      if (isHard(res)) scheduleRecheck(res.until + 1000);
      return;
    }
    if (same && !overlay) {
      mountOverlay();
      return;
    }
    showOverlay(res);
  }

  async function check() {
    if (dead) return;
    if (checking) {
      pending = true;
      return;
    }
    checking = true;
    let res = await send({ type: "check", url: location.href });
    if (!res && !dead) {
      await new Promise((r) => setTimeout(r, 400));
      res = await send({ type: "check", url: location.href });
    }
    checking = false;
    if (dead) return;
    if (!res || res.action === "error") {
      if (!current) revealPage();
      else if (!overlay) mountOverlay();
      scheduleRecheck();
    } else {
      apply(res);
    }
    if (pending) {
      pending = false;
      check();
    }
  }

  setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    check();
  }, 800);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") setAside();
    else if (!overlay) check();
  });

  // A page Chrome loads ahead of time stays hidden until you go to it.
  document.addEventListener("prerenderingchange", () => {
    if (!overlay) check();
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) check();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "recheck") check();
  });

  hidePage();
  check();
})();
