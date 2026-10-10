/* Codelabs. Plain JS, no build step.
   GSAP, ScrollTrigger and Lenis are optional enhancements; everything works without them. */
(function () {
  'use strict';

  var FIVERR_PROFILE = 'https://www.fiverr.com/codelabs';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var toastTimer;
  function toast(msg) {
    var el = $('#cl-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 3200);
  }

  /* ---------------- Smooth scroll (optional) ---------------- */
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

  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var target = id === 'top' ? document.body : document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else window.scrollTo({ top: id === 'top' ? 0 : target.getBoundingClientRect().top + window.pageYOffset - 80, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------------- Header ---------------- */
  var nav, menuBtn;
  function closeMenu() {
    if (!nav || !nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  function initHeader() {
    var header = $('#cl-header');
    nav = $('#cl-nav');
    menuBtn = $('#cl-menubtn');
    var onScroll = function () { header.classList.toggle('is-scrolled', window.pageYOffset > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.cl-header')) closeMenu(); });

    if (!('IntersectionObserver' in window)) return;
    var links = $$('[data-nav]');
    var secs = links.map(function (l) { return document.getElementById(l.getAttribute('data-nav')); }).filter(Boolean);
    var vis = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vis[en.target.id] = en.isIntersecting; });
      var cur = null;
      secs.forEach(function (s) { if (!cur && vis[s.id]) cur = s.id; });
      links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('data-nav') === cur); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    // Content is only hidden once this code is running, so a script failure never hides the page.
    document.documentElement.classList.add('cl-js');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    items.forEach(function (el) {
      var i = $$(':scope > [data-reveal]', el.parentElement).indexOf(el);
      if (i > 0) el.style.setProperty('--d', (i % 4) * 0.08 + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Remote images that fail are removed cleanly */
  function initImages() {
    $$('img[data-hide-on-error]').forEach(function (img) {
      var fail = function () {
        var c = img.closest('.cl-case');
        if (c) { c.classList.add('is-noimg'); img.closest('figure').remove(); return; }
        var li = img.closest('li');
        if (li) li.remove();
      };
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
      else img.addEventListener('error', fail, { once: true });
    });
  }

  /* Scrolling band: duplicate once for a seamless loop */
  function initBand() {
    var t = $('[data-band]');
    if (!t) return;
    t.innerHTML += t.innerHTML;
    if (reduceMotion) t.style.animation = 'none';
  }

  /* ---------------- Custom quote calculator ----------------
     Prices in USD. Branded stores start at $1,500. Edit the numbers here. */
  var PRICING = {
    design: { theme: { label: 'Branded premium theme', base: 1500, weeks: 3 },
              figma: { label: 'Build from your Figma designs', base: 2000, weeks: 3.5 },
              custom: { label: 'Fully custom design + theme', base: 2500, weeks: 4.5 } },
    includedPages: 8,
    perPage: 60,
    products: [ { label: 'None', cost: 0 }, { label: 'Up to 25', cost: 0 }, { label: 'Up to 100', cost: 120 },
                { label: 'Up to 250', cost: 300 }, { label: 'Up to 500', cost: 550 }, { label: '1,000+', cost: 900 } ],
    features: { megamenu: ['Mega menu & advanced filters', 200], bundles: ['Bundles, upsells & cross-sells', 250],
                subs: ['Subscriptions', 300], intl: ['Multi-language & currency', 250], b2b: ['B2B / wholesale pricing', 450],
                integration: ['Custom app or API integration', 800], migration: ['Migration from another platform', 350],
                klaviyo: ['Klaviyo email flows', 250], motion: ['Custom animations & interactions', 400], blog: ['Blog & content setup', 150] },
    rush: 0.2,
    spread: 0.25
  };
  var refInfo = null;

  function round50(n) { return Math.round(n / 50) * 50; }

  function estimate() {
    var form = $('#cl-calc-form');
    var design = PRICING.design[form.design.value];
    var pages = +form.pages.value;
    var prodIdx = +form.products.value;
    var feats = $$('input[name="feat"]:checked', form).map(function (c) { return c.value; });
    var rush = form.speed.value === 'rush';
    var lines = [[design.label, design.base]];
    var extraPages = Math.max(0, pages - PRICING.includedPages);
    lines.push([pages + ' pages' + (extraPages ? ' (' + extraPages + ' extra)' : ''), extraPages * PRICING.perPage]);
    var prod = PRICING.products[prodIdx];
    lines.push(['Products: ' + prod.label.toLowerCase(), prod.cost]);
    feats.forEach(function (f) { lines.push(PRICING.features[f]); });
    var total = lines.reduce(function (s, l) { return s + l[1]; }, 0);
    if (rush) { lines.push(['Rush timeline (+20%)', total * PRICING.rush]); total *= 1 + PRICING.rush; }
    var low = Math.max(1500, round50(total));
    var high = round50(low * (1 + PRICING.spread));
    var weeks = design.weeks + extraPages / 12 + feats.length * 0.3 + Math.max(0, prodIdx - 1) * 0.3;
    if (rush) weeks *= 0.75;
    var w = Math.max(2, Math.round(weeks));
    return { lines: lines, low: low, high: high, weeks: w + '–' + (w + 1) + ' weeks', pages: pages, products: prod.label, design: design.label,
             feats: feats.map(function (f) { return PRICING.features[f][0]; }), rush: rush };
  }

  function renderEstimate() {
    var e = estimate();
    $('#cl-lines').innerHTML = e.lines.map(function (l) {
      return '<li><span>' + esc(l[0]) + '</span><span>' + (l[1] ? money(l[1]) : 'Included') + '</span></li>';
    }).join('');
    $('#cl-total').textContent = money(e.low) + ' – ' + money(e.high);
    $('#cl-time').textContent = e.weeks;
    $('#cl-pages-out').textContent = e.pages;
    $('#cl-products-out').textContent = e.products;
  }

  function normaliseUrl(v) {
    v = (v || '').trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v); return /\./.test(u.hostname) ? u : null; } catch (e) { return null; }
  }

  function analyse() {
    var input = $('#cl-ref');
    var out = $('#cl-ref-out');
    var btn = $('#cl-analyse');
    var u = normaliseUrl(input.value);
    if (!u) { toast('Enter a website address, like allbirds.com'); input.focus(); return; }
    out.hidden = false;
    out.className = 'cl-ref cl-ref--loading';
    out.innerHTML = '<div class="cl-ref__shot"></div><div><p class="cl-ref__name">Reading ' + esc(u.hostname) + '…</p><p class="cl-ref__msg">This can take up to 20 seconds.</p></div>';
    btn.disabled = true;

    var q = [
      'url=' + encodeURIComponent(u.href), 'screenshot=true', 'meta=true',
      'data.links.selectorAll=a', 'data.links.attr=href',
      'data.langs.selectorAll=' + encodeURIComponent('link[hreflang]'), 'data.langs.attr=hreflang',
      'data.shop.selector=' + encodeURIComponent('script[src*="cdn.shopify.com"]'), 'data.shop.attr=' + encodeURIComponent('src'),
      'data.wp.selector=' + encodeURIComponent('script[src*="wp-content"],script[src*="wp-includes"]'), 'data.wp.attr=' + encodeURIComponent('src')
    ].join('&');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    fetch('https://api.microlink.io/?' + q, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res || res.status !== 'success' || !res.data) throw new Error('fail');
        showRef(u, res.data);
      })
      .catch(function () {
        clearTimeout(timer);
        refInfo = { url: u.href, ok: false };
        out.className = 'cl-ref';
        out.innerHTML = '<div class="cl-ref__shot">No preview</div><div><p class="cl-ref__name">' + esc(u.hostname) + '</p>' +
          '<p class="cl-ref__msg">I couldn’t read this site automatically (some sites block it). That’s fine: set the options below and I’ll review the site myself when you send the brief.</p></div>';
      })
      .then(function () { btn.disabled = false; });
  }

  function showRef(u, d) {
    var out = $('#cl-ref-out');
    var form = $('#cl-calc-form');
    var host = u.hostname.replace(/^www\./, '');
    var links = (Array.isArray(d.links) ? d.links : []).filter(Boolean);
    var paths = {}, products = {}, collections = {};
    links.forEach(function (href) {
      try {
        var l = new URL(href, u.href);
        if (l.hostname.replace(/^www\./, '') !== host) return;
        var p = l.pathname.replace(/\/$/, '') || '/';
        if (/\/products\//.test(p)) products[p] = 1;
        else if (/\/collections\//.test(p)) collections[p] = 1;
        else paths[p] = 1;
      } catch (e) { /* ignore bad links */ }
    });
    var nPages = Object.keys(paths).length, nProducts = Object.keys(products).length, nCollections = Object.keys(collections).length;
    var langs = Array.isArray(d.langs) ? d.langs.filter(function (x, i, a) { return x && a.indexOf(x) === i && x !== 'x-default'; }) : [];
    var platform = d.shop ? 'Built on Shopify' : d.wp ? 'Built on WordPress' : 'Platform not detected';
    var tags = [];
    tags.push([platform, !!d.shop]);
    if (nPages) tags.push([nPages + ' pages linked', nPages > 15]);
    if (nCollections) tags.push([nCollections + ' collections', nCollections > 8]);
    if (nProducts) tags.push([nProducts + ' products on home page', false]);
    if (langs.length > 1) tags.push([langs.length + ' languages', true]);

    // Suggest settings from what was found; the visitor can still change them
    var suggestPages = Math.min(40, Math.max(+form.pages.value, Math.round(5 + nPages * 0.4 + Math.min(nCollections, 10) * 0.5)));
    form.pages.value = suggestPages;
    if (langs.length > 1) $('input[name="feat"][value="intl"]', form).checked = true;
    if (nCollections > 8) $('input[name="feat"][value="megamenu"]', form).checked = true;

    refInfo = { url: u.href, ok: true, title: d.title || host, platform: platform, pages: nPages, collections: nCollections, langs: langs.length };
    var shot = d.screenshot && d.screenshot.url ? d.screenshot.url : d.image && d.image.url ? d.image.url : '';
    out.className = 'cl-ref';
    out.innerHTML = '<div class="cl-ref__shot">' + (shot ? '<img src="' + esc(shot) + '" alt="Screenshot of ' + esc(host) + '">' : 'No preview') + '</div>' +
      '<div><p class="cl-ref__name">' + esc(d.title || host) + '</p><p class="cl-ref__url">' + esc(u.href) + '</p>' +
      '<ul class="cl-ref__tags">' + tags.map(function (t) { return '<li' + (t[1] ? ' class="is-hot"' : '') + '>' + esc(t[0]) + '</li>'; }).join('') + '</ul>' +
      '<p class="cl-ref__msg">I’ve adjusted the pages' + (langs.length > 1 || nCollections > 8 ? ' and features' : '') + ' to match. Change anything below.</p></div>';
    renderEstimate();
  }

  function briefText() {
    var e = estimate();
    var lines = [
      'Hi Nitin, I used the estimator on codelabsstorefront.com.',
      '',
      'Reference store: ' + (refInfo ? refInfo.url : ($('#cl-ref').value || 'none')),
      refInfo && refInfo.ok ? 'Detected: ' + refInfo.platform + ', ' + refInfo.pages + ' pages linked' + (refInfo.langs > 1 ? ', ' + refInfo.langs + ' languages' : '') : '',
      'Design: ' + e.design,
      'Pages: ' + e.pages,
      'Products: ' + e.products,
      'Features: ' + (e.feats.length ? e.feats.join(', ') : 'none selected'),
      'Timeline: ' + (e.rush ? 'rush' : 'standard') + ' (' + e.weeks + ')',
      'Estimate: ' + money(e.low) + ' – ' + money(e.high)
    ];
    return lines.filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  function initCalc() {
    var form = $('#cl-calc-form');
    if (!form) return;
    form.addEventListener('input', renderEstimate);
    form.addEventListener('change', renderEstimate);
    form.addEventListener('submit', function (e) { e.preventDefault(); analyse(); });
    $('#cl-analyse').addEventListener('click', analyse);
    $('#cl-ref').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); analyse(); } });
    $('#cl-send').addEventListener('click', function () {
      var text = briefText();
      // Open Fiverr synchronously (inside the click) so pop-up blockers allow it
      var win = window.open(FIVERR_PROFILE, '_blank');
      if (win) win.opener = null;
      copy(text).then(function () {
        toast('Brief copied. Paste it into a message to me on Fiverr.');
        $('#cl-send-note').textContent = 'Copied! On Fiverr, click “Contact me” and paste your brief.';
      }).catch(function () {
        window.prompt('Copy your brief, then paste it into a message on Fiverr:', text);
      });
      if (!win) toast('Brief copied. Open fiverr.com/codelabs to send it.');
    });
    renderEstimate();
  }

  /* ---------------- GSAP extras (one tween per element) ---------------- */
  function initGsap() {
    var gsap = window.gsap;
    if (!gsap || reduceMotion) return;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('[data-hero]', { y: 26, opacity: 0, duration: .8, stagger: .08 })
      .from('.cl-sun', { scale: .6, opacity: 0, duration: 1.1 }, 0.1)
      .from('.cl-hero__img', { y: 60, opacity: 0, duration: 1.1 }, 0.25)
      .from('.cl-hero__art .cl-sticker', { scale: 0, duration: .6, ease: 'back.out(2)', stagger: .15 }, 0.7);
    if (window.ScrollTrigger) {
      gsap.to('.cl-band', { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.cl-band', start: 'top bottom', end: 'bottom top', scrub: .5 } });
      $$('.cl-piece__img img').forEach(function (img) {
        gsap.fromTo(img, { scale: 1.04 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: .5 } });
      });
    }
  }

  function boot() {
    initLenis();
    initAnchors();
    initHeader();
    initImages();
    initBand();
    initReveal();
    initCalc();
    initGsap();
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
