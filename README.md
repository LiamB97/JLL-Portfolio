# JLL London residential portfolio

A first working prototype: one shared, London-only portfolio for brokers to send to buyers. React/TypeScript + Vite, Leaflet + MapLibre vector map, Express API and persistent SQLite storage. No buyer accounts or enquiry forms. Journey destinations are not saved in the portfolio database.

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

## Staff accounts and roles

Open **Manage** in the header. Buyers never need an account. Staff use individual email/password accounts with these roles:

| Role | Developments | Buyer collections | Accounts |
| --- | --- | --- | --- |
| Admin | Manage all stock; refresh JLL website stock | Manage all collections | Invite any role, reset passwords, change roles, enable/disable access |
| Broker admin | Manage all stock, including imports, edits, removals and refresh | Manage their own collections | Invite new regular brokers only; revoke their own invitations |
| Broker | Browse published stock; cannot add, extract, edit, remove, upload or refresh | Manage their own collections using any published stock | Invite new regular brokers only; revoke their own invitations |

For the first owner account, configure `ADMIN_PASSWORD` (12+ characters) in Netlify environment variables with Functions scope, then redeploy. Visit Manage and enter that value once as the **owner setup code**, together with your name, email and a new account password. It does not create an account automatically. After setup, the shared bootstrap password no longer grants API access. A fresh local server generates its setup code in ignored `.data/admin-password` if `ADMIN_PASSWORD` is unset. Never commit or log this file or credential values.

Staff create **one-use invitation links** that expire after seven days. Copy and send them privately; the app does not send email or WhatsApp messages automatically. Invite links keep the token in the URL fragment rather than a query string. Staff choose their password when accepting. Only Admins may invite elevated roles or reinvite an existing email to reset an account password. Other roles cannot replace pending invitations, reset accounts or modify existing users. Acceptance rechecks the issuer is still active and allowed to issue that role. Pending invitations can be revoked. Disabling an account or changing its role revokes its sessions and pending invitations; the last active admin cannot be disabled or demoted.

Passwords use salted scrypt hashes. Session tokens are random, stored as hashes server-side, and delivered in HttpOnly, SameSite=Strict cookies (Secure on HTTPS); sessions expire after eight hours. Mutations require CSRF protection and matching Origin when present. Permissions and ownership are enforced by the server and rechecked inside mutations, including conditional-write retries. Repeated failed logins trigger a temporary account lock. Passwords/session tokens are never placed in browser localStorage. Role/permission, invite expiry, CSRF, revocation and restart-persistence tests cover these flows.

Netlify stores private staff state alongside portfolio state in its private Blobs store, using conditional ETag writes. Local SQLite stores the access state in private database metadata. Public APIs strip staff ownership metadata and never expose user records, password hashes or session data. Keep backups private. No production staff account has been fabricated or automatically activated.

## Managing developments

- Use the ordinary manual-entry form for name, area, description, GBP starting price, coordinates, bedroom choices, property types, amenities and media URLs.
- **Refresh website stock** fetches the JLL new-homes search page, reads its publicly embedded structured data, filters London sale developments and updates records using stable JLL identifiers. It does not need a private API or credentials. A successful source fetch returned 71 developments; 69 passed validation. The Albion Nord Penthouse at SEVEN has ambiguous bedroom metadata; The Lanes has no positive starting price. Both are skipped for manual review rather than guessed. Image links point to JLL's existing Cloudinary media. No broker contact data is copied into the portfolio.
- Website refresh runs automatically five seconds after server startup and every six hours while the server runs. Set `AUTO_SYNC_HOURS=0` to disable it, or another positive number (minimum hourly) to change the interval. Manual entries are preserved, and incomplete/failed source fetches keep existing stock. Website refresh overwrites edits to website-managed records; missing website listings are retained for review, not automatically withdrawn. Deleting an imported listing does not block it from coming back on refresh. Stock withdrawal and curated exclusions need a fuller workflow before launch.
- **Import a website listing** accepts public HTTPS development pages from JLL, other agents or developers. It extracts available JSON-LD/Open Graph property facts into an unpublished editable form, strips detected contact details and agency/developer sentences, and excludes detected logo media. Source pages never auto-publish. Staff must fill missing required fields and confirm the review checkbox before publishing; extracted drafts are also checked for review confirmation by the API. Photo thumbnails support visual checks for watermarks/branding. Automatic text cleanup is best effort; reviewers remain responsible for factual accuracy, branding and media permissions. External source links are not displayed in buyer details. Sites that block requests, require JavaScript or omit metadata need manual entry. HTTPS-only public-host checks, validated redirect targets, a 3MB/15-second fetch limit and direct-production DNS pinning limit server-side fetch risks. Cloud workspace egress/DNS may block real external-source checks even when deployed Netlify Functions can reach them.
- Upload a JSON array of records for bulk additions (up to 200 records / 2MB); review before publishing. Repeated imports add records rather than silently replacing them. Use the advanced editor/form as the schema template. Uploaded image bytes are not stored; supply HTTPS URLs. Direct video files play in the portfolio; externally hosted player URLs, including Brightcove, open in a separate tab.
- Edit prices, media, availability and other details in place, or remove records from the published collection in the admin screen. CSV and uploaded image-file storage are future work.

