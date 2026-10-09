# codelabsstorefront.com

Portfolio site for Codelabs, fronted by Nitin. Every order goes to Fiverr: the site has no contact details, forms, email or social links, in line with Fiverr's rules on off-platform communication.

Plain HTML, CSS and JS with no build step. On Hostinger, choose **"continue as a static website"**.

```
index.html          the site
privacy.html        privacy notice (no data collected; ordering happens on Fiverr)
404.html            not-found page
assets/styles.css   styles (classes prefixed cl-)
assets/site.js      header, reveals, marquee, process demo, scroll thread
assets/img/         photos and portfolio screenshots
assets/og-image.png 1200×630 social card (source: tools/og-image.html, render with tools/render.mjs)
```

## Editing

- **Prices**: in `index.html`, under `<!-- Packages … EDIT PRICES HERE -->`, and in the JSON-LD `hasOfferCatalog` near the top. Keep both in line with the Fiverr gig.
- **Fiverr links**: gig `https://www.fiverr.com/codelabs/design-and-develop-your-website`, profile `https://www.fiverr.com/codelabs`. Search and replace to change them.
- **Portfolio**: add images to `assets/img/`, then copy an `<li class="cl-shot">` in the Work grid (`data-work-grid`). For the hero marquee, copy a `<figure>` in `data-marquee`. A remote image that fails to load is removed automatically.

## Palette

Ivory `#FBF8F1` / `#F3EEE3`, paper white, Shopify green `#008060`, deep forest `#0E2A21`, and a lime accent `#C8F169` that sets the brand apart from Shopify's own.

Fonts: Archivo (headings), Instrument Serif italic (accent words), IBM Plex Sans (body), Mulish (labels).
