(function () {
  "use strict";

  /* 헤더: 히어로 위에서는 투명, 스크롤하면 배경 */
  var header = document.querySelector("[data-header]");
  if (header && header.classList.contains("is-overlay")) {
    var top = document.querySelector(".hero, .page-hero");
    var onScroll = function () {
      var limit = top ? top.offsetHeight - header.offsetHeight : 0;
      header.classList.toggle("is-scrolled", window.scrollY > limit);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* 모바일 메뉴 */
  var toggle = document.querySelector("[data-nav-toggle]");
  if (toggle) {
    var setOpen = function (open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".sr-only").textContent = open ? "메뉴 닫기" : "메뉴 열기";
    };
    toggle.addEventListener("click", function () { setOpen(!document.body.classList.contains("nav-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* 히어로: 원기둥 주위 포텐셜 유동 (풍동 유선) */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pauseBtn = document.querySelector("[data-hero-pause]");
  var video = document.querySelector("video[data-hero-media]");
  var canvas = document.querySelector("canvas[data-flow]");
  var running = !reduce;
  var flow = null;

  if (canvas) flow = startFlow(canvas);
  if (video && reduce) video.pause();

  if (pauseBtn) {
    if (reduce && !video) pauseBtn.hidden = true;
    var label = pauseBtn.querySelector("[data-pause-label]");
    var sync = function () {
      pauseBtn.setAttribute("aria-pressed", String(!running));
      label.textContent = running ? "일시정지" : "재생";
    };
    if (video) running = !video.paused || !reduce;
    sync();
    pauseBtn.addEventListener("click", function () {
      running = !running;
      if (video) { running ? video.play() : video.pause(); }
      if (flow) { running ? flow.play() : flow.pause(); }
      sync();
    });
  }

  function startFlow(cv) {
    var ctx = cv.getContext("2d");
    var W, H, dpr, cx, cy, R, U = 1, parts = [], raf = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var narrow = W < 700;
      cx = W * (narrow ? 0.62 : 0.7);
      cy = H * (narrow ? 0.36 : 0.42);
      R = Math.min(W, H) * (narrow ? 0.18 : 0.17);
      var n = Math.min(900, Math.round((W * H) / 2600));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn(true));
      ctx.fillStyle = "#0A0E14";
      ctx.fillRect(0, 0, W, H);
      if (!running) drawStatic();
    }

    function spawn(anywhere) {
      return { x: anywhere ? Math.random() * W : -Math.random() * 40, y: Math.random() * H, age: 0, life: 200 + Math.random() * 400 };
    }

    /* 균일류 + 이중극: 원기둥 주위 비점성 유동 */
    function vel(x, y) {
      var dx = (x - cx) / R, dy = (y - cy) / R;
      var r2 = dx * dx + dy * dy;
      if (r2 < 1) return null;
      var r4 = r2 * r2;
      return { u: U * (1 - (dx * dx - dy * dy) / r4), v: U * (-2 * dx * dy / r4) };
    }

    var speed = 2.2;
    function step() {
      ctx.fillStyle = "rgba(10,14,20,0.06)";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1.2;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], v = vel(p.x, p.y);
        if (!v || p.x > W + 10 || p.age > p.life) { parts[i] = spawn(false); continue; }
        var nx = p.x + v.u * speed, ny = p.y + v.v * speed;
        var mag = Math.sqrt(v.u * v.u + v.v * v.v);
        var a = Math.min(0.95, 0.42 + (mag - 0.6) * 0.5);
        ctx.strokeStyle = mag > 1.25 ? "rgba(160,190,245," + a + ")" : "rgba(127,166,240," + a * 0.8 + ")";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.age++;
      }
      drawBody();
      raf = requestAnimationFrame(step);
    }

    function drawBody() {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.stroke();
    }

    /* 움직임 줄이기 설정이면 유선을 한 번만 그립니다 */
    function drawStatic() {
      ctx.fillStyle = "#0A0E14";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(127,166,240,0.35)";
      var gap = Math.max(10, H / 48);
      for (var y0 = gap / 2; y0 < H; y0 += gap) {
        var x = 0, y = y0;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (var k = 0; k < 4000 && x < W; k++) {
          var v = vel(x, y); if (!v) break;
          x += v.u * 2; y += v.v * 2; ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      drawBody();
    }

    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(resize, 150); });
    resize();
    if (running) raf = requestAnimationFrame(step);

    /* 화면 밖이면 멈춰서 배터리 절약 */
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
      pause: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    };
  }
})();
