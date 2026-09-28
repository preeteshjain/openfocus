(() => {
  if (globalThis.OpenFocusOverlay) return;

  const EASE_BREATH = "cubic-bezier(0.37, 0, 0.63, 1)";
  const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

  // Breath pattern: in for a third, hold for a sixth, out for half. The long exhale is the calming part.
  const INHALE = 1 / 3;
  const HOLD = 1 / 6;
  const EXHALE = 1 / 2;

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .us-root {
      --bg: #f4efe4;
      --ink: #1d2a22;
      --ink-2: #45554b;
      --ink-3: #7f8a82;
      --accent: #1f5c43;
      --accent-hover: #174a35;
      --on-accent: #fdfaf2;
      --line: #ddd5c4;
      --field: #fffdf8;
      --ring-track: rgba(31, 92, 67, 0.14);
      --ring: #1f5c43;
      --orb: radial-gradient(circle at 36% 30%, #fbe2b4 0%, #f0b262 32%, #d9812b 66%, #b8621c 100%);
      --glow: rgba(224, 137, 43, 0.45);
      --tide: linear-gradient(to top right, #1f3d2e 0%, #2f6b4f 55%, #8fb89b 100%);
      --serif: ui-serif, "New York", "Iowan Old Style", Charter, Georgia, serif;
      position: fixed;
      inset: 0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      -webkit-font-smoothing: antialiased;
      line-height: 1.45;
      text-align: center;
      user-select: none;
      outline: none;
    }
    @media (prefers-color-scheme: dark) {
      .us-root {
        --bg: #0f1a14;
        --ink: #eef3ee;
        --ink-2: #c1ccc4;
        --ink-3: #85938a;
        --accent: #7cc6a0;
        --accent-hover: #93d3b1;
        --on-accent: #0f1a14;
        --line: #26382d;
        --field: #17241c;
        --ring-track: rgba(124, 198, 160, 0.16);
        --ring: #7cc6a0;
        --glow: rgba(224, 137, 43, 0.35);
        --tide: linear-gradient(to top right, #0b2418 0%, #1f5a40 55%, #5f9c7c 100%);
      }
    }
    [hidden] { display: none !important; }
    .us-bg { position: absolute; inset: 0; background: var(--bg); }
    .us-stage { position: absolute; inset: 0; }

    .us-brand {
      position: absolute;
      top: 22px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--ink-3);
    }
    .us-brand i { width: 10px; height: 10px; border-radius: 50%; background: var(--orb); display: inline-block; }

    .us-msg {
      position: absolute;
      top: 13%;
      left: 0;
      right: 0;
      margin: 0 auto;
      width: min(520px, 88vw);
      font-family: var(--serif);
      font-size: clamp(22px, 2.8vw, 30px);
      font-weight: 500;
      line-height: 1.25;
      letter-spacing: -0.01em;
      opacity: 0;
    }

    .us-orb-wrap {
      --size: min(50vmin, 380px);
      position: absolute;
      top: 47%;
      left: 50%;
      width: var(--size);
      height: var(--size);
      transform: translate(-50%, -50%);
    }
    .us-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
    .us-ring circle { fill: none; stroke-width: 2.5; }
    .us-ring .track { stroke: var(--ring-track); }
    .us-ring .prog { stroke: var(--ring); stroke-linecap: round; }
    .us-glow, .us-orb {
      position: absolute;
      inset: 14%;
      border-radius: 50%;
      transform: scale(0.6);
      will-change: transform;
    }
    .us-glow { background: var(--glow); filter: blur(40px); opacity: 0.6; }
    .us-orb { background: var(--orb); box-shadow: inset -10px -16px 40px rgba(120, 50, 10, 0.25); }
    .us-phase {
      position: absolute;
      top: calc(47% + min(25vmin, 190px) + 22px);
      left: 0;
      right: 0;
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--ink-2);
      min-height: 26px;
    }

    .us-decide {
      position: absolute;
      top: 44%;
      left: 0;
      right: 0;
      margin: 0 auto;
      width: min(600px, 92vw);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .us-title {
      margin: 0;
      font-family: var(--serif);
      font-size: clamp(26px, 3.4vw, 38px);
      font-weight: 500;
      letter-spacing: -0.015em;
      line-height: 1.15;
      max-width: 600px;
    }
    .us-sub { margin: 0; font-size: 16px; color: var(--ink-2); max-width: 520px; }
    .us-small { margin: 0; font-size: 14px; color: var(--ink-3); }

    .us-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 18px; }
    .us-primary, .us-secondary {
      appearance: none;
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      height: 50px;
      padding: 0 26px;
      border-radius: 12px;
      cursor: pointer;
      transition: background-color 160ms ease, border-color 160ms ease, transform 120ms ease-out, opacity 160ms ease;
    }
    .us-primary { border: 0; background: var(--accent); color: var(--on-accent); }
    .us-primary:hover { background: var(--accent-hover); }
    .us-secondary { border: 1.5px solid var(--line); background: transparent; color: var(--ink); }
    .us-secondary:hover { border-color: var(--ink-3); }
    .us-primary:active, .us-secondary:active { transform: scale(0.97); }
    .us-secondary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .us-primary:focus-visible, .us-secondary:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }


    .us-panel {
      position: absolute;
      inset: 0;
      background: var(--tide);
      transform: translateY(100%);
      will-change: transform;
    }
    .us-tide-msg {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      margin: 0 auto;
      transform: translateY(-50%);
      width: min(460px, 88vw);
      font-family: var(--serif);
      font-size: clamp(26px, 3.4vw, 38px);
      font-weight: 500;
      line-height: 1.2;
      letter-spacing: -0.015em;
      opacity: 0;
    }
    .us-tide-result {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px 16px;
    }
    .us-count {
      font-family: var(--serif);
      font-size: clamp(72px, 10vw, 112px);
      font-weight: 500;
      line-height: 1;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }
    .us-count-label { margin: 0 0 18px; font-size: 15px; color: var(--ink-3); }

    .us-picker { display: flex; flex-direction: column; align-items: center; gap: 12px; width: min(460px, 88vw); margin-top: 6px; }
    .us-pick-value { font-family: var(--serif); font-size: 46px; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; }
    .us-range {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      margin: 10px 0 0;
      border-radius: 3px;
      background: linear-gradient(to right, var(--accent) var(--fill, 0%), var(--line) var(--fill, 0%));
      outline: none;
      cursor: pointer;
    }
    .us-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--field);
      border: 2px solid var(--accent);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
      cursor: grab;
      transition: transform 120ms ease-out;
    }
    .us-range:active::-webkit-slider-thumb { transform: scale(1.08); cursor: grabbing; }
    .us-range:focus-visible { outline: 2px solid var(--accent); outline-offset: 8px; }
    .us-scale { width: 100%; display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-3); }

    .us-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 72px 16px 48px;
      gap: 14px;
    }
    .us-mini {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--orb);
      box-shadow: 0 0 40px var(--glow);
      margin-bottom: 8px;
    }
    .us-mini.rest { filter: saturate(0.25) brightness(0.9); box-shadow: none; }
    .us-code {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: clamp(20px, 2.6vw, 28px);
      letter-spacing: 0.16em;
      padding: 14px 22px;
      border-radius: 12px;
      background: var(--field);
      border: 1.5px dashed var(--line);
      max-width: 92vw;
      overflow-wrap: anywhere;
    }
    .us-code .ok { color: var(--accent); }
    .us-input, .us-textarea {
      width: min(520px, 90vw);
      font: inherit;
      font-size: 18px;
      color: var(--ink);
      background: var(--field);
      border: 1.5px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      outline: none;
      user-select: text;
      transition: border-color 160ms ease;
    }
    .us-input { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: 0.12em; text-align: center; }
    .us-textarea { min-height: 120px; resize: none; text-align: left; line-height: 1.5; }
    .us-input:focus, .us-textarea:focus { border-color: var(--accent); }
  `;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatAgo(ts) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `${hrs.toLocaleString()} ${hrs === 1 ? "hr" : "hrs"} ago`;
    return `${Math.floor(hrs / 24).toLocaleString()} days ago`;
  }

  function formatLeft(until) {
    const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));
    if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function clock(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function mount(opts) {
    const data = opts.data;
    const site = data.siteName;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    const timers = new Set();

    const host = document.createElement("openfocus-shield");
    host.setAttribute("data-openfocus", opts.token || "preview");
    host.style.cssText =
      "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = el("style");
    style.textContent = CSS;
    const root = el("div", "us-root");
    root.tabIndex = -1;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", `OpenFocus pause for ${site}`);
    const bg = el("div", "us-bg");
    const stage = el("div", "us-stage");
    root.append(bg, stage);
    shadow.append(style, root);
    (opts.parent || document.documentElement).append(host);

    const brand = el("div", "us-brand");
    brand.append(el("i"), document.createTextNode(opts.preview ? "OpenFocus preview (Esc to close)" : "OpenFocus"));
    stage.append(brand);

    function wait(ms) {
      return new Promise((resolve) => {
        const id = setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });
    }

    function fadeIn(node, delay = 0) {
      node.hidden = false;
      const frames = reduceMotion
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0)" }
          ];
      node.animate(frames, { duration: 360, delay, easing: EASE_OUT, fill: "both" });
    }

    function finish(payload) {
      if (alive) opts.onContinue?.(payload || {});
    }

    function leaveButton(label) {
      const btn = el("button", "us-primary", label || `Leave ${site}`);
      btn.type = "button";
      btn.addEventListener("click", () => alive && opts.onExit?.());
      return btn;
    }

    function openButton() {
      const btn = el("button", "us-secondary", `Open ${site} anyway`);
      btn.type = "button";
      return btn;
    }

    // Always starts at 1 minute. Picking a time and pressing Open are two separate steps on purpose.
    function timePicker(max) {
      const limit = Math.max(1, Number(max) || 15);
      const picker = el("div", "us-picker");
      const value = el("div", "us-pick-value");
      const range = el("input", "us-range");
      range.type = "range";
      range.min = "1";
      range.max = String(limit);
      range.step = "1";
      range.value = "1";
      range.setAttribute("aria-label", `Minutes on ${site}`);
      const scale = el("div", "us-scale");
      scale.append(el("span", null, "1 min"), el("span", null, `${limit} min`));
      const open = el("button", "us-secondary");
      open.type = "button";
      const sync = () => {
        const m = Number(range.value);
        const label = `${m} ${m === 1 ? "min" : "mins"}`;
        value.textContent = label;
        open.textContent = `Open ${site} for ${label}`;
        range.style.setProperty("--fill", limit === 1 ? "100%" : `${((m - 1) / (limit - 1)) * 100}%`);
        range.setAttribute("aria-valuetext", label);
      };
      range.addEventListener("input", sync);
      open.addEventListener("click", () => finish({ minutes: Number(range.value) }));
      sync();
      picker.append(value, range, scale);
      const actions = el("div", "us-actions");
      actions.append(leaveButton(), open);
      return { picker, actions };
    }

    function lastVisitLine() {
      return data.lastUse ? `Your last visit was ${formatAgo(data.lastUse)}.` : "This would be your first visit.";
    }

    // Rising Tide: the wave covers the screen for 47% of the pause, rests for 5%, and sinks for 46%.
    async function runTide() {
      const total = Math.max(3, Number(data.duration) || 20) * 1000;
      const rise = total * 0.47;
      const hold = total * 0.05;
      const fall = total * 0.46;

      const msg = el(
        "p",
        "us-tide-msg",
        data.reason === "timeup" ? `Time for a check-in on ${site}. One slow breath first.` : data.tideText || "Let’s take one slow, deep breath."
      );
      const result = el("div", "us-tide-result");
      result.hidden = true;
      result.append(
        el("div", "us-count", String(data.attempts ?? 1)),
        el("p", "us-count-label", `${(data.attempts ?? 1) === 1 ? "try" : "tries"} to open ${site} in the past 24 hours`),
        el("h1", "us-title", data.reason === "timeup" ? `Your time on ${site} is up` : `Still want to open ${site}?`),
        el("p", "us-sub", lastVisitLine())
      );
      let first;
      let second;
      if (data.askMax) {
        const t = timePicker(data.askMax);
        first = t.picker;
        second = t.actions;
      } else {
        const go = openButton();
        go.addEventListener("click", () => finish());
        first = el("div", "us-actions");
        first.append(leaveButton(), go);
        second = null;
      }
      // Hidden with visibility so the layout does not jump when the buttons fade in.
      const reveal = (node) => {
        node.style.visibility = "";
        fadeIn(node);
      };
      first.style.visibility = "hidden";
      result.append(first);
      if (second) {
        second.style.visibility = "hidden";
        result.append(second);
      }
      const panel = el("div", "us-panel");
      stage.append(msg, result, panel);

      const up = reduceMotion
        ? [{ opacity: 0, transform: "none" }, { opacity: 1, transform: "none" }]
        : [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }];
      const down = [...up].reverse();

      msg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 150, easing: "ease", fill: "forwards" });
      await wait(650);
      if (!alive) return;
      await panel.animate(up, { duration: rise, easing: EASE_BREATH, fill: "forwards" }).finished.catch(() => {});
      if (!alive) return;
      msg.hidden = true;
      result.hidden = false;
      await wait(hold);
      if (!alive) return;
      const sinking = panel.animate(down, { duration: fall, easing: EASE_BREATH, fill: "forwards" });
      wait(fall * 0.7).then(() => alive && reveal(first));
      if (second) wait(fall * 0.8).then(() => alive && reveal(second));
      await sinking.finished.catch(() => {});
    }

    function historyLine() {
      const n = data.attempts ?? 1;
      const tries = `You tried to open ${site} ${n} ${n === 1 ? "time" : "times"} in the last 24 hours.`;
      return data.lastUse ? `${tries} Your last visit was ${formatAgo(data.lastUse)}.` : `${tries} This would be your first visit.`;
    }

    function orb() {
      const wrap = el("div", "us-orb-wrap");
      const glow = el("div", "us-glow");
      const ball = el("div", "us-orb");
      const r = 48;
      const len = 2 * Math.PI * r;
      wrap.innerHTML = `<svg class="us-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="${r}"/><circle class="prog" cx="50" cy="50" r="${r}" stroke-dasharray="${len}" stroke-dashoffset="${len}"/></svg>`;
      wrap.append(glow, ball);
      return { wrap, glow, ball, prog: wrap.querySelector(".prog"), len };
    }

    async function runBreathing(minimal) {
      const total = Math.max(3, Number(data.duration) || 20) * 1000;
      const o = orb();
      const msg = el("p", "us-msg", data.reason === "timeup" ? "Time for a check-in. Breathe with the circle." : data.breathText || "Slow down. Breathe with the circle.");
      const phase = el("div", "us-phase");
      phase.setAttribute("aria-live", "polite");
      if (minimal) stage.append(o.wrap);
      else stage.append(msg, o.wrap, phase);

      if (!minimal) msg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 100, easing: "ease", fill: "forwards" });
      o.wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: EASE_OUT, fill: "both" });
      await wait(700);
      if (!alive) return;

      o.prog.animate([{ strokeDashoffset: o.len }, { strokeDashoffset: 0 }], { duration: total, easing: "linear", fill: "forwards" });

      const setPhase = (text) => {
        if (minimal) return;
        phase.textContent = text;
        phase.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease", fill: "both" });
      };
      const breathe = (from, to, duration) => {
        const frames = reduceMotion
          ? [{ opacity: from === 0.6 ? 0.7 : 1 }, { opacity: to === 0.6 ? 0.7 : 1 }]
          : [{ transform: `scale(${from})` }, { transform: `scale(${to})` }];
        o.glow.animate(frames, { duration, easing: EASE_BREATH, fill: "forwards" });
        return o.ball.animate(frames, { duration, easing: EASE_BREATH, fill: "forwards" }).finished.catch(() => {});
      };

      setPhase("Breathe in");
      await breathe(0.6, 1, total * INHALE);
      if (!alive) return;
      setPhase("Hold");
      await wait(total * HOLD);
      if (!alive) return;
      setPhase("Breathe out");
      await breathe(1, 0.6, total * EXHALE);
      if (!alive) return;

      phase.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: "ease", fill: "forwards" });
      msg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: "ease", fill: "forwards" });
      if (!reduceMotion) {
        o.wrap.animate(
          [{ transform: "translate(-50%, -50%) scale(1)" }, { transform: "translate(-50%, calc(-50% - 22vh)) scale(0.42)" }],
          { duration: 700, easing: EASE_OUT, fill: "forwards" }
        );
      } else {
        o.wrap.animate([{ opacity: 1 }, { opacity: 0.25 }], { duration: 300, fill: "forwards" });
      }
      await wait(280);
      if (!alive) return;

      const decide = el("div", "us-decide");
      decide.hidden = true;
      if (!minimal) {
        decide.append(
          el("h1", "us-title", data.reason === "timeup" ? `Your time on ${site} is up` : `Still want to open ${site}?`),
          el("p", "us-sub", historyLine())
        );
      }
      if (data.askMax) {
        const t = timePicker(data.askMax);
        decide.append(el("p", "us-small", "Need a little more time?"), t.picker, t.actions);
      } else {
        const actions = el("div", "us-actions");
        const go = openButton();
        go.addEventListener("click", () => finish());
        actions.append(leaveButton(), go);
        decide.append(actions);
      }
      stage.append(decide);
      fadeIn(decide);
    }

    function centered(children, { mini = true, rest = false } = {}) {
      const box = el("div", "us-center");
      if (mini) box.append(el("div", `us-mini${rest ? " rest" : ""}`));
      box.append(...children);
      stage.append(box);
      fadeIn(box);
      return box;
    }

    function runTyping() {
      const target = data.typingText || "focus";
      const code = el("div", "us-code");
      const input = el("input", "us-input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Type the code shown above");
      const go = openButton();
      go.disabled = true;
      go.addEventListener("click", () => !go.disabled && finish());
      const actions = el("div", "us-actions");
      actions.append(leaveButton(), go);

      const paint = () => {
        const typed = input.value;
        let ok = 0;
        while (ok < typed.length && typed[ok] === target[ok]) ok++;
        code.replaceChildren(el("span", "ok", target.slice(0, ok)), document.createTextNode(target.slice(ok)));
        go.disabled = typed !== target;
        if (!go.disabled) go.focus();
      };
      input.addEventListener("input", paint);
      for (const evt of ["paste", "drop", "copy", "cut"]) input.addEventListener(evt, (e) => e.preventDefault());
      code.addEventListener("copy", (e) => e.preventDefault());

      centered([
        el("h1", "us-title", "Copy this code to continue"),
        el("p", "us-sub", "Type it out by hand. The pause gives your brain a moment to catch up."),
        code,
        input,
        el("p", "us-small", historyLine()),
        actions
      ]);
      paint();
      setTimeout(() => input.focus({ preventScroll: true }), 60);
    }

    function runReflect() {
      const minChars = 12;
      const area = el("textarea", "us-textarea");
      area.placeholder = "I want to...";
      area.setAttribute("aria-label", "Your reason");
      const counter = el("p", "us-small");
      const go = openButton();
      go.disabled = true;
      go.addEventListener("click", () => !go.disabled && finish({ intention: area.value.trim() }));
      const actions = el("div", "us-actions");
      actions.append(leaveButton(), go);
      const update = () => {
        const left = minChars - area.value.trim().length;
        go.disabled = left > 0;
        counter.textContent = left > 0 ? `Keep going: ${left} more ${left === 1 ? "character" : "characters"}` : "Got it. Hold on to that reason.";
      };
      area.addEventListener("input", update);
      centered([el("h1", "us-title", data.reflectPrompt || `What brings you to ${site} right now?`), area, counter, actions]);
      update();
      setTimeout(() => area.focus({ preventScroll: true }), 60);
    }

    function runAsk() {
      const t = timePicker(data.askMax);
      centered([el("h1", "us-title", `How long do you want on ${site}?`), el("p", "us-sub", historyLine()), t.picker, t.actions]);
    }

    function runRest() {
      const left = el("p", "us-small");
      const tick = () => {
        left.textContent = `Opens again in ${formatLeft(data.until)}`;
      };
      tick();
      const id = setInterval(tick, 30000);
      timers.add(id);
      const sub =
        data.action === "limit"
          ? `You used all ${data.limit} of today's ${data.limit === 1 ? "open" : "opens"} for ${site}. It opens again tomorrow.`
          : `Your “${data.blockName}” focus block ends at ${clock(data.until)}.`;
      const actions = el("div", "us-actions");
      actions.append(leaveButton());
      centered([el("h1", "us-title", `${site} is resting right now`), el("p", "us-sub", sub), left, actions], { rest: true });
    }

    if (data.action === "block" || data.action === "limit") runRest();
    else if (data.action === "ask") runAsk();
    else if (data.type === "typing") runTyping();
    else if (data.type === "reflect") runReflect();
    else if (data.type === "breath" || data.type === "minimal") runBreathing(data.type === "minimal");
    else runTide();

    root.focus({ preventScroll: true });
    opts.onShown?.();

    function destroy() {
      alive = false;
      for (const id of timers) {
        clearTimeout(id);
        clearInterval(id);
      }
      host.remove();
    }

    // The overlay lifts away: background fades first, then the content drifts up and out.
    async function leave() {
      if (!alive) return;
      alive = false;
      root.style.pointerEvents = "none";
      bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: EASE_OUT, fill: "forwards" });
      const out = stage.animate(
        reduceMotion
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [
              { opacity: 1, transform: "translateY(0)" },
              { opacity: 0, transform: "translateY(-12px)" }
            ],
        { duration: 220, easing: EASE_OUT, fill: "forwards" }
      );
      await Promise.all([out.finished.catch(() => {}), wait(260)]);
      destroy();
    }

    return { host, leave, destroy, isAlive: () => alive };
  }

  globalThis.OpenFocusOverlay = { mount };
})();
