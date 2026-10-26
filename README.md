# JLL London residential portfolio

A first working prototype: one shared, London-only portfolio for brokers to send to buyers. React/TypeScript + Vite, Leaflet + MapLibre vector map, Express API and persistent SQLite storage. No buyer accounts, enquiries or stored journey destinations.

## Run

Use the existing checkout in `/workspace/JLL-Portfolio`; cloud tasks are already isolated and do not need a worktree.

Requires Node **24.5+** (uses built-in `node:sqlite`) and npm. The Node SQLite API is currently experimental. Startup scripts enable Node’s environment-proxy support for website imports.

```sh
cd /workspace/JLL-Portfolio
npm ci
npm run dev
```

Vite serves the interface on port 5173 and proxies API calls to the server on port 3001. For a production build, use `npm run build` then `npm start` (serves the build and API on port 3001). The server binds to loopback by default. Set `HOST=0.0.0.0` only behind a suitable authenticated HTTPS reverse proxy when deploying. Do not expose the development server publicly.

`npm test` runs validation/import tests and a real API integration test using an isolated temporary database. `npm run build` performs strict TypeScript checking and produces the browser bundle.

## Administrator access

Use **Manage** in the header. The server uses `ADMIN_PASSWORD` if configured (at least 12 characters), otherwise generates a random password in `.data/admin-password` with owner-only permissions. Read that file locally to sign in; never commit or share it. Passwords are kept only in React memory during a session, not localStorage. The production host must securely configure `ADMIN_PASSWORD`, use HTTPS, and protect backups. No buyer login is required. The API rate-limits failed administrator logins. Further production security review and multi-user admin accounts are outside this prototype.

## Managing developments

- Use the ordinary manual-entry form for name, area, description, GBP starting price, coordinates, bedroom choices, property types, amenities and media URLs.
- **Refresh website stock** fetches the JLL new-homes search page, reads its publicly embedded structured data, filters London sale developments and updates records using stable JLL identifiers. It does not need a private API or credentials. A successful source fetch returned 71 developments; 69 passed validation. The Albion Nord Penthouse at SEVEN has ambiguous bedroom metadata; The Lanes has no positive starting price. Both are skipped for manual review rather than guessed. Image links point to JLL's existing Cloudinary media. No broker contact data is copied into the portfolio.
- Website refresh runs automatically five seconds after server startup and every six hours while the server runs. Set `AUTO_SYNC_HOURS=0` to disable it, or another positive number (minimum hourly) to change the interval. Manual entries are preserved, and incomplete/failed source fetches keep existing stock. Website refresh overwrites edits to website-managed records; missing website listings are retained for review, not automatically withdrawn. Deleting an imported listing does not block it from coming back on refresh. Stock withdrawal and curated exclusions need a fuller workflow before launch.
- Individual-page metadata extraction remains a best-effort fallback. Missing fields must be completed before publishing. The verified integration uses the search collection; the single-page extractor does not yet support every JLL page format.
- Upload a JSON array of records for bulk additions (up to 200 records / 2MB); review before publishing. Repeated imports add records rather than silently replacing them. Use the advanced editor/form as the schema template. Uploaded image bytes are not stored; supply HTTPS URLs. Direct video files play in the portfolio; externally hosted player URLs, including Brightcove, open in a separate tab.
- Edit prices, media, availability and other details in place, or remove records from the published collection in the admin screen. CSV, file storage and per-broker collections are future work.

SQLite database and generated local password live in ignored `.data/`. `DATA_DIR` can move these to a persistent volume. Back up this directory. No database migration or user stock is cleared on restart; sample seeding happens only once. Do not delete a database with real stock to refresh samples.

## Honest prototype data and transport

A fresh empty database initially contains six clearly labelled fictional collections. The first successful website refresh removes those samples and populates the verified JLL collection. The current database contains 69 website-sourced developments. Original architectural illustrations remain as fallbacks when images are unavailable.

The JLL logo and Source Sans font are sourced from the public JLL website and retained as local assets. The overall red/black/white design is provisional pending supplied brand guidelines. Development photography uses the original website image URLs; verify media use and long-term URL stability before launch.

The default map uses OpenFreeMap's clean Positron vector style through MapLibre, with university/college labels from zoom 13 and more local place labels from zoom 16. It needs no Google account or key. Development pins show a building icon, not prices. Prices remain in details/list cards. Basic OpenStreetMap raster tiles provide a fallback if WebGL or vector-style loading fails.

