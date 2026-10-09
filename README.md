# codelabsstorefront.com

The business site for Codelabs, fronted by Nitin. It's built as a Shopify-style storefront: services are a product collection, pricing is a product page, the cart is a drawer, and checkout is a quote request. No payment is taken.

Plain HTML, CSS and JS, with no build step. Upload the folder to any static host.

```
index.html          the storefront (all sections)
privacy.html        privacy notice (FormSubmit, ipapi, localStorage)
404.html            not-found page
assets/styles.css   shared styles (all classes prefixed cl-)
assets/site.js      currency, cart, product page, build demo, thread, checkout
assets/og-image.png 1200×630 social card (source: tools/og-image.html)
assets/img/         put nitin-cutout.webp here (see README inside)
robots.txt, sitemap.xml
```

## Settings to know

- **Quote email**: `info@codelabsstorefront.com`, set in `CONFIG` at the top of `assets/site.js`, in the JSON-LD and in the footer. The first FormSubmit submission sends an activation email to that address, which must be clicked before requests arrive.
- **Currencies**: USD base. GBP = ×1.2 and AUD = ×0.9; values of 100 or more end in 9, smaller values round to whole numbers. Annual care = 10× the monthly price shown. Detection order: saved choice → ipapi.co (GB/AU) → time zone.
- **Prices** live in the HTML as `data-usd` attributes, so search engines see real USD prices without running JS.
- **Libraries**: GSAP 3.12.5 + ScrollTrigger (cdnjs) and Lenis 1.1.13 (jsDelivr). They're optional; the site works fully without them.

## Name and photo

The site says "Nitin, founder of Codelabs" and never uses the surname, and it doesn't link LinkedIn. Schema `Person.name` is "Nitin". This keeps the business site from ranking for a full-name search by recruiters, and it never links to the job site.

Until `assets/img/nitin-cutout.webp` is added, the hero and About section fall back to the Fiverr profile portrait in an arch frame.