SQLite database and generated local password live in ignored `.data/`. `DATA_DIR` can move these to a persistent volume. Back up this directory. No database migration or user stock is cleared on restart; sample seeding happens only once. Do not delete a database with real stock to refresh samples.

## Buyer favourites and featured links

Buyers save developments with the heart button in details or list cards. Favourites persist in `localStorage` on that browser/device; no buyer profile or server-side shortlist is created. If browser storage is unavailable, the app explicitly says the shortlist lasts only for the visit. The favourites drawer creates a WhatsApp message containing the selected names, areas and direct development links. Copy the message into an existing broker conversation, or open WhatsApp and choose a recipient. Nothing is sent automatically. A message link opens the requested development via `?development=<id>` and keeps a known collection context when applicable; invitation fragments and arbitrary URL parameters are never copied into buyer messages.

Brokers use **Buyer collections** to choose 1–50 developments and create a stable share link (`?collection=<opaque slug>`). The chosen properties appear as featured pins above clusters, with a collection title and broker display name. The rest of the portfolio remains available, and buyers may optionally switch to featured-only results. These links are readable without sign-in by anyone possessing them; use general titles, not buyer details. A broker can edit or remove only their own collections; admins can manage any collection. Disabling the owning staff account makes its collection links unavailable. Removed developments are omitted from the public collection.

The maximum-price filter and price sorting have been removed. Development-level **prices from** remain in cards/details as guidance. Accurate unit-budget filtering requires unit-level prices and availability, not just the starting price of a development.

## Honest prototype data and transport

A fresh empty database initially contains six clearly labelled fictional collections. The first successful website refresh removes those samples and populates the verified JLL collection. The current database contains 69 website-sourced developments. Original architectural illustrations remain as fallbacks when images are unavailable.

The JLL logo and Source Sans font are sourced from the public JLL website and retained as local assets. The overall red/black/white design is provisional pending supplied brand guidelines. Development photography uses the original website image URLs; verify media use and long-term URL stability before launch.

The default map uses OpenFreeMap's clean Positron vector style through MapLibre, with university/college labels from zoom 13 and more local place labels from zoom 16. It needs no Google account or key. Development pins use a simple pin with a centre dot, without a building/office icon or price. Prices remain in details/list cards. Basic OpenStreetMap raster tiles provide a fallback if WebGL or vector-style loading fails.

**Stations** shows the TfL rail network: 511 unique stops across 21 lines in the verified snapshot, including Tube, DLR, Elizabeth line, the six named Overground lines, trams and the cable car. This is the TfL-operated rail network, not London's entire bus or National Rail network. **TfL lines** overlays official geographic route geometry, with a colour-coded legend, multiple line selection and station popups naming every serving line. Stations use a dedicated pane above the line geometry so their markers remain visible. It is not a reproduction of TfL's schematic Tube map.

The public TfL Unified API supplies the network. `server/data/tfl-network.json` is a verified initial snapshot so deployment doesn't depend on an external cold fetch. The backend refreshes topology after seven days and retains stale data if a refresh fails. Netlify caches topology in the separate `jll-transport` Blobs store; local development keeps it in memory. Run `node --use-env-proxy scripts/refresh-transport.mjs` to refresh the bundled snapshot deliberately. Requests identify the application with a User-Agent; default scraper user agents may be denied.

Nearby station cards request actual walking and cycling routes from TfL Journey Planner, showing routed metres/kilometres and minutes. Successful station route results are cached for 24 hours, keyed by the public development ID and coordinates. These are route-planning estimates, not guarantees of current conditions. If no route can be obtained, the card explicitly offers **Check route** and labels any fallback distance as straight-line; it never invents a walking/cycling duration. Six route requests (three stations × two modes) are made per uncached development. No Google routing key is required.

Walk/Cycle links and the existing postcode journey form open Google Maps separately. The development-detail journey form sends its destination directly to Google and does not save it. The separate map journey filter sends its starting place to TfL, as described below. JLL listing descriptions are displayed without an added editorial heading; existing media URLs still point to JLL's Cloudinary assets.

## Area and journey search

