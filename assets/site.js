/* Codelabs storefront. Plain JS, no build step.
   GSAP, ScrollTrigger and Lenis are optional enhancements; everything works without them. */
(function () {
  'use strict';

  var CONFIG = {
    email: 'info@codelabsstorefront.com',
    endpoint: 'https://formsubmit.co/ajax/info@codelabsstorefront.com',
    geoUrl: 'https://ipapi.co/json/',
    storeKeyCart: 'cl-cart-v1',
    storeKeyCurrency: 'cl-currency'
  };

  var doc = document.documentElement;
  doc.classList.add('cl-js');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------
     Currency: fixed price lists, not live conversion.
     GBP = USD x 1.2, AUD = USD x 0.9. Values of 100+ end in 9, under 100 round to whole.
  ------------------------------------------------------------------ */
  var CURRENCIES = {
    USD: { rate: 1, symbol: '$', name: 'US dollars' },
    GBP: { rate: 1.2, symbol: '£', name: 'British pounds' },
    AUD: { rate: 0.9, symbol: 'A$', name: 'Australian dollars' }
  };
  var currency = 'USD';

  function convert(usd, cur) {
    var c = CURRENCIES[cur || currency];
    if (c.rate === 1) return usd;
    var v = usd * c.rate;
    if (v >= 100) return Math.round((v + 1) / 10) * 10 - 1;
    return Math.round(v);
  }
  function money(amount, cur) {
    var c = CURRENCIES[cur || currency];
    return c.symbol + Math.round(amount).toLocaleString('en-US');
  }
  function priceText(usd, period, cur) {
    var amount = convert(usd, cur);
    if (period === 'yr') amount = amount * 10; // annual = 10 x monthly (2 months free)
    return money(amount, cur) + (period === 'mo' ? '/mo' : period === 'yr' ? '/yr' : '');
  }

  function renderPrices() {
    $$('.cl-price[data-usd]').forEach(function (el) {
      el.textContent = priceText(+el.getAttribute('data-usd'), el.getAttribute('data-period'));
    });
    $$('[data-currency-name]').forEach(function (el) { el.textContent = CURRENCIES[currency].name; });
    var sel = $('#cl-currency');
    if (sel) sel.value = currency;
    renderCart();
  }

  function setCurrency(cur, remember) {
    if (!CURRENCIES[cur]) return;
    currency = cur;
    if (remember) store(CONFIG.storeKeyCurrency, cur);
    renderPrices();
  }

  function currencyFromCountry(cc) {
    if (cc === 'GB') return 'GBP';
    if (cc === 'AU') return 'AUD';
    return 'USD';
  }
  function currencyFromTimezone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/^Europe\/(London|Belfast)$|^Europe\/(Guernsey|Jersey|Isle_of_Man)$/.test(tz)) return 'GBP';
      if (/^Australia\//.test(tz)) return 'AUD';
    } catch (e) { /* ignore */ }
    return 'USD';
  }
  var detectedCountry = '';

  function initCurrency() {
    var saved = store(CONFIG.storeKeyCurrency);
    var guess = currencyFromTimezone();
    setCurrency(saved && CURRENCIES[saved] ? saved : guess, false);

    var sel = $('#cl-currency');
    if (sel) sel.addEventListener('change', function () {
      setCurrency(sel.value, true);
      toast('Prices now in ' + CURRENCIES[currency].name);
    });

    // IP lookup refines the guess (and pre-fills the country field). A saved choice always wins.
    if (!window.fetch) return;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 3500);
    fetch(CONFIG.geoUrl, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        clearTimeout(timer);
        if (!data || data.error) return;
        detectedCountry = data.country_name || '';
        var countryInput = $('[data-country]');
        if (countryInput && !countryInput.value) countryInput.value = detectedCountry;
        if (!store(CONFIG.storeKeyCurrency) && data.country_code) setCurrency(currencyFromCountry(data.country_code), false);
      })
      .catch(function () { clearTimeout(timer); });
  }

  /* ------------------------------------------------------------------
     Cart
  ------------------------------------------------------------------ */
  var cart = [];
  try { cart = JSON.parse(store(CONFIG.storeKeyCart) || '[]') || []; } catch (e) { cart = []; }
  if (!Array.isArray(cart)) cart = [];

  function saveCart() { store(CONFIG.storeKeyCart, JSON.stringify(cart)); }

  function addItem(item) {
    var found = null;
    cart.forEach(function (it) { if (it.id === item.id) found = it; });
    if (found) {
      if (item.qtyAllowed) found.qty += 1;
    } else {
      item.qty = 1;
      cart.push(item);
    }
    saveCart();
    renderCart();
    var btn = $('.cl-cartbtn');
    if (btn) { btn.classList.remove('is-bump'); void btn.offsetWidth; btn.classList.add('is-bump'); }
  }

  function linePrice(it) {
    var unit = convert(it.usd);
    if (it.period === 'yr') unit = unit * 10;
    return unit * it.qty;
  }

  function totals() {
    var t = { once: 0, mo: 0, yr: 0, from: false, count: 0 };
    cart.forEach(function (it) {
      var p = linePrice(it);
      if (it.period === 'mo') t.mo += p; else if (it.period === 'yr') t.yr += p; else t.once += p;
      if (it.from) t.from = true;
      t.count += it.qty;
    });
    return t;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function linesHTML(editable) {
    if (!cart.length) return '';
    return '<div class="cl-lines">' + cart.map(function (it, i) {
      var sub = it.sub ? '<span class="cl-line__sub">' + esc(it.sub) + '</span>' : '';
      var price = (it.from ? 'from ' : '') + money(linePrice(it)) + (it.period === 'mo' ? '/mo' : it.period === 'yr' ? '/yr' : '');
      var ctrl = '';
      if (editable) {
        ctrl = '<div class="cl-line__ctrl' + (it.qtyAllowed ? '' : ' cl-line__ctrl--rm') + '">' +
          (it.qtyAllowed ? '<span class="cl-qty"><button type="button" data-qty-dec="' + i + '" aria-label="Decrease quantity of ' + esc(it.name) + '">−</button><output>' + it.qty + '</output><button type="button" data-qty-inc="' + i + '" aria-label="Increase quantity of ' + esc(it.name) + '">+</button></span>' : '') +
          '<button type="button" class="cl-line__rm" data-remove="' + i + '">Remove</button></div>';
      } else if (it.qty > 1) {
        sub = '<span class="cl-line__sub">' + (it.sub ? esc(it.sub) + ' · ' : '') + 'Qty ' + it.qty + '</span>';
      }
      return '<div class="cl-line"><span class="cl-line__name">' + esc(it.name) + '</span><span class="cl-line__price">' + price + '</span>' + sub + ctrl + '</div>';
    }).join('') + '</div>';
  }

  function totalsHTML() {
    var t = totals();
    if (!t.count) return '';
    var rows = '';
    var pre = t.from ? 'from ' : '';
    if (t.once) rows += '<div class="cl-totals__row"><span>Estimated total</span><b>' + pre + money(t.once) + '</b></div>';
    if (t.mo) rows += '<div class="cl-totals__row' + (t.once ? ' cl-totals__row--sub' : '') + '"><span>Monthly plan</span>' + (t.once ? '<span>' : '<b>') + money(t.mo) + '/mo' + (t.once ? '</span>' : '</b>') + '</div>';
    if (t.yr) rows += '<div class="cl-totals__row' + (t.once || t.mo ? ' cl-totals__row--sub' : '') + '"><span>Annual plan</span>' + (t.once || t.mo ? '<span>' : '<b>') + money(t.yr) + '/yr' + (t.once || t.mo ? '</span>' : '</b>') + '</div>';
    rows += '<div class="cl-totals__row cl-totals__row--sub"><span>Due today</span><span>' + money(0) + '</span></div>';
    return '<div class="cl-totals">' + rows + '</div>';
  }

  function emptyHTML() {
    return '<p class="cl-empty">Your cart is empty. Start with the most requested package:</p>' +
      '<div class="cl-suggest">' +
      '<button type="button" data-quick-add="shopify:growth">Shopify Store, Growth <b>' + money(convert(749)) + '</b></button>' +
      '<button type="button" data-quick-add="care:growth">Store Care, Growth <b>' + money(convert(299)) + '/mo</b></button>' +
      '<button type="button" data-quick-add="custom:feature">Custom Feature <b>' + money(convert(299)) + '</b></button>' +
      '</div>';
  }

  function renderCart() {
    var t = totals();
    $$('[data-cart-count]').forEach(function (el) { el.textContent = t.count; });
    var lines = $('[data-cart-lines]');
    if (lines) lines.innerHTML = cart.length ? linesHTML(true) : emptyHTML();
    var tot = $('[data-cart-totals]');
    if (tot) tot.innerHTML = totalsHTML();
    var checkoutBtn = $('[data-cart-checkout]');
    if (checkoutBtn) checkoutBtn.textContent = cart.length ? 'Check out: request a quote' : 'Send a message instead';
    var summary = $('[data-summary]');
    if (summary) {
      summary.innerHTML = cart.length
        ? linesHTML(true) + totalsHTML()
        : '<p class="cl-empty">No packages added yet. That’s fine: describe the project and I’ll suggest the right one. Or <a href="#pricing">browse packages</a>.</p>';
    }
  }

  function onCartClick(e) {
    var t = e.target.closest('[data-remove],[data-qty-inc],[data-qty-dec],[data-quick-add]');
    if (!t) return;
    if (t.hasAttribute('data-remove')) { cart.splice(+t.getAttribute('data-remove'), 1); }
    else if (t.hasAttribute('data-qty-inc')) { cart[+t.getAttribute('data-qty-inc')].qty += 1; }
    else if (t.hasAttribute('data-qty-dec')) {
      var it = cart[+t.getAttribute('data-qty-dec')];
      it.qty -= 1;
      if (it.qty < 1) cart.splice(cart.indexOf(it), 1);
    } else if (t.hasAttribute('data-quick-add')) {
      var parts = t.getAttribute('data-quick-add').split(':');
      var input = $('#pdp-' + parts[0] + ' input[value="' + parts[1] + '"]');
      if (input) addVariant(parts[0], input);
      return;
    }
    saveCart();
    renderCart();
  }

  /* Drawer */
  var drawer = $('#cl-drawer');
  var lastFocus = null;
  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cl-locked');
    $$('[data-cart-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    if (lenis) lenis.stop();
    setTimeout(function () { var p = $('.cl-drawer__panel', drawer); if (p) p.focus(); }, 50);
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cl-locked');
    $$('[data-cart-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lenis) lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------------------------
     Product page (pricing)
  ------------------------------------------------------------------ */
  function billingFor(product) {
    var b = $('input[name="billing-' + product + '"]:checked');
    return b ? b.value : null;
  }

  function updatePdp(pdp) {
    var product = pdp.getAttribute('data-product');
    var checked = $('.cl-variants input:checked', pdp);
    if (!checked) return;
    $$('.cl-variant', pdp).forEach(function (l) { l.classList.toggle('is-checked', l.contains(checked)); });
    $$('[data-variant-panel]', pdp).forEach(function (p) { p.hidden = p.getAttribute('data-variant-panel') !== checked.value; });
    var out = $('[data-price-out]', pdp);
    var billing = billingFor(product);
    if (out) {
      out.setAttribute('data-usd', checked.getAttribute('data-usd'));
      if (checked.hasAttribute('data-recurring')) out.setAttribute('data-period', billing || 'mo');
      out.textContent = priceText(+checked.getAttribute('data-usd'), out.getAttribute('data-period'));
    }
    var meta = $('[data-meta-out]', pdp);
    if (meta) meta.textContent = checked.getAttribute('data-meta') || '';
    var from = $('[data-from-out]', pdp);
    if (from) from.hidden = !checked.hasAttribute('data-from');
    // Variant pills on recurring products follow the billing toggle
    if (billing) $$('.cl-variant .cl-price', pdp).forEach(function (el) { el.setAttribute('data-period', billing); el.textContent = priceText(+el.getAttribute('data-usd'), billing); });
  }

  function addVariant(product, input) {
    var pdp = $('#pdp-' + product);
    var recurring = input.hasAttribute('data-recurring');
    var billing = recurring ? (billingFor(product) || 'mo') : null;
    var base = pdp.getAttribute('data-product-name');
    var name = base + ', ' + input.getAttribute('data-name');
    if (base === 'Custom Shopify' || base === 'Web & Mobile App') name = input.getAttribute('data-name');
    addItem({
      id: product + ':' + input.value + (billing ? ':' + billing : ''),
      name: name,
      sub: (input.getAttribute('data-meta') || '') + (billing === 'yr' ? ' · billed annually' : billing === 'mo' ? ' · billed monthly' : ''),
      usd: +input.getAttribute('data-usd'),
      period: billing,
      from: input.hasAttribute('data-from'),
      qtyAllowed: false
    });
    openDrawer();
  }

  function selectTab(name, focus) {
    $$('.cl-tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $$('.cl-pdp').forEach(function (p) {
      var on = p.getAttribute('data-product') === name;
      if (on && p.hidden) { p.hidden = false; p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      else if (!on) p.hidden = true;
    });
    if (thread) thread.refresh();
  }

  function initPricing() {
    $$('.cl-pdp').forEach(function (pdp) {
      var product = pdp.getAttribute('data-product');
      pdp.addEventListener('change', function (e) {
        if (e.target.matches('.cl-variants input, .cl-billing input')) updatePdp(pdp);
      });
      updatePdp(pdp);

      var addBtn = $('[data-add-variant]', pdp);
      if (addBtn) addBtn.addEventListener('click', function () {
        var checked = $('.cl-variants input:checked', pdp);
        if (checked) addVariant(product, checked);
      });

      var extrasBtn = $('[data-add-extras]', pdp);
      if (extrasBtn) extrasBtn.addEventListener('click', function () {
        var picked = $$('input[data-extra]:checked', pdp);
        if (!picked.length) { toast('Tick one or more extras first'); return; }
        picked.forEach(function (cb) { addExtra(cb); cb.checked = false; });
        openDrawer();
      });
    });

    $$('[data-add-one]').forEach(function (btn) {
      btn.addEventListener('click', function () { addExtra(btn); toast(btn.getAttribute('data-name') + ' added to cart'); });
    });

    var tablist = $('.cl-tabs');
    if (tablist) {
      tablist.addEventListener('click', function (e) {
        var t = e.target.closest('.cl-tab');
        if (t) selectTab(t.getAttribute('data-tab'));
      });
      tablist.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var tabs = $$('.cl-tab');
        var i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        i = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        selectTab(tabs[i].getAttribute('data-tab'), true);
        e.preventDefault();
      });
    }

    $$('[data-open-product]').forEach(function (a) {
      a.addEventListener('click', function () { selectTab(a.getAttribute('data-open-product')); });
    });
  }

  function addExtra(el) {
    addItem({
      id: 'extra:' + el.getAttribute('data-id'),
      name: el.getAttribute('data-name'),
      sub: 'Extra',
      usd: +el.getAttribute('data-usd'),
      period: null,
      from: false,
      qtyAllowed: el.hasAttribute('data-qty')
    });
  }

  /* ------------------------------------------------------------------
     Toast
  ------------------------------------------------------------------ */
  var toastTimer;
  function toast(msg) {
    var el = $('#cl-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  /* ------------------------------------------------------------------
     Smooth scrolling (Lenis, optional)
  ------------------------------------------------------------------ */
  var lenis = null;
  function initLenis() {
    if (reduceMotion || typeof window.Lenis !== 'function') return;
    try {
      lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      } else {
        var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { lenis = null; }
  }

  function scrollToEl(el) {
    if (!el) return;
    var offset = -(($('#cl-header') || {}).offsetHeight || 0) - 8;
    if (lenis) lenis.scrollTo(el, { offset: offset });
    else {
      var y = el.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      closeDrawer();
      closeMenu();
      if (a.hasAttribute('data-consult')) {
        var msg = $('#cl-form textarea[name="message"]');
        var call = $('#cl-form input[value="Video call"]');
        if (call) call.checked = true;
        if (msg && !msg.value) msg.placeholder = 'I’d like a free video consultation about…';
      }
      scrollToEl(id === 'top' ? document.body : target);
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      if (id === 'checkout') setTimeout(function () { var f = $('#cl-form input[name="name"]'); if (f) f.focus({ preventScroll: true }); }, 900);
    });
  }

  /* ------------------------------------------------------------------
     Header, nav rail and active section
  ------------------------------------------------------------------ */
  var menuBtn = $('#cl-menubtn');
  var nav = $('#cl-nav');
  function closeMenu() {
    if (!nav || !nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }
  function initNav() {
    if (menuBtn) menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    var header = $('#cl-header');
    var hero = $('.cl-hero');
    var onScroll = function () {
      var y = window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      var railAt = hero ? hero.offsetTop + hero.offsetHeight * 0.75 : 600;
      document.body.classList.toggle('cl-rail', y > railAt);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!('IntersectionObserver' in window)) return;
    var links = $$('[data-nav]');
    var sections = links.map(function (l) { return document.getElementById(l.getAttribute('data-nav')); }).filter(Boolean);
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      sections.forEach(function (s) { if (visible[s.id]) current = current || s.id; });
      links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('data-nav') === current); if (l.getAttribute('data-nav') === current) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll and count-ups (IntersectionObserver)
  ------------------------------------------------------------------ */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduceMotion) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    // Stagger siblings within the same list
    items.forEach(function (el) {
      var sibs = el.parentElement ? $$(':scope > [data-reveal]', el.parentElement) : [];
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', (i % 4) * 0.08 + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var to = parseFloat(el.getAttribute('data-count'));
        var dec = +(el.getAttribute('data-decimals') || 0);
        var start = performance.now();
        var dur = 1400;
        var tick = function (now) {
          var p = Math.min(1, (now - start) / dur);
          var v = to * (1 - Math.pow(1 - p, 3));
          el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Hero photo: cut-out if present, otherwise the profile portrait
  ------------------------------------------------------------------ */
  function initPhotos() {
    var hero = $('.cl-hero');
    var img = $('#cl-hero-img');
    var fig = img && img.parentElement;
    var about = $('#cl-about-img');
    var aboutFig = about && about.parentElement;

    function useCutout() {
      hero.classList.add('cl-hero--cutout');
      fig.classList.add('is-ready');
      if (aboutFig) aboutFig.classList.add('is-cutout');
      if (thread) thread.refresh();
    }
    function usePortrait() {
      if (img.getAttribute('data-fallback-used')) return;
      img.setAttribute('data-fallback-used', '1');
      img.removeAttribute('width'); img.removeAttribute('height');
      hero.classList.add('cl-hero--portrait');
      img.addEventListener('load', function () { fig.classList.add('is-ready'); });
      img.addEventListener('error', function () { fig.style.display = 'none'; });
      img.src = img.getAttribute('data-fallback-src');
      if (about) {
        about.addEventListener('error', function () { aboutFig.style.display = 'none'; });
        about.src = about.getAttribute('data-fallback-src');
        aboutFig.classList.add('is-portrait');
      }
    }
    if (!img || !hero) return;
    if (img.complete && img.naturalWidth) useCutout();
    else if (img.complete) usePortrait();
    else {
      img.addEventListener('load', function () { if (!img.getAttribute('data-fallback-used')) useCutout(); }, { once: true });
      img.addEventListener('error', usePortrait, { once: true });
    }
  }

  /* Remote images that fail get a tidy placeholder */
  function initImgFallbacks() {
    $$('img[data-img-fallback]').forEach(function (img) {
      var fail = function () {
        if (img.getAttribute('data-failed')) return;
        img.setAttribute('data-failed', '1');
        img.style.visibility = 'hidden';
        var fb = document.createElement('span');
        fb.className = 'cl-imgfb';
        fb.setAttribute('aria-hidden', 'true');
        fb.textContent = img.getAttribute('data-img-fallback');
        img.parentElement.appendChild(fb);
      };
      if (img.complete && !img.naturalWidth && img.currentSrc) fail();
      img.addEventListener('error', fail);
    });
  }

  /* ------------------------------------------------------------------
     "Watch a store come together": self-playing, no scroll-jacking
  ------------------------------------------------------------------ */
  function initBuild() {
    var root = $('#cl-build');
    if (!root) return;
    var steps = $$('[data-goto]', root);
    var toasts = $('[data-mock-toasts]', root);
    var salesEl = $('[data-mock-sales]', root);
    var ordersEl = $('[data-mock-orders]', root);
    var STEP_MS = 2800, LIVE_MS = 7000;
    var stage = 1, timer = null, orderTimer = null, inView = false, userPaused = false;
    var ORDERS = [
      ['Leeds', 84], ['Melbourne', 126], ['Austin', 62], ['Bristol', 148], ['Brisbane', 95], ['Denver', 118]
    ];
    var sales = 0, orders = 0;

    function sym() { return CURRENCIES[currency].symbol; }

    function setStage(n) {
      stage = n;
      root.setAttribute('data-stage', String(n));
      steps.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-goto') === String(n) ? 'true' : 'false'); });
      root.style.setProperty('--cl-step-ms', (n === 4 ? LIVE_MS : STEP_MS) + 'ms');
      // Restart the progress bar animation
      steps.forEach(function (b) { var bar = $('.cl-build__bar', b); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; } });
      clearInterval(orderTimer);
      if (n === 4) startOrders(); else resetOrders();
    }
    function resetOrders() {
      sales = 0; orders = 0;
      if (salesEl) salesEl.textContent = sym() + '0';
      if (ordersEl) ordersEl.textContent = '0 orders';
      if (toasts) toasts.innerHTML = '';
    }
    function pushOrder(i) {
      var o = ORDERS[i % ORDERS.length];
      var amount = convert(o[1]);
      orders += 1; sales += amount;
      if (ordersEl) ordersEl.textContent = orders + (orders === 1 ? ' order' : ' orders');
      if (salesEl) salesEl.textContent = money(sales);
      if (!toasts) return;
      var t = document.createElement('div');
      t.className = 'cl-mock__toast';
      t.innerHTML = '<span>New order <b>' + money(amount) + '</b> · ' + o[0] + '</span>';
      toasts.insertBefore(t, toasts.firstChild);
      var all = toasts.children;
      if (all.length > 3) { var last = all[all.length - 1]; last.classList.add('is-out'); setTimeout(function () { if (last.parentNode) last.parentNode.removeChild(last); }, 400); }
    }
    function startOrders() {
      resetOrders();
      var i = 0;
      setTimeout(function () { if (stage === 4) pushOrder(i++); }, 500);
      orderTimer = setInterval(function () { if (stage === 4) pushOrder(i++); }, 1300);
    }
    function schedule() {
      clearTimeout(timer);
      if (!inView || userPaused || reduceMotion) return;
      timer = setTimeout(function () { setStage(stage === 4 ? 1 : stage + 1); schedule(); }, stage === 4 ? LIVE_MS : STEP_MS);
    }

    steps.forEach(function (b) {
      b.addEventListener('click', function () {
        setStage(+b.getAttribute('data-goto'));
        schedule();
      });
    });
    root.addEventListener('mouseenter', function () { userPaused = true; root.classList.add('is-paused'); clearTimeout(timer); });
    root.addEventListener('mouseleave', function () { userPaused = false; root.classList.remove('is-paused'); schedule(); });

    if (reduceMotion || !('IntersectionObserver' in window)) { setStage(4); return; }
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) { if (stage === 1) setStage(1); schedule(); }
      else { clearTimeout(timer); clearInterval(orderTimer); }
    }, { threshold: 0.35 }).observe(root);
    setStage(1);
  }

  /* ------------------------------------------------------------------
     Thread: a dashed path linking sections, with a glowing orb and a
     light trail that follows scroll and pulses each milestone it passes.
  ------------------------------------------------------------------ */
  var thread = null;
  function initThread() {
    var main = $('.cl-main');
    var heads = $$('[data-ms]');
    if (!main || heads.length < 2) return;
    var NS = 'http://www.w3.org/2000/svg';
    var box = document.createElement('div');
    box.className = 'cl-thread';
    box.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(NS, 'svg');
    var base = document.createElementNS(NS, 'path'); base.setAttribute('class', 'cl-thread__base');
    var lit = document.createElementNS(NS, 'path'); lit.setAttribute('class', 'cl-thread__lit');
    var glow = document.createElementNS(NS, 'path'); glow.setAttribute('class', 'cl-thread__glow');
    var orb = document.createElementNS(NS, 'circle'); orb.setAttribute('class', 'cl-thread__orb'); orb.setAttribute('r', '6');
    svg.appendChild(base); svg.appendChild(glow); svg.appendChild(lit);
    var msGroup = document.createElementNS(NS, 'g');
    svg.appendChild(msGroup);
    svg.appendChild(orb);
    box.appendChild(svg);
    main.insertBefore(box, main.firstChild);

    var total = 0, lut = [], msLens = [], msNodes = [], current = 0, target = 0, active = false, raf = null;
    var mq = window.matchMedia('(min-width: 1100px)');

    function build() {
      active = mq.matches && !reduceMotion;
      box.classList.toggle('is-on', active);
      if (!active) return;
      var mainRect = main.getBoundingClientRect();
      var mainTop = mainRect.top + window.pageYOffset;
      box.style.height = main.offsetHeight + 'px';
      svg.setAttribute('viewBox', '0 0 ' + main.offsetWidth + ' ' + main.offsetHeight);

      var pts = heads.filter(function (h) { return h.offsetParent !== null; }).map(function (h) {
        var r = h.getBoundingClientRect();
        var wrap = h.closest('.cl-wrap');
        var wr = wrap.getBoundingClientRect();
        var pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 24;
        var side = h.getAttribute('data-ms');
        var x = side === 'right' ? wr.right - pad + Math.min(44, pad * 0.7) : wr.left + pad - Math.min(44, pad * 0.7);
        if (h.closest('.cl-checkout__card')) x = wr.left + pad - Math.min(44, pad * 0.7);
        // Keep the line clear of the fixed nav rail on the left
        x = Math.max(x, 86);
        x = Math.min(x, main.offsetWidth - 24);
        return { x: x, y: r.top + window.pageYOffset - mainTop + 12 };
      });
      if (pts.length < 2) return;

      var d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        var bend = Math.min(180, (b.y - a.y) * 0.45);
        var turnY = b.y - bend;
        if (Math.abs(a.x - b.x) < 2) { d += ' L' + b.x + ' ' + b.y; continue; }
        d += ' L' + a.x + ' ' + turnY;
        d += ' C' + a.x + ' ' + (turnY + bend * 0.6) + ' ' + b.x + ' ' + (b.y - bend * 0.55) + ' ' + b.x + ' ' + b.y;
      }
      [base, lit, glow].forEach(function (p) { p.setAttribute('d', d); });
      total = base.getTotalLength();

      // Lookup table: path length -> y, to map scroll position onto the path
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
      target = computeTarget();
      current = target;
      draw();
    }

    function lengthAtY(y) {
      if (!lut.length) return 0;
      if (y <= lut[0][1]) return 0;
      for (var i = 1; i < lut.length; i++) {
        if (lut[i][1] >= y) {
          var a = lut[i - 1], b = lut[i];
          var t = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
          return a[0] + (b[0] - a[0]) * t;
        }
      }
      return total;
    }
    function computeTarget() {
      var mainTop = main.getBoundingClientRect().top;
      return lengthAtY(-mainTop + window.innerHeight * 0.6);
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
        if (hit && !m.hit) {
          m.pulse.classList.remove('is-pulsing'); void m.pulse.getBoundingClientRect(); m.pulse.classList.add('is-pulsing');
        }
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
    function onScroll() {
      if (!active) return;
      target = computeTarget();
      if (!raf) raf = requestAnimationFrame(loop);
    }

    var t;
    function refresh() { clearTimeout(t); t = setTimeout(build, 120); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(main);
    build();
    thread = { refresh: refresh };
  }

  /* ------------------------------------------------------------------
     GSAP extras: hero entrance and the checkout card rising on scroll.
     Each element gets exactly one tween, so nothing can be left hidden.
  ------------------------------------------------------------------ */
  function initGsap() {
    var gsap = window.gsap;
    if (!gsap || reduceMotion) return;
    var ST = window.ScrollTrigger;
    if (ST) gsap.registerPlugin(ST);

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero="name"]', { yPercent: 18, opacity: 0, duration: 1 })
      .from('[data-hero="eyebrow"]', { y: 12, opacity: 0, duration: .6 }, 0.1)
      .from('[data-hero="photo"]', { y: 40, duration: 1.1 }, 0.15)
      .from('[data-hero="card"]', { y: 24, opacity: 0, scale: .94, duration: .7, stagger: .12 }, 0.5)
      .from('[data-hero="title"]', { y: 16, opacity: 0, duration: .7 }, 0.35)
      .from('[data-hero="cta"]', { y: 16, opacity: 0, duration: .7 }, 0.45);

    if (ST) {
      gsap.fromTo('#cl-checkout-card', { y: 90, scale: .965 }, {
        y: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: '#checkout', start: 'top bottom', end: 'top 30%', scrub: 0.6 }
      });
    }
  }
  // Without GSAP the checkout card still rises once, via CSS transition
  function initCheckoutRiseFallback() {
    if (window.gsap && window.ScrollTrigger) return;
    var card = $('#cl-checkout-card');
    if (!card || reduceMotion || !('IntersectionObserver' in window)) return;
    card.style.transform = 'translateY(70px) scale(.97)';
    card.style.transition = 'transform .9s cubic-bezier(.2,.7,.2,1)';
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { card.style.transform = 'none'; io.disconnect(); }
    }, { threshold: 0.08 });
    io.observe(card);
  }

  /* ------------------------------------------------------------------
     Checkout: quote request via FormSubmit (no payment taken)
  ------------------------------------------------------------------ */
  function requestId() { return 'CL-' + String(Math.floor(10000 + Math.random() * 90000)); }

  function cartAsText() {
    if (!cart.length) return 'No packages selected';
    return cart.map(function (it) {
      return '• ' + it.name + (it.qty > 1 ? ' × ' + it.qty : '') + ' — ' + (it.from ? 'from ' : '') + money(linePrice(it)) + (it.period === 'mo' ? '/mo' : it.period === 'yr' ? '/yr' : '');
    }).join('\n');
  }
  function totalsAsText() {
    var t = totals();
    var parts = [];
    if (t.once) parts.push((t.from ? 'from ' : '') + money(t.once) + ' one-off');
    if (t.mo) parts.push(money(t.mo) + '/mo');
    if (t.yr) parts.push(money(t.yr) + '/yr');
    return parts.join(' + ') || 'n/a';
  }

  function initCheckout() {
    var form = $('#cl-form');
    if (!form) return;
    var errorEl = $('[data-form-error]', form);
    var submit = $('[data-submit]', form);

    function fieldOk(input) {
      var ok = input.checkValidity() && input.value.trim() !== '';
      input.closest('.cl-field').classList.toggle('is-invalid', !ok);
      return ok;
    }
    $$('input[required], textarea[required]', form).forEach(function (i) {
      i.addEventListener('blur', function () { if (i.value) fieldOk(i); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.hidden = true;
      var required = $$('input[required], textarea[required]', form);
      var bad = required.filter(function (i) { return !fieldOk(i); });
      if (bad.length) {
        errorEl.textContent = 'Please add your name, a valid email and a few words about the project.';
        errorEl.hidden = false;
        bad[0].focus();
        return;
      }

      var fd = new FormData(form);
      var id = requestId();
      var name = String(fd.get('name')).trim();
      var email = String(fd.get('email')).trim();
      var items = cartAsText();
      var total = totalsAsText();

      var payload = {
        _subject: 'Quote request ' + id + ' from ' + name,
        _template: 'table',
        _replyto: email,
        _autoresponse: 'Thanks, ' + name.split(' ')[0] + '. Your Codelabs quote request ' + id + ' has been received.\n\n' + items + '\nEstimated: ' + total + '\n\nI’ll reply with a confirmed quote and times for a free video call, usually within the hour. No payment has been taken.\n\nNitin\nCodelabs · codelabsstorefront.com',
        _honey: fd.get('_honey') || '',
        request_id: id,
        name: name,
        email: email,
        website: fd.get('website') || '',
        country: fd.get('country') || detectedCountry || '',
        next_step: fd.get('next_step') || '',
        currency: currency,
        items: items,
        estimated_total: total,
        message: fd.get('message') || '',
        page: location.href.split('#')[0]
      };

      // Honeypot filled: pretend success, send nothing
      if (payload._honey) { showConfirmation(id, name, email); return; }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().catch(function () { return { success: r.ok ? 'true' : 'false' }; }); })
        .then(function (res) {
          if (res && (res.success === true || res.success === 'true')) {
            showConfirmation(id, name, email);
          } else {
            throw new Error((res && res.message) || 'Request failed');
          }
        })
        .catch(function (err) {
          var body = encodeURIComponent('Request ' + id + '\n\n' + items + '\nEstimated: ' + total + '\n\n' + (payload.message || ''));
          errorEl.innerHTML = 'Sorry, that didn’t go through' + (err && err.message && err.message !== 'Failed to fetch' ? ' (' + esc(err.message) + ')' : '') + '. You can <a href="mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Quote request ' + id) + '&body=' + body + '">email the request directly</a> instead.';
          errorEl.hidden = false;
        })
        .then(function () { submit.disabled = false; submit.textContent = 'Request a quote'; });
    });

    function showConfirmation(id, name, email) {
      var done = $('[data-checkout-view="done"]');
      var grid = $('[data-checkout-view="form"]');
      $('[data-confirm-id]', done).textContent = '#' + id;
      $('[data-confirm-name]', done).textContent = name.split(' ')[0];
      $('[data-confirm-email]', done).textContent = email;
      $('[data-confirm-summary]', done).innerHTML = cart.length ? linesHTML(false) + totalsHTML() : '<p class="cl-empty">General enquiry, no packages selected.</p>';
      grid.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      scrollToEl($('#cl-checkout-card'));
      cart = [];
      saveCart();
      renderCart();
      form.reset();
      if (thread) thread.refresh();
    }
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  function boot() {
    initLenis();
    initCurrency();
    initPricing();
    renderCart();
    document.addEventListener('click', onCartClick);
    $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', openDrawer); });
    $$('[data-cart-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeMenu(); } });
    initAnchors();
    initNav();
    initImgFallbacks();
    initThread();
    initPhotos();
    initReveal();
    initCounters();
    initBuild();
    initGsap();
    initCheckoutRiseFallback();
    initCheckout();
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
