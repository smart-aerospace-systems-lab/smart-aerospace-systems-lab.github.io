(function () {
  "use strict";
  var root = document.documentElement;
  /* 화면 문구 (페이지 언어에 맞춤) */
  var EN = root.lang === "en";
  var T = EN
    ? { toLight: "Switch to light mode", toDark: "Switch to dark mode", menuOpen: "Open menu", menuClose: "Close menu", pause: "Pause", play: "Play" }
    : { toLight: "밝은 화면으로 바꾸기", toDark: "어두운 화면으로 바꾸기", menuOpen: "메뉴 열기", menuClose: "메뉴 닫기", pause: "일시정지", play: "재생" };

  /* 주소에 #설비 같은 위치가 붙어 오면, 사진·글꼴이 다 불러와진 뒤 그 위치로 다시 맞춤 */
  function scrollToHash() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  }
  if (location.hash) {
    window.addEventListener("load", function () {
      scrollToHash();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(scrollToHash);
    });
  }

  /* 테마 전환 (선택은 이 브라우저에만 저장) */
  var themeBtn = document.querySelector("[data-theme-toggle]");
  function syncThemeLabel() {
    if (!themeBtn) return;
    var dark = root.getAttribute("data-theme") !== "light";
    themeBtn.setAttribute("aria-label", dark ? T.toLight : T.toDark);
  }
  syncThemeLabel();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("sasl-theme", next); } catch (e) {}
      syncThemeLabel();
      if (flow) flow.recolor();
    });
  }

  /* 모바일 메뉴 */
  var toggle = document.querySelector("[data-nav-toggle]");
  if (toggle) {
    var setOpen = function (open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".sr-only").textContent = open ? T.menuClose : T.menuOpen;
    };
    toggle.addEventListener("click", function () { setOpen(!document.body.classList.contains("nav-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* 히어로 배경: 가운데 로고(원기둥) 주위를 흐르는 유선 */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.querySelector("canvas[data-flow]");
  var body = document.querySelector("[data-flow-body]");
  var pauseBtn = document.querySelector("[data-hero-pause]");
  var running = !reduce;
  var flow = canvas ? startFlow(canvas, body) : null;

  var orbit = startOrbit(document.querySelector("[data-orbit]"));

  if (pauseBtn) {
    if (!flow || reduce) pauseBtn.hidden = true;
    var label = pauseBtn.querySelector("[data-pause-label]");
    pauseBtn.addEventListener("click", function () {
      running = !running;
      if (flow) { running ? flow.play() : flow.pause(); }
      if (orbit) orbit.setRunning(running);
      pauseBtn.setAttribute("aria-pressed", String(!running));
      label.textContent = running ? T.pause : T.play;
    });
  }

  /* 궤도: 로고에 마우스를 올리는 동안만 세 팀이 행성처럼 돌고, 로고는 커서를 따라 살짝 움직입니다 */
  function startOrbit(el) {
    if (!el || reduce) return null;
    var CX = 500, CY = 210, RX = 473, RY = 180;      /* SVG viewBox 1000×420 기준 */
    var PERIOD = 40;                                  /* 한 바퀴 40초 (로고 위에 있을 때) */
    var nodes = [].slice.call(el.querySelectorAll("[data-node]"));
    var spokes = [].slice.call(el.querySelectorAll("[data-spoke]"));
    var inner = el.querySelector("[data-core-inner]");
    var angles = nodes.map(function (n) { return parseFloat(n.getAttribute("data-angle")) || 0; });
    var core = el.querySelector("[data-core]");
    var on = true, hover = false, spin = false, speed = 0, last = null, raf = null, visible = true;

    function place() {
      nodes.forEach(function (n, i) {
        var t = angles[i] * Math.PI / 180;
        var x = CX + RX * Math.cos(t), y = CY + RY * Math.sin(t);
        n.style.left = (x / 10) + "%";
        n.style.top = (y / 4.2) + "%";
        n.classList.toggle("is-behind", y < CY - 20);   /* 위쪽 = 로고 뒤편 */
        var right = x > CX;
        n.classList.toggle("orbit__node--left", right);
        n.classList.toggle("orbit__node--right", !right);
        if (spokes[i]) { spokes[i].setAttribute("x2", x.toFixed(1)); spokes[i].setAttribute("y2", y.toFixed(1)); }
      });
    }

    function tick(ts) {
      if (last !== null) {
        /* 부드럽게 출발·정지 */
        var target = (on && spin && !hover) ? 1 : 0;
        var dt = Math.min(0.05, (ts - last) / 1000);
        speed += (target - speed) * Math.min(1, dt * 4);
        if (speed > 0.002) {
          var d = dt * speed * 360 / PERIOD;
          for (var i = 0; i < angles.length; i++) angles[i] = (angles[i] + d) % 360;
          place();
        }
      }
      last = ts;
      raf = requestAnimationFrame(tick);
    }

    /* 팀을 가리키는 동안은 멈춰서 클릭하기 쉽게 */
    nodes.forEach(function (n) {
      n.addEventListener("mouseenter", function () { hover = true; });
      n.addEventListener("mouseleave", function () { hover = false; });
      n.addEventListener("focus", function () { hover = true; });
      n.addEventListener("blur", function () { hover = false; });
    });

    if (core) {
      core.addEventListener("mouseenter", function () { spin = true; });
      core.addEventListener("mouseleave", function () { spin = false; });
    }

    /* 로고 패럴랙스: 커서 쪽으로 최대 14px */
    if (inner && core && window.matchMedia("(hover: hover)").matches) {
      el.addEventListener("mousemove", function (e) {
        var r = core.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width * 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height * 2);
        dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
        inner.classList.add("is-tracking");
        inner.style.transform = "translate(" + (dx * 14).toFixed(1) + "px," + (dy * 14).toFixed(1) + "px) rotate(" + (dx * 4).toFixed(1) + "deg) scale(1.03)";
      });
      el.addEventListener("mouseleave", function () {
        inner.classList.remove("is-tracking");
        inner.style.transform = "";
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visible = e.isIntersecting;
          if (!visible && raf) { cancelAnimationFrame(raf); raf = null; last = null; }
          if (visible && !raf) raf = requestAnimationFrame(tick);
        });
      }).observe(el);
    }
    place();
    raf = requestAnimationFrame(tick);

    return { setRunning: function (v) { on = v; } };
  }

  function startFlow(cv, bodyEl) {
    var ctx = cv.getContext("2d");
    var W, H, dpr, cx, cy, R, parts = [], raf = null, rgb, fade, bg;

    function readColors() {
      var cs = getComputedStyle(root);
      rgb = cs.getPropertyValue("--flow").trim() || "127,166,240";
      fade = cs.getPropertyValue("--flow-fade").trim() || "rgba(10,17,32,0.07)";
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = cv.getBoundingClientRect();
      if (bodyEl) {
        var b = bodyEl.getBoundingClientRect();
        cx = b.left - c.left + b.width / 2; cy = b.top - c.top + b.height / 2; R = b.width * 0.48;
      } else { cx = W / 2; cy = H * 0.65; R = Math.min(W, H) * 0.12; }
      var n = Math.min(700, Math.round((W * H) / 3200));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn(true));
      ctx.clearRect(0, 0, W, H);
      if (!running) drawStatic();
    }

    function spawn(anywhere) {
      return { x: anywhere ? Math.random() * W : -Math.random() * 40, y: Math.random() * H, age: 0, life: 220 + Math.random() * 420 };
    }

    /* 균일류 + 이중극 = 원기둥 주위 비점성 유동 */
    function vel(x, y) {
      var dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy;
      if (r2 < 1) return null;
      var r4 = r2 * r2;
      return { u: 1 - (dx * dx - dy * dy) / r4, v: -2 * dx * dy / r4 };
    }

    function step() {
      /* 이전 프레임을 서서히 지워 꼬리를 만듭니다 */
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1.1;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], v = vel(p.x, p.y);
        if (!v || p.x > W + 10 || p.age > p.life) { parts[i] = spawn(false); continue; }
        var nx = p.x + v.u * 2, ny = p.y + v.v * 2;
        var mag = Math.sqrt(v.u * v.u + v.v * v.v);
        var a = Math.min(0.7, 0.16 + (mag - 0.6) * 0.45);
        ctx.strokeStyle = "rgba(" + rgb + "," + a + ")";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.age++;
      }
      raf = requestAnimationFrame(step);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + rgb + ",0.25)";
      var gap = Math.max(12, H / 40);
      for (var y0 = gap / 2; y0 < H; y0 += gap) {
        var x = 0, y = y0;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (var k = 0; k < 4000 && x < W; k++) {
          var v = vel(x, y); if (!v) break;
          x += v.u * 2; y += v.v * 2; ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    readColors();
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(resize, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    resize();
    if (running) raf = requestAnimationFrame(step);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!running) return;
          if (e.isIntersecting && !raf) raf = requestAnimationFrame(step);
          if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
        });
      }).observe(cv);
    }

    return {
      play: function () { if (!raf) raf = requestAnimationFrame(step); },
      pause: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } drawStatic(); },
      recolor: function () { readColors(); ctx.clearRect(0, 0, W, H); if (!running) drawStatic(); }
    };
  }
})();
