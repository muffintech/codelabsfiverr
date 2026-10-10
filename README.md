# codelabsstorefront.com

Portfolio site for Codelabs, fronted by Nitin. Every order goes to Fiverr: the site has no contact details, forms, email or social links, in line with Fiverr's rules on off-platform communication.

Plain HTML, CSS and JS with no build step. On Hostinger, choose **"continue as a static website"**.

```
index.html          the site
privacy.html        privacy notice (no data collected; ordering happens on Fiverr)
404.html            not-found page
assets/styles.css   styles (classes prefixed cl-)
assets/site.js      header, reveals, scrolling band, custom quote estimator
assets/img/         photos and portfolio screenshots
assets/og-image.png 1200×630 social card (source: tools/og-image.html, render with tools/render.mjs)
```

## Editing

- **Prices**: in `index.html`, under `<!-- Packages … EDIT PRICES HERE -->`, and in the JSON-LD `hasOfferCatalog` near the top. Keep both in line with the Fiverr gig.
- **Fiverr links**: gig `https://www.fiverr.com/codelabs/design-and-develop-your-website`, profile `https://www.fiverr.com/codelabs`. Search and replace to change them.
- **Portfolio**: add images to `assets/img/`, then copy an `<li class="cl-shot">` in the Work grid (`data-work-grid`). For the hero marquee, copy a `<figure>` in `data-marquee`. A remote image that fails to load is removed automatically.

## Custom quote estimator

The "Custom quote" section turns a reference website and a few choices into a price range. It starts at $1,500.

- Edit the numbers in `PRICING` near the middle of `assets/site.js` (base prices per design option, price per extra page, product tiers, features, the +20% rush fee and the spread of the range).
- The reference site is read with the free Microlink API (about 50 lookups a day without a key). If it can't read a site, the estimator still works from the options.
- "Copy brief & message me on Fiverr" copies a summary to the visitor's clipboard and opens fiverr.com/codelabs. No data is sent anywhere else.

## Look

Warm cream paper (`#F4EEE3`) with a light grain, ink `#1D1B16`, Shopify green `#008060`, sun `#FFB627` and tomato `#F25C3B` accents. Fonts: Young Serif (headings), Bagel Fat One (stickers and the scrolling band), Figtree (body).

After editing CSS or JS, bump the `?v=` number on the `<link>` and `<script>` tags so browsers fetch the new files.
