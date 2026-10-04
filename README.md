# Zachary Wu's personal website

A small, static website for **zvxywu.com**. Compact HTML/CSS layout with a lightweight TypeScript/Canvas protein stencil. No framework, remote fonts, or package installation required. Browser-ready JavaScript is committed, so publishing needs no build step.

## Preview locally

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>. Stop the server with Ctrl-C. Use an HTTP server instead of double-clicking the HTML files, since links are relative to the site root.

## Edit content

- `index.html`: About Me introduction (the paragraphs in `.intro-copy`), publications, and headshot markup.
- `assets/style.css`: shared layout, typography, colors, and mobile styles.
- `assets/theme.js`: applies the system color preference or a saved light/dark choice before the page paints, and powers the navigation toggle.
- `assets/favicon-coral.png` and `favicon.ico`: transparent coral, deep blue, and slate gray protein favicon. The ICO contains 16, 32, and 48 pixel versions; both pages and the post template link to these assets.
- `blog/index.html`: blog index, currently empty and unlinked from the homepage.
- `templates/post.html.txt`: reusable HTML post template; not a published post.
- `CNAME`: custom domain, `zvxywu.com`.

The introduction is plain HTML, so it shows up without JavaScript and in link previews. Each publication is an `article.paper`, grouped by year. Optional notes such as “Preprint” or “Core Contributor” go in a `<span class="tag">` after the venue. Titles link to the papers; citation PDFs are not mirrored here. The source CV itself is not included in the public site.

The site follows the browser's light/dark preference until a visitor uses the sun/moon button in the navigation. Their choice is stored locally under `zvxywu-theme` and shared across pages and tabs. With JavaScript disabled, CSS still follows the system preference and the toggle is hidden. The protein backdrop uses lower opacity in dark mode.

The headshot uses `assets/headshot.webp`, generated from `assets/zach_raven.jpg` at 432 × 334 with Lanczos downsampling and a light Gaussian blur (radius 0.2). `assets/headshot.jpg` is the same small, smoothed photo for link previews (`og:image`), because some sites don't accept WebP; replace both together. Both optimized copies have embedded metadata removed. The full landscape frame displays at 216px wide with automatic height, beside the introduction on larger screens and above it at widths of 640px or less.

### Add a post

1. Create `blog/your-post-slug/index.html` by copying `templates/post.html.txt`.
2. Replace every `POST TITLE`, `ONE-SENTENCE SUMMARY`, and `POST-SLUG` placeholder (they also appear in the link-preview `og:` tags), then the date and body paragraphs.
3. Remove “No posts yet.” from `blog/index.html` when adding your first post.
   Restore the commented “Occasional writing” footer link in `index.html` when ready.
4. Add this entry inside its `ul.post-list`, newest first:

```html
<li>
  <time datetime="2026-10-04">October 4, 2026</time>
  <a href="/blog/your-post-slug/">Your post title</a>
</li>
```

Posts are authored in HTML for now. If writing becomes frequent, we can add a Markdown-based static generator while preserving these URLs and the zero-JavaScript reading experience.

## Hosting

The site is published with GitHub Pages from the `zatchwu/personal-site` repository and served at <https://zvxywu.com/>. The `CNAME` file holds the custom domain, and `.nojekyll` tells Pages to serve the files as-is. DNS points `zvxywu.com` at GitHub Pages and `www` at `zatchwu.github.io`. HTTPS is enforced. Pushing to the publishing branch deploys the site; GitHub Pages asks browsers to recheck files after about 10 minutes, so changes can take that long to appear.

Links are root-relative (`/assets/…`), so the site must be served from a domain root. The `zatchwu.github.io/personal-site/` address redirects to the custom domain, so this holds as long as the custom domain stays configured.

Official guide: <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site>.

## Protein stencil

The homepage uses **PDB 5UCW, author chain A only**, plus its own HEM cofactor. Broad, flat cartoon ribbons follow the deposited backbone carbonyl coordinates, with faint translucent fills and subtle lighting to show their shape. Loops remain fine traces. Thicker heme bond sticks are drawn on top so the cofactor remains visible through the ribbons, with a small shaded sphere at the iron atom. The palette is a light blue-gray with muted bronze heme. No molecular dynamics or atom displacement is simulated.

The initial view looks directly at the heme plane, with its propionates upward. Rotation follows scroll progress around a vertical axis through the heme's iron atom, which stays fixed on screen. The backdrop fills 94% of the viewport height within a frame occupying the rightmost 38.2% of the page (a golden-section division). Horizontal cropping and a soft left fade keep it behind the text without distorting the protein. It adds no page height and cannot intercept links or scrolling. Rendering stops when scrolling settles; reduced-motion preferences keep the initial orientation static. The source link is in the footer.

- `src/protein-geometry.ts`: shared cartoon geometry, styling, heme camera and projection for canvas and SVG.
- `src/protein-viewer.ts`: TypeScript renderer and scroll handling using native Canvas 2D, with no library dependencies.
- `assets/protein-geometry.js`, `assets/protein-viewer.js`: committed browser-ready output.
- `assets/protein-viewer.css`: position, scale, stencil opacity, responsive treatment.
- `assets/protein/5ucw.json`: compact coordinate model; the original PDB is archival and not fetched by the browser.
- `assets/protein/5ucw.svg`: coordinate-derived static fallback.
- `assets/protein/README.md`: source, chain selection, geometry simplifications and provenance.

Rebuild the renderer using Node 24 or newer:

```sh
node scripts/build-protein.mjs
```

This strips TypeScript annotations using Node's built-in compiler support and regenerates the matching SVG fallback from the shared cartoon geometry and styling; it does not perform type checking. No package installation is needed. To rebuild coordinates, run `python3 scripts/prepare-protein.py` first, then the Node build. Use the local HTTP preview rather than `file://` URLs for module loading and the coordinate fetch.

## Publication sources

The initial 11 entries and contribution notes came from the supplied June 2026 CV. Paper links were checked against publisher, author-manuscript, or repository metadata. Long author lists follow the CV's abbreviated form. The author order for “Protein sequence design with deep generative models” follows the [author manuscript](https://arxiv.org/abs/2104.04457), which differs from the CV. The 2023 chapter links to its freely accessible preprint.

## Security and privacy

Pages restrict scripts, styles, images, and fetches to this site through a Content Security Policy, disable embedded objects/frames and form submissions, and use a no-referrer policy. Keep these meta tags when adding pages. There are no analytics, third-party runtime scripts, or remote font requests. The optimized headshot files contain no personal metadata; unpublished drafts are kept outside the served folder. `.gitignore` excludes Finder metadata, environment files, and common editor backups.

Everything committed to a public repository is public, including Markdown, source files, and history. Keep private notes and unreleased material outside the repository.
