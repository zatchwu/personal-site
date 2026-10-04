# Zachary Wu's personal website

A small, static website for **zvxywu.com**. Compact HTML/CSS layout with a lightweight TypeScript/Canvas protein stencil. No framework, remote fonts, or package installation required. Browser-ready JavaScript is committed, so publishing needs no build step.

## Preview locally

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>. Stop the server with Ctrl-C. Use an HTTP server instead of double-clicking the HTML files, since links are relative to the site root.

## Edit content

- `about.md`: About Me text. Edit this Markdown file, save, and refresh the preview; no build command is needed. Blank lines create paragraphs; links, bold, italics, and lists work. Leave out a title heading.
- `index.html`: publications, headshot markup, and static introduction fallback.
- `assets/style.css`: shared layout, typography, colors, and mobile styles.
- `blog/index.html`: blog index, currently empty and unlinked from the homepage.
- `templates/post.html.txt`: reusable HTML post template; not a published post.
- `CNAME`: intended custom domain, `zvxywu.com`.

The About Me section loads `about.md` using a locally bundled [Marked](https://marked.js.org/) parser (`assets/vendor/marked`, MIT license). It makes no third-party request. Publish `about.md` with the rest of the site; updating that file updates the introduction. Raw HTML and Markdown comments are omitted. Links accept HTTP, HTTPS, or mailto URLs; Markdown images must come from this site. The placeholder paragraphs in `index.html` remain as a fallback if JavaScript is disabled or the Markdown request fails; you can replace them with a matching plain-text introduction before publishing.

Each publication is an `article.paper`, grouped by year. Titles link to the papers; citation PDFs are not mirrored here. The source CV itself is not included in the public site.

The headshot uses `assets/headshot.webp`. Scrub metadata from any replacement before putting it in `assets/`.

### Add a post

1. Create `blog/your-post-slug/index.html` by copying `templates/post.html.txt`.
2. Replace the title (both occurrences), description, canonical URL slug, date, and body paragraphs.
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

## GitHub Pages, when ready

No remote repository, deployment, or DNS changes have been made.

1. Put these files in the GitHub repository you want to publish.
2. Configure GitHub Pages to publish from the root of the appropriate branch. `.nojekyll` tells Pages to serve the static files directly.
3. Configure the custom domain as `zvxywu.com`. The `CNAME` file already contains it.
4. Follow GitHub's current custom-domain instructions to verify domain ownership, set the DNS records for your GitHub account, and enable HTTPS.

Official guide: <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site>.

The root-relative links assume either a custom domain or a `USERNAME.github.io` user site. A project site at `USERNAME.github.io/REPOSITORY/` needs a URL-prefix adjustment if used before the custom domain is configured.

Before publishing, replace or remove the visible bracketed placeholders.

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

The old 6CUN source assets are retained as reference but are not loaded by the site.

## Publication sources

The initial 11 entries and contribution notes came from the supplied June 2026 CV. Paper links were checked against publisher, author-manuscript, or repository metadata. Long author lists follow the CV's abbreviated form. The author order for “Protein sequence design with deep generative models” follows the [author manuscript](https://arxiv.org/abs/2104.04457), which differs from the CV. The 2023 chapter links to its freely accessible preprint.

## Security and privacy

Pages restrict scripts, styles, images, and fetches to this site through a Content Security Policy, disable embedded objects/frames and form submissions, and use a no-referrer policy. Keep these meta tags when adding pages. There are no analytics, third-party runtime scripts, or remote font requests. Markdown URL filtering rejects executable URL schemes and external images. The headshot contains only image data; unpublished drafts and the original portrait are kept outside the served folder. `.gitignore` excludes Finder metadata, environment files, and common editor backups.

Everything committed to a public repository is public, including Markdown, source files, and history. Keep private notes and unreleased material outside the repository. Enable GitHub Pages **Enforce HTTPS** when configuring the custom domain.