The main search supports development names, postcodes, area text, and phrases such as **20 minutes from Angel**. Press Enter to open the journey form and confirm the starting point, maximum minutes, public transport/walking/cycling mode and London departure time. The form also accepts a station, landmark or full London postcode directly. Exact rail station names and curated places resolve locally; other places use TfL disambiguation with an explicit choice if needed.

Journey searches calculate real TfL routes **from the chosen place to each published development**, including walking legs. They check at most six developments per API request and show progress and verified matching results as batches complete. Total journey durations come from TfL, never straight-line estimates. Unavailable routes remain explicitly counted and excluded; clearing the journey filter returns all stock. Results are planning estimates for the selected departure, not a guarantee of service conditions. They may take tens of seconds for the full catalogue. Verified route results are cached for 15 minutes in bounded server memory, with concurrent requests deduplicated; they are not stored in the portfolio database or Netlify Blobs. Buyer starting places are sent to TfL; this app does not create a buyer record. A fully arbitrary conversational AI search is not used.

**Filters** includes approximate London geographic sectors (Central, North, North east, East, South east, South, South west, West, North west) and 40 named-area centres, including Knightsbridge, Mayfair and Battersea. Named-area filters use a clearly labelled 2 km radius; these are proximity filters, not administrative boundaries. Regions and named areas combine with bedroom/property-type filters.

**Landmarks** adds subtle dots from zoom 12 and small labels from zoom 13 for Harrods, Harvey Nichols, Selfridges, Westfield, major parks and cultural destinations. Buyers can toggle these off. These are curated geographic points; other local places and universities remain supplied by the basemap. Landmark aliases such as Harvey Nics work in journey search.

## Network requirements

JLL source pages: `digitalportfolio.live.jll.com`, `residential.jll.co.uk`.
Browser vector styles/tiles/fonts: `tiles.openfreemap.org`; raster fallback: `tile.openstreetmap.org`. Backend transport and routing: `api.tfl.gov.uk`. The map opens full-screen by default; Split and List are optional header views. Nearby developments are clustered until zoomed in.
JLL image hosting: `res.cloudinary.com`. Optional web fonts: `fonts.googleapis.com`, `fonts.gstatic.com` (system-font fallback exists).
The Google Maps journey action opens `www.google.com` in the buyer's browser. Staff website imports need outbound HTTPS/DNS to each supplied public source host. Imported media URLs need their own source access. Review those destinations when real listing media is available.

## Before public launch

The collection importer has been exercised against the live JLL site. Establish ongoing permission/reliability for website extraction and media use, and agree stock withdrawal and price-update rules. Review the two skipped listings, verify the imported stock and supplied brand guidelines. Continue reviewing stock freshness, durable backups and production access controls. The prototype is deployed at https://subtle-malabi-144145.netlify.app/.

## Netlify deployment

`netlify.toml` builds the frontend and bundles two serverless functions. The API uses **Netlify Blobs** for a site-wide persistent collection, with strong reads and conditional ETag writes so simultaneous administrator edits do not silently overwrite each other. SQLite remains available for ordinary local development. Netlify functions never use the local SQLite file.

The deployment includes a public-data seed of 69 website-sourced London developments in `server/data/initial-portfolio.json`. Administrator credentials and `.data/` are excluded. The first storage mutation persists that seed; subsequent deployments preserve existing site storage. The `refresh-stock` scheduled function runs every six hours on a published production deployment; scheduled functions are not ordinary public API endpoints. Scheduled refresh execution should be checked in Netlify logs; the live public API and existing storage reads have been exercised.

Use Netlify's Git import / Deploy to Netlify flow for this repository, with build command `npm run build` and publish directory `dist` (configured automatically). Set `ADMIN_PASSWORD` securely in Netlify environment variables, scoped to Functions, to enable first-owner setup. Choose a password at least 12 characters long. No password is embedded in the build; if it is missing, owner setup remains disabled while public browsing stays available. Manage explains the exact setup steps. Website imports use public JLL content and require no API key. Netlify provides the Blobs runtime credentials automatically.

The one-click deployment flow may ask to connect GitHub and confirm a new project/repository. It does not replace any existing Netlify site. Review any hosting limits or plan information presented by Netlify; no paid plan has been purchased by this project.

Before sharing the resulting `netlify.app` URL, verify: the home page and all 69 initial developments load, photos and map tiles load, admin login works, a test manual entry survives a new deployment, administrator changes remain private, and a scheduled refresh completes in Netlify's function logs. Remove only your temporary test record. Existing transport and stock-withdrawal limitations above still apply.

The Netlify production project builds from `LiamBayford123/JLL-Portfolio-3e9e3/main` (the template-created copy). The primary source repository is `LiamBayford123/JLL-Portfolio/main`. Publish authorized updates to both while they remain in sync; do not force-push over divergent user changes.
