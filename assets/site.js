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
    min: 1500,
    spread: 0.25,
    rush: 0.2,
    design: { theme: { label: 'Branded premium theme', base: 1500, weeks: 3 },
              figma: { label: 'Custom theme from your Figma designs', base: 2000, weeks: 3.5 },
              custom: { label: 'Fully custom design + theme', base: 2500, weeks: 4.5 } },
    project: { new: ['New store', 0, 0], redesign: ['Redesign of existing store', 150, 0.3], migrate: ['Migration to Shopify', 350, 0.8] },
    migrateLargeCatalogue: 150,
    brand: { have: ['Your existing branding', 0], logo: ['Logo design', 150], kit: ['Logo + brand kit', 400] },
    includedPages: 8,
    perPage: 60,
    products: [ { label: 'None', cost: 0 }, { label: 'Up to 25', cost: 0 }, { label: 'Up to 100', cost: 120 },
                { label: 'Up to 250', cost: 300 }, { label: 'Up to 500', cost: 550 }, { label: '1,000+', cost: 900 } ],
    variants: { simple: ['Simple products', 0], options: ['Variants & product options', 150], custom: ['Personalised / configurable products', 600] },
    perMarket: 150,
    features: {
      megamenu: ['Mega menu & advanced filters', 200], quiz: ['Product finder quiz', 350], wishlist: ['Wishlist', 100],
      sizing: ['Size guide & fit tools', 120], locator: ['Store locator', 150], motion: ['Custom animations', 400],
      bundles: ['Bundles & upsells', 250], subs: ['Subscriptions', 300], loyalty: ['Loyalty & rewards', 200],
      reviews: ['Reviews & UGC', 120], preorder: ['Pre-orders & back in stock', 150], b2b: ['B2B / wholesale', 450],
      klaviyo: ['Klaviyo email flows', 250], seo: ['Advanced SEO', 250], speed: ['Speed & Core Web Vitals', 200],
      tracking: ['Tracking (GA4, Meta, TikTok)', 150], blog: ['Blog & content setup', 150],
      integration: ['Custom app / API / ERP integration', 800], translate: ['Translations', 250], a11y: ['Accessibility review', 300], age: ['Age verification', 80]
    },
    copy: { none: ['Copy by you', 0], key: ['Copywriting: key pages', 250], all: ['Copywriting: every page', 45] }
  };
  var refInfo = { ref: null, cur: null };

  function round50(n) { return Math.round(n / 50) * 50; }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]:checked'); return el ? el.value : ''; }

  function estimate() {
    var form = $('#cl-calc-form');
    var design = PRICING.design[val(form, 'design')];
    var project = PRICING.project[val(form, 'project')];
    var pages = +form.pages.value;
    var prodIdx = +form.products.value;
    var markets = $$('input[name="market"]:checked', form).map(function (c) { return c.value; });
    var feats = $$('input[name="feat"]:checked', form).map(function (c) { return c.value; });
    var lines = [];
    lines.push([design.label, design.base]);
    if (project[1]) lines.push([project[0] + (val(form, 'project') === 'migrate' ? ' from ' + form.from.value : ''), project[1]]);
    if (val(form, 'project') === 'migrate' && prodIdx >= 3) lines.push(['Large catalogue migration', PRICING.migrateLargeCatalogue]);
    var brand = PRICING.brand[val(form, 'brand')];
    if (brand[1]) lines.push(brand);
    var extraPages = Math.max(0, pages - PRICING.includedPages);
    lines.push([pages + ' pages' + (extraPages ? ' (' + extraPages + ' extra)' : ' (included)'), extraPages * PRICING.perPage]);
    var prod = PRICING.products[prodIdx];
    lines.push(['Product upload: ' + prod.label.toLowerCase(), prod.cost]);
    var variants = PRICING.variants[val(form, 'variants')];
    if (variants[1]) lines.push(variants);
    if (markets.length > 1) lines.push(['Selling in ' + markets.length + ' markets', (markets.length - 1) * PRICING.perMarket]);
    feats.forEach(function (f) { lines.push(PRICING.features[f]); });
    var copyKey = val(form, 'copy');
    if (copyKey === 'key') lines.push(PRICING.copy.key);
    if (copyKey === 'all') lines.push([PRICING.copy.all[0] + ' (' + pages + ')', PRICING.copy.all[1] * pages]);
    var total = lines.reduce(function (sum, l) { return sum + l[1]; }, 0);
    var rush = val(form, 'speed') === 'rush';
    if (rush) { lines.push(['Rush timeline (+20%)', total * PRICING.rush]); total *= 1 + PRICING.rush; }
    var low = Math.max(PRICING.min, round50(total));
    var high = round50(low * (1 + PRICING.spread));
    var weeks = design.weeks + project[2] + extraPages / 12 + feats.length * 0.25 + Math.max(0, prodIdx - 1) * 0.3 + (copyKey === 'all' ? 0.5 : 0);
    if (rush) weeks *= 0.75;
    var w = Math.max(2, Math.round(weeks));
    return {
      lines: lines, low: low, high: high, weeks: w + '–' + (w + 1) + ' weeks', pages: pages, products: prod.label,
      design: design.label, project: project[0], from: val(form, 'project') === 'migrate' ? form.from.value : '',
      industry: form.industry.value, markets: markets, brand: brand[0], variants: variants[0], copy: PRICING.copy[copyKey][0],
      feats: feats.map(function (f) { return PRICING.features[f][0]; }), rush: rush,
      launch: form.launch.value, care: form.care.checked, notes: form.notes.value.trim()
    };
  }

  var briefEdited = false;
  function renderEstimate() {
    var form = $('#cl-calc-form');
    $('#cl-current').hidden = val(form, 'project') === 'new';
    $('#cl-from-wrap').hidden = val(form, 'project') !== 'migrate';
    var e = estimate();
    $('#cl-lines').innerHTML = e.lines.map(function (l) {
      return '<li><span>' + esc(l[0]) + '</span><span>' + (l[1] ? money(l[1]) : 'Included') + '</span></li>';
    }).join('');
    $('#cl-total').textContent = money(e.low) + ' – ' + money(e.high);
    $('#cl-time').textContent = e.weeks;
    $('#cl-pages-out').textContent = e.pages;
    $('#cl-products-out').textContent = e.products;
    if (!briefEdited) $('#cl-brief').value = briefText(e);
  }

  function normaliseUrl(v) {
    v = (v || '').trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v); return /\./.test(u.hostname) ? u : null; } catch (e) { return null; }
  }

  function analyse(kind) {
    var input = $(kind === 'ref' ? '#cl-ref' : '#cl-cur');
    var out = $(kind === 'ref' ? '#cl-ref-out' : '#cl-cur-out');
    var btn = $('[data-analyse="' + kind + '"]');
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
      'data.shop.selector=' + encodeURIComponent('script[src*="cdn.shopify.com"]'), 'data.shop.attr=src',
      'data.wp.selector=' + encodeURIComponent('script[src*="wp-content"],script[src*="wp-includes"]'), 'data.wp.attr=src',
      'data.wix.selector=' + encodeURIComponent('script[src*="parastorage.com"]'), 'data.wix.attr=src',
      'data.sqsp.selector=' + encodeURIComponent('script[src*="squarespace"]'), 'data.sqsp.attr=src',
      'data.bc.selector=' + encodeURIComponent('script[src*="bigcommerce"]'), 'data.bc.attr=src'
    ].join('&');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    fetch('https://api.microlink.io/?' + q, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res || res.status !== 'success' || !res.data) throw new Error('fail');
        showRef(kind, u, res.data);
      })
      .catch(function () {
        clearTimeout(timer);
        refInfo[kind] = { url: u.href, ok: false };
        out.className = 'cl-ref';
        out.innerHTML = '<div class="cl-ref__shot">No preview</div><div><p class="cl-ref__name">' + esc(u.hostname) + '</p>' +
          '<p class="cl-ref__msg">I couldn’t read this site automatically (some sites block it). That’s fine: set the options below and I’ll look at it myself when you send the brief.</p></div>';
        renderEstimate();
      })
      .then(function () { btn.disabled = false; });
  }

  function showRef(kind, u, d) {
    var out = $(kind === 'ref' ? '#cl-ref-out' : '#cl-cur-out');
    var form = $('#cl-calc-form');
    var host = u.hostname.replace(/^www\./, '');
    var paths = {}, products = {}, collections = {};
    (Array.isArray(d.links) ? d.links : []).forEach(function (href) {
      try {
        var l = new URL(href, u.href);
        if (l.hostname.replace(/^www\./, '') !== host) return;
        var p = l.pathname.replace(/\/$/, '') || '/';
        if (/\/products?\//.test(p)) products[p] = 1;
        else if (/\/(collections|product-category|shop)\//.test(p)) collections[p] = 1;
        else paths[p] = 1;
      } catch (e) { /* ignore */ }
    });
    var nPages = Object.keys(paths).length, nProducts = Object.keys(products).length, nCollections = Object.keys(collections).length;
    var langs = Array.isArray(d.langs) ? d.langs.filter(function (x, i, a) { return x && a.indexOf(x) === i && x !== 'x-default'; }) : [];
    var platform = d.shop ? 'Shopify' : d.wp ? 'WordPress / WooCommerce' : d.wix ? 'Wix' : d.sqsp ? 'Squarespace' : d.bc ? 'BigCommerce' : '';
    var tags = [[platform ? 'Built on ' + platform : 'Platform not detected', !!d.shop]];
    if (nPages) tags.push([nPages + ' pages linked', nPages > 15]);
    if (nCollections) tags.push([nCollections + ' collections', nCollections > 8]);
    if (nProducts) tags.push([nProducts + ' products on home page', false]);
    if (langs.length > 1) tags.push([langs.length + ' languages', true]);

    var suggestPages = Math.min(40, Math.max(+form.pages.value, Math.round(5 + nPages * 0.4 + Math.min(nCollections, 10) * 0.5)));
    form.pages.value = suggestPages;
    if (langs.length > 1) { $('input[name="feat"][value="translate"]', form).checked = true; }
    if (nCollections > 8) $('input[name="feat"][value="megamenu"]', form).checked = true;
    var note = 'I’ve adjusted the pages' + (langs.length > 1 || nCollections > 8 ? ' and features' : '') + ' to match. Change anything below.';
    if (kind === 'cur') {
      if (d.shop) { form.querySelector('input[name="project"][value="redesign"]').checked = true; note = 'Your store is on Shopify, so I’ve set this up as a redesign.'; }
      else if (platform) {
        form.querySelector('input[name="project"][value="migrate"]').checked = true;
        var map = { 'WordPress / WooCommerce': 'WooCommerce', 'Wix': 'Wix', 'Squarespace': 'Squarespace', 'BigCommerce': 'BigCommerce' };
        form.from.value = map[platform] || 'Other';
        note = 'Your site is on ' + platform + ', so I’ve set this up as a migration to Shopify.';
      }
    }
    refInfo[kind] = { url: u.href, ok: true, platform: platform || 'not detected', pages: nPages, langs: langs.length };
    var shot = d.screenshot && d.screenshot.url ? d.screenshot.url : d.image && d.image.url ? d.image.url : '';
    out.className = 'cl-ref';
    out.innerHTML = '<div class="cl-ref__shot">' + (shot ? '<img src="' + esc(shot) + '" alt="Screenshot of ' + esc(host) + '">' : 'No preview') + '</div>' +
      '<div><p class="cl-ref__name">' + esc(d.title || host) + '</p><p class="cl-ref__url">' + esc(u.href) + '</p>' +
      '<ul class="cl-ref__tags">' + tags.map(function (t) { return '<li' + (t[1] ? ' class="is-hot"' : '') + '>' + esc(t[0]) + '</li>'; }).join('') + '</ul>' +
      '<p class="cl-ref__msg">' + esc(note) + '</p></div>';
    renderEstimate();
  }

  function siteLine(label, info, raw) {
    if (info) return label + info.url + (info.ok ? ' (' + info.platform + ', ' + info.pages + ' pages linked' + (info.langs > 1 ? ', ' + info.langs + ' languages' : '') + ')' : '');
    return raw ? label + raw : '';
  }
  function briefText(e) {
    e = e || estimate();
    return [
      'Hi Nitin, I used the estimator on codelabsstorefront.com.',
      '',
      siteLine('Store I like: ', refInfo.ref, $('#cl-ref').value.trim()),
      siteLine('My current site: ', e.project !== 'New store' ? refInfo.cur : null, e.project !== 'New store' ? $('#cl-cur').value.trim() : ''),
      'Project: ' + e.project + (e.from ? ' (from ' + e.from + ')' : ''),
      'Industry: ' + e.industry,
      'Selling to: ' + (e.markets.length ? e.markets.join(', ') : 'not set'),
      'Design: ' + e.design + ' · ' + e.brand,
      'Pages: ' + e.pages + ' · Products: ' + e.products + ' · ' + e.variants,
      'Features: ' + (e.feats.length ? e.feats.join(', ') : 'none selected'),
      'Copy: ' + e.copy,
      'Timeline: ' + (e.rush ? 'rush' : 'standard') + ' (' + e.weeks + ')' + (e.launch ? ' · launch date ' + e.launch : ''),
      e.care ? 'Interested in ongoing store care after launch' : '',
      e.notes ? 'Notes: ' + e.notes : '',
      'Estimate: ' + money(e.low) + ' – ' + money(e.high)
    ].filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }

  function initCalc() {
    var form = $('#cl-calc-form');
    if (!form) return;
    form.addEventListener('input', function (e) { if (e.target.name !== 'notes' || !briefEdited) renderEstimate(); });
    form.addEventListener('change', renderEstimate);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $$('[data-analyse]').forEach(function (b) { b.addEventListener('click', function () { analyse(b.getAttribute('data-analyse')); }); });
    ['#cl-ref', '#cl-cur'].forEach(function (sel) {
      $(sel).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); analyse(sel === '#cl-ref' ? 'ref' : 'cur'); } });
    });
    $('#cl-brief').addEventListener('input', function () { briefEdited = true; });
    $('#cl-send').addEventListener('click', function () {
      var text = $('#cl-brief').value || briefText();
      // Open Fiverr synchronously (inside the click) so pop-up blockers allow it
      var win = window.open(FIVERR_PROFILE, '_blank');
      if (win) win.opener = null;
      copy(text).then(function () {
        toast('Brief copied. Paste it into a message to me on Fiverr.');
        $('#cl-send-note').textContent = 'Copied! On Fiverr, click “Contact me” and paste your brief.';
      }).catch(function () {
        window.prompt('Copy your brief, then paste it into a message on Fiverr:', text);
      });
    });
    renderEstimate();
  }

  /* ---------------- How it works: self-playing, clickable ---------------- */
  function initFlow() {
    var root = $('#cl-flow');
    if (!root) return;
    var tabs = $$('[data-go]', root), panels = $$('.cl-scene', root), fill = $('#cl-flow-fill');
    var STEP = 4600, step = 1, timer = null, inView = false, paused = false;
    function show(n, auto) {
      step = n;
      tabs.forEach(function (t) {
        var k = +t.getAttribute('data-go');
        t.setAttribute('aria-selected', k === n ? 'true' : 'false');
        t.tabIndex = k === n ? 0 : -1;
        t.classList.toggle('is-done', k < n);
      });
      panels.forEach(function (p, i) { p.hidden = i + 1 !== n; });
      fill.style.transitionDuration = auto && !reduceMotion ? STEP + 'ms' : '.45s';
      fill.style.transitionTimingFunction = auto ? 'linear' : '';
      fill.style.width = (n / tabs.length * 100) + '%';
    }
    function schedule() {
      clearTimeout(timer);
      if (!inView || paused || reduceMotion) return;
      timer = setTimeout(function () {
        var next = step === tabs.length ? 1 : step + 1;
        if (next === 1) { fill.style.transitionDuration = '0s'; fill.style.width = '0%'; void fill.offsetWidth; }
        show(next, true);
        schedule();
      }, STEP);
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { show(+t.getAttribute('data-go')); paused = true; clearTimeout(timer); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = step + (e.key === 'ArrowRight' ? 1 : -1);
        n = n < 1 ? tabs.length : n > tabs.length ? 1 : n;
        show(n); tabs[n - 1].focus(); paused = true; clearTimeout(timer);
      });
    });
    root.addEventListener('mouseenter', function () { clearTimeout(timer); });
    root.addEventListener('mouseleave', function () { if (!paused) schedule(); });
    show(1, false);
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) {
      var was = inView;
      inView = en[0].isIntersecting;
      if (inView && !was) { show(step, true); schedule(); }
      if (!inView) clearTimeout(timer);
    }, { threshold: 0.4 }).observe(root);
  }

  /* Featured project image: local screenshot, then a live screenshot service, then a styled placeholder */
  function initFeatured() {
    var img = $('#cl-feat-img');
    if (!img) return;
    var list = (img.getAttribute('data-fallbacks') || '').split('|').filter(Boolean);
    var fail = function () {
      var next = list.shift();
      if (next) img.src = next;
      else img.style.display = 'none';
    };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
  }

  /* ---------------- GSAP extras (one tween per element) ---------------- */
  function initGsap() {
    var gsap = window.gsap;
    if (!gsap || reduceMotion) return;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('[data-hero]', { y: 26, opacity: 0, duration: .9, stagger: .08 })
      .from('.cl-portrait', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'power4.out' }, 0.15)
      .from('.cl-hero__img', { scale: 1.08, duration: 1.6 }, 0.15);
  }

  function boot() {
    initLenis();
    initAnchors();
    initHeader();
    initImages();
    initBand();
    initReveal();
    initCalc();
    initFlow();
    initFeatured();
    initGsap();
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
