/* Codelabs. Plain JS, no build step.
   GSAP, ScrollTrigger and Lenis are optional enhancements; everything works without them. */
(function () {
  'use strict';

  document.documentElement.classList.add('cl-js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;
  var thread = null;

  /* Smooth scrolling (optional) */
  function initLenis() {
    if (reduceMotion || typeof window.Lenis !== 'function') return;
    try {
      lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      } else {
        var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { lenis = null; }
  }

  /* In-page anchors */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var target = id === 'top' ? document.body : document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: -84 });
      else {
        var y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.pageYOffset - 84;
        window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* Header: floating pill on scroll, mobile menu, active section */
  var menuBtn, nav;
  function closeMenu() {
    if (!nav || !nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  function initHeader() {
    var header = $('#cl-header');
    menuBtn = $('#cl-menubtn');
    nav = $('#cl-nav');
    var onScroll = function () { header.classList.toggle('is-scrolled', window.pageYOffset > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (menuBtn) menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', function (e) { if (nav.classList.contains('is-open') && !e.target.closest('.cl-header')) closeMenu(); });

    if (!('IntersectionObserver' in window)) return;
    var links = $$('[data-nav]');
    var secs = links.map(function (l) { return document.getElementById(l.getAttribute('data-nav')); }).filter(Boolean);
    var vis = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vis[en.target.id] = en.isIntersecting; });
      var cur = null;
      secs.forEach(function (s) { if (!cur && vis[s.id]) cur = s.id; });
      links.forEach(function (l) {
        var on = l.getAttribute('data-nav') === cur;
        l.classList.toggle('is-active', on);
        if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* Reveal on scroll */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    items.forEach(function (el) {
      var sibs = $$(':scope > [data-reveal]', el.parentElement);
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', (i % 3) * 0.09 + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Count-up numbers */
  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, to = parseFloat(el.getAttribute('data-count')), start = performance.now();
        var tick = function (now) {
          var p = Math.min(1, (now - start) / 1400);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* Remote images that fail are removed cleanly (no broken tiles) */
  function initImages() {
    $$('img[data-hide-on-error]').forEach(function (img) {
      var fail = function () {
        var tile = img.closest('.cl-shot, .cl-case__img, figure');
        if (img.closest('.cl-case')) img.closest('.cl-case').classList.add('is-noimg');
        if (tile) tile.remove();
        if (thread) thread.refresh();
      };
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
      else img.addEventListener('error', fail, { once: true });
    });
  }

  /* Marquee: duplicate the items once so the loop is seamless */
  function initMarquee() {
    var track = $('[data-marquee]');
    if (!track) return;
    $$(':scope > figure', track).forEach(function (f) {
      var c = f.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      var img = $('img', c);
      if (img && img.hasAttribute('data-hide-on-error')) img.addEventListener('error', function () { c.remove(); }, { once: true });
      track.appendChild(c);
    });
    if (reduceMotion) track.style.animation = 'none';
  }

  /* Process: self-playing store build (no scroll-jacking) */
  function initBuild() {
    var root = $('#cl-build');
    if (!root) return;
    var steps = $$('[data-goto]', root);
    var toasts = $('[data-mock-toasts]', root);
    var salesEl = $('[data-mock-sales]', root);
    var ordersEl = $('[data-mock-orders]', root);
    var STEP = 2800, LIVE = 7000;
    var ORDERS = [['Leeds', 84], ['Melbourne', 126], ['Austin', 62], ['Bristol', 148], ['Brisbane', 95], ['Denver', 118]];
    var stage = 1, timer = null, orderTimer = null, inView = false, paused = false, sales = 0, orders = 0;

    function reset() {
      sales = 0; orders = 0;
      salesEl.textContent = '$0';
      ordersEl.textContent = '0 orders';
      toasts.innerHTML = '';
    }
    function push(i) {
      var o = ORDERS[i % ORDERS.length];
      orders += 1; sales += o[1];
      salesEl.textContent = '$' + sales.toLocaleString('en-US');
      ordersEl.textContent = orders + (orders === 1 ? ' order' : ' orders');
      var t = document.createElement('div');
      t.className = 'cl-mock__toast';
      t.innerHTML = '<span>New order <b>$' + o[1] + '</b> · ' + o[0] + '</span>';
      toasts.insertBefore(t, toasts.firstChild);
      if (toasts.children.length > 3) {
        var last = toasts.lastElementChild;
        last.classList.add('is-out');
        setTimeout(function () { if (last.parentNode) last.parentNode.removeChild(last); }, 400);
      }
    }
    function setStage(n) {
      stage = n;
      root.setAttribute('data-stage', String(n));
      root.style.setProperty('--cl-step-ms', (n === 4 ? LIVE : STEP) + 'ms');
      steps.forEach(function (b) {
        b.setAttribute('aria-selected', b.getAttribute('data-goto') === String(n) ? 'true' : 'false');
        var bar = $('.cl-step__bar', b);
        bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      });
      clearInterval(orderTimer);
      reset();
      if (n === 4) {
        var i = 0;
        setTimeout(function () { if (stage === 4) push(i++); }, 500);
        orderTimer = setInterval(function () { if (stage === 4) push(i++); }, 1300);
      }
    }
    function schedule() {
      clearTimeout(timer);
      if (!inView || paused || reduceMotion) return;
      timer = setTimeout(function () { setStage(stage === 4 ? 1 : stage + 1); schedule(); }, stage === 4 ? LIVE : STEP);
    }
    steps.forEach(function (b) { b.addEventListener('click', function () { setStage(+b.getAttribute('data-goto')); schedule(); }); });
    root.addEventListener('mouseenter', function () { paused = true; root.classList.add('is-paused'); clearTimeout(timer); });
    root.addEventListener('mouseleave', function () { paused = false; root.classList.remove('is-paused'); schedule(); });

    if (reduceMotion || !('IntersectionObserver' in window)) { setStage(4); return; }
    setStage(1);
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      if (inView) schedule(); else { clearTimeout(timer); clearInterval(orderTimer); }
    }, { threshold: 0.35 }).observe(root);
  }

  /* Thread: dashed path linking sections; a glowing orb with a light trail
     follows the scroll and pulses each milestone as it passes. Desktop only. */
  function initThread() {
    var main = $('.cl-main');
    var heads = $$('[data-ms]');
    if (!main || heads.length < 2) return;
    var NS = 'http://www.w3.org/2000/svg';
    var box = document.createElement('div');
    box.className = 'cl-thread';
    box.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(NS, 'svg');
    var mk = function (cls) { var p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); svg.appendChild(p); return p; };
    var base = mk('cl-thread__base'), glow = mk('cl-thread__glow'), lit = mk('cl-thread__lit');
    var msGroup = document.createElementNS(NS, 'g'); svg.appendChild(msGroup);
    var orb = document.createElementNS(NS, 'circle'); orb.setAttribute('class', 'cl-thread__orb'); orb.setAttribute('r', '6'); svg.appendChild(orb);
    box.appendChild(svg);
    main.insertBefore(box, main.firstChild);

    var total = 0, lut = [], msLens = [], msNodes = [], current = 0, target = 0, active = false, raf = null;
    var mq = window.matchMedia('(min-width: 1180px)');

    function lengthAtY(y) {
      if (!lut.length || y <= lut[0][1]) return 0;
      for (var i = 1; i < lut.length; i++) {
        if (lut[i][1] >= y) {
          var a = lut[i - 1], b = lut[i], t = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
          return a[0] + (b[0] - a[0]) * t;
        }
      }
      return total;
    }
    function computeTarget() { return lengthAtY(-main.getBoundingClientRect().top + window.innerHeight * 0.6); }

    function build() {
      active = mq.matches && !reduceMotion;
      box.classList.toggle('is-on', active);
      if (!active) return;
      var mainTop = main.getBoundingClientRect().top + window.pageYOffset;
      box.style.height = main.offsetHeight + 'px';
      svg.setAttribute('viewBox', '0 0 ' + main.offsetWidth + ' ' + main.offsetHeight);
      var pts = heads.filter(function (h) { return h.offsetParent !== null; }).map(function (h) {
        var wrap = h.closest('.cl-wrap');
        var wr = wrap.getBoundingClientRect();
        var pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 24;
        var off = Math.min(40, pad * 0.8);
        var x = h.getAttribute('data-ms') === 'right' ? wr.right - pad + off : wr.left + pad - off;
        x = Math.max(16, Math.min(x, main.offsetWidth - 16));
        return { x: x, y: h.getBoundingClientRect().top + window.pageYOffset - mainTop + 12 };
      });
      if (pts.length < 2) return;
      var d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        if (Math.abs(a.x - b.x) < 2) { d += ' L' + b.x + ' ' + b.y; continue; }
        var bend = Math.min(170, (b.y - a.y) * 0.45), turnY = b.y - bend;
        d += ' L' + a.x + ' ' + turnY + ' C' + a.x + ' ' + (turnY + bend * 0.6) + ' ' + b.x + ' ' + (b.y - bend * 0.55) + ' ' + b.x + ' ' + b.y;
      }
      [base, lit, glow].forEach(function (p) { p.setAttribute('d', d); });
      total = base.getTotalLength();
      lut = [];
      for (var l = 0; l <= total; l += 6) lut.push([l, base.getPointAtLength(l).y]);
      lut.push([total, base.getPointAtLength(total).y]);
      msGroup.innerHTML = '';
      msNodes = []; msLens = [];
      pts.forEach(function (p) {
        var pulse = document.createElementNS(NS, 'circle');
        pulse.setAttribute('class', 'cl-thread__pulse'); pulse.setAttribute('cx', p.x); pulse.setAttribute('cy', p.y); pulse.setAttribute('r', '6');
        var dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('class', 'cl-thread__ms'); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('r', '5');
        msGroup.appendChild(pulse); msGroup.appendChild(dot);
        msNodes.push({ dot: dot, pulse: pulse, hit: false });
        msLens.push(lengthAtY(p.y));
      });
      current = target = computeTarget();
      draw();
    }
    function draw() {
      var L = Math.max(0, Math.min(total, current));
      lit.setAttribute('stroke-dasharray', L + ' ' + (total + 10));
      var trail = Math.min(L, 220);
      glow.setAttribute('stroke-dasharray', '0 ' + (L - trail) + ' ' + trail + ' ' + (total + 10));
      var pt = base.getPointAtLength(L);
      orb.setAttribute('cx', pt.x); orb.setAttribute('cy', pt.y);
      msNodes.forEach(function (m, i) {
        var hit = L >= msLens[i] - 1;
        if (hit && !m.hit) { m.pulse.classList.remove('is-pulsing'); void m.pulse.getBoundingClientRect(); m.pulse.classList.add('is-pulsing'); }
        if (hit !== m.hit) { m.hit = hit; m.dot.classList.toggle('is-hit', hit); }
      });
    }
    function loop() {
      raf = null;
      if (!active) return;
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.5) current = target;
      draw();
      if (current !== target) raf = requestAnimationFrame(loop);
    }
    var t;
    function refresh() { clearTimeout(t); t = setTimeout(build, 120); }
    window.addEventListener('scroll', function () { if (!active) return; target = computeTarget(); if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(main);
    build();
    thread = { refresh: refresh };
  }

  /* GSAP: hero entrance and the closing card rising on scroll. One tween per element. */
  function initGsap() {
    var gsap = window.gsap;
    if (!gsap || reduceMotion) return;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.cl-hero [data-hero]', { y: 22, opacity: 0, duration: .8, stagger: .08 })
      .from('.cl-portrait', { y: 30, opacity: 0, scale: .97, duration: 1 }, 0.1)
      .from('.cl-portrait__img', { yPercent: 8, duration: 1.2 }, 0.2);
    if (window.ScrollTrigger) {
      gsap.fromTo('#cl-cta-card', { y: 70, scale: .97 }, { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.cl-cta', start: 'top bottom', end: 'top 45%', scrub: .6 } });
    }
  }

  function boot() {
    initLenis();
    initAnchors();
    initHeader();
    initThread();
    initImages();
    initMarquee();
    initReveal();
    initCounters();
    initBuild();
    initGsap();
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