**Stations** shows the TfL rail network: 511 unique stops across 21 lines in the verified snapshot, including Tube, DLR, Elizabeth line, the six named Overground lines, trams and the cable car. This is the TfL-operated rail network, not London's entire bus or National Rail network. **TfL lines** overlays official geographic route geometry, with a colour-coded legend, individual line filtering and station popups naming the serving lines. It is not a reproduction of TfL's schematic Tube map.

The public TfL Unified API supplies the network. `server/data/tfl-network.json` is a verified initial snapshot so deployment doesn't depend on an external cold fetch. The backend refreshes topology after seven days and retains stale data if a refresh fails. Netlify caches topology in the separate `jll-transport` Blobs store; local development keeps it in memory. Run `node --use-env-proxy scripts/refresh-transport.mjs` to refresh the bundled snapshot deliberately. Requests identify the application with a User-Agent; default scraper user agents may be denied.

Nearby station cards request actual walking and cycling routes from TfL Journey Planner, showing routed metres/kilometres and minutes. Successful station route results are cached for 24 hours, keyed by the public development ID and coordinates. These are route-planning estimates, not guarantees of current conditions. If no route can be obtained, the card explicitly offers **Check route** and labels any fallback distance as straight-line; it never invents a walking/cycling duration. Six route requests (three stations × two modes) are made per uncached development. No Google routing key is required.

Walk/Cycle links and the existing postcode journey form open Google Maps separately. Buyer-entered destinations are sent there directly and are not saved by this application. JLL listing descriptions are displayed without an added editorial heading; existing media URLs still point to JLL's Cloudinary assets.

## Network requirements

JLL source pages: `digitalportfolio.live.jll.com`, `residential.jll.co.uk`.
Browser vector styles/tiles/fonts: `tiles.openfreemap.org`; raster fallback: `tile.openstreetmap.org`. Backend transport and routing: `api.tfl.gov.uk`. The map opens full-screen by default; Split and List are optional header views. Nearby developments are clustered until zoomed in.
JLL image hosting: `res.cloudinary.com`. Optional web fonts: `fonts.googleapis.com`, `fonts.gstatic.com` (system-font fallback exists).
The Google Maps journey action opens `www.google.com` in the buyer's browser. Imported media URLs need their own source access. Review those destinations when real listing media is available.

## Before public launch

The collection importer has been exercised against the live JLL site. Establish ongoing permission/reliability for website extraction and media use, and agree stock withdrawal and price-update rules. Review the two skipped listings, verify the imported stock and supplied brand guidelines. Continue reviewing stock freshness, durable backups and production access controls. The prototype is deployed at https://subtle-malabi-144145.netlify.app/.

## Netlify deployment

`netlify.toml` builds the frontend and bundles two serverless functions. The API uses **Netlify Blobs** for a site-wide persistent collection, with strong reads and conditional ETag writes so simultaneous administrator edits do not silently overwrite each other. SQLite remains available for ordinary local development. Netlify functions never use the local SQLite file.

The deployment includes a public-data seed of 69 website-sourced London developments in `server/data/initial-portfolio.json`. Administrator credentials and `.data/` are excluded. The first storage mutation persists that seed; subsequent deployments preserve existing site storage. The `refresh-stock` scheduled function runs every six hours on a published production deployment; scheduled functions are not ordinary public API endpoints. Scheduled refresh execution should be checked in Netlify logs; the live public API and existing storage reads have been exercised.

Use Netlify's Git import / Deploy to Netlify flow for this repository, with build command `npm run build` and publish directory `dist` (configured automatically). Set `ADMIN_PASSWORD` securely in Netlify environment variables, scoped to Functions, to enable administration. Choose a password at least 12 characters long. No password is embedded in the build; if it is missing, administrator access returns 503 while public browsing stays available. Website imports use public JLL content and require no API key. Netlify provides the Blobs runtime credentials automatically.

The one-click deployment flow may ask to connect GitHub and confirm a new project/repository. It does not replace any existing Netlify site. Review any hosting limits or plan information presented by Netlify; no paid plan has been purchased by this project.

Before sharing the resulting `netlify.app` URL, verify: the home page and all 69 initial developments load, photos and map tiles load, admin login works, a test manual entry survives a new deployment, administrator changes remain private, and a scheduled refresh completes in Netlify's function logs. Remove only your temporary test record. Existing transport and stock-withdrawal limitations above still apply.

The Netlify production project builds from `LiamBayford123/JLL-Portfolio-3e9e3/main` (the template-created copy). The primary source repository is `LiamBayford123/JLL-Portfolio/main`. Publish authorized updates to both while they remain in sync; do not force-push over divergent user changes.
