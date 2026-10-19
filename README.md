# Igor Abreu — Portfolio

A static portfolio for game development, rigging, animation and technical art. Vite, TypeScript and CSS. Four project galleries, local media, shareable modal links and subtle motion. Add more projects through JSON.

## Run locally

Use Node.js 24.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/.

## Edit content

Edit `public/portfolio.json`. The accompanying JSON schema provides editor suggestions.

- `profile`: name, role, hero images, email and social links. The role is used for the main cover heading and page title. Empty contact fields are hidden.
- `projects`: project titles, categories, descriptions, tools, covers and media.
- `projects[].media`: videos and images in display order. Keep IDs stable to preserve shared links.
- Media paths are relative to `public/`, with no leading slash.

The home currently has six Flowerlake backgrounds. Edit `profile.heroImages` to change their order or add images:

```json
"heroImages": [
  { "src": "media/images/flowerlake-showcase/hero/2026-05-06-234213.webp", "alt": "A forest clearing." },
  { "src": "media/images/flowerlake-showcase/hero/2026-05-07-111303.webp", "alt": "An elevated view of the forest." }
]
```

Visitors switch backgrounds with the buttons or arrow keys while the controls are focused. Images load on demand and fade in after decoding. There is no autoplay. Motion respects the reduced-motion preference. Without `heroImages`, the home uses `profile.heroImage` and `profile.heroAlt`; keep these fields set to the first image. Update the social preview image in `index.html` when changing the cover.

Example local video:

```json
{
  "id": "walk-cycle",
  "type": "video",
  "title": "Walk cycle",
  "caption": "Locomotion test in Unity.",
  "src": "media/optimized/walk-cycle.mp4",
  "poster": "media/posters/walk-cycle.webp",
  "alt": "Character walking in the game environment.",
  "aspect": "wide"
}
```

Use `"type": "image"` for stills, with the full image in `src` and a small preview in `poster`. Galleries load the preview; the viewer loads the full image when opened. Empty `src` values display placeholders. Videos load when opened and do not autoplay.

Project links use `?project=the-flower-castle`. Add `&media=gameplay` to open a specific clip. Browser Back/Forward and Escape follow the modal layers; arrow keys navigate media. Earlier `projeto` and `midia` query parameters remain readable.

## Build and check

```sh
npm test
npm run preview
```

`npm test` builds the site, checks TypeScript, then tests content, media paths and modal navigation. `dist/` is the complete static export. Only media referenced by the catalog is exported, along with the fallback image and font license. Relative asset URLs support both a domain root and a repository subpath.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. It builds, tests and deploys pushes to `main`, or can be run manually from Actions.

In **Settings → Pages → Build and deployment**, use **GitHub Actions** as the source. See the [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The deployment uses the standard `GITHUB_TOKEN`; no additional secrets or login service are required. The source recordings and local build/dependency folders are excluded from Git.

## Prepare more videos

With FFmpeg and ffprobe installed, place originals in `public/media/final/` and run:

```sh
npm run media:optimize
```

Optimized MP4/H.264 copies go to `public/media/optimized/`, without audio and with fast start enabled. Source resolution and frame rate are preserved. Already compressed clips are remuxed without re-encoding. Add the resulting paths and poster images to the catalog.

The included 13 clips total about 84 MB. Original recordings are excluded from this repository.

## Prepare more images

With FFmpeg and ffprobe installed:

```sh
npm run images:optimize -- "path/to/originals" collection-name
```

The script preserves the originals and writes WebP copies to `public/media/images/collection-name/`. Full images keep the source resolution and are verified against the decoded source pixels. Gallery previews go in `previews/`, at up to 960 pixels wide and quality 90. Add the generated `src` and `poster` paths to `public/portfolio.json`. Re-running the command reuses verified outputs.

The 46 Flowerlake images and five additional Character Rigs images occupy 61.4 MB in lossless WebP, down from 99 MB of PNGs. Their gallery previews total 1.9 MB. The six home backgrounds use separate copies up to 2048 pixels wide at quality 92, totaling 1.3 MB. `image-report.json` records dimensions, file sizes and verification hashes.
