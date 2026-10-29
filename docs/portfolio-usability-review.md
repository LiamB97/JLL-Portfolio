# Portfolio and broker workspace review

Reviewed 28 October 2026 against the supplied mobile screenshots and the existing buyer and staff workflows.

The public portfolio should help buyers find suitable developments, save a shortlist and arrange a viewing. Manage should help a broker share homes, without stock and account administration competing with those tasks.

## Changes made

| Before | After | Why |
| --- | --- | --- |
| Custom landmarks shown immediately | General links open with landmarks, stations and tube lines off | Development pins stay the focus. Explicit collection transport settings still apply. |
| Separate mobile controls and line legend, positioned over one another | One native Map layers dialog; scrollable content, fixed Close and Done controls, Escape and outside dismissal | The picker stays above search and map controls, and the background is inert while it is open. |
| Expanding filters and commute controls over the map | Separate dismissible dialogs, with a compact commute progress/result indicator | Preserve map space and give each task a clear finish. A commute search can continue while its dialog is closed. |
| Favourites and counts on separate rows | Compact results row | Leave more room for the map, particularly on phones. |
| No starting-price filter or explicit result framing action | Budget choices, price sorting and Show matching homes | Buyers can explore developments suited to their budget and bring the results back into view. Unknown prices are excluded from budget matches, and sort last. Starting prices still need broker confirmation. |
| Passive enquiry copy at the foot of the development | Book your viewing now, with WhatsApp viewing requests near the title and at the foot | Give buyers an obvious next step. Both requests retain broker/collection attribution. Generic links offer a copyable request with a manual-copy fallback. |
| Friend sharing in a small popover | The same accessible, dismissible dialog pattern | Avoid another overlapping control on a narrow phone screen. |
| Full personal-link/profile panel above every staff tool, followed by a long tab row | Overview with three buyer tasks; grouped sidebar on desktop and a labelled section selector on mobile | Brokers can immediately choose collections, PDF brochures or their personal link. Profile settings have a dedicated destination. |
| Collections always opened with a blank form alongside saved links | Saved collections first, then New collection or Edit & share | Separate choosing a collection from editing one. Optional transport settings are collapsed. Sharing is hidden while edits are unsaved. |
| Stock imports, refresh tools, editing and the published list all visible together | Searchable published developments first; Add / import & drafts separately; refresh and bulk tools collapsed | Make routine stock updates easier to find and reduce competing controls. Publishing and permissions retain their existing safeguards. |
| Collection and development forms lost when switching workspace tabs | Visited form sections stay mounted but hidden | Keep work during navigation. Refresh/sign-out still clears unsaved browser-tab work; saved stock drafts remain on the server. |
| Brochures could retain a PDF after changing the broker number | Changing the photo or WhatsApp number invalidates the generated PDF | Regenerate before sharing so contact details stay current. Saved collection choices refresh when returning to Brochures. |
| Previous guidance referred to the old workspace and map controls | Buyer and staff guidance updated; new main actions translated into Arabic, Chinese and Turkish | Keep help and primary actions aligned with the interface. |

## Feature coverage

| Feature | Review and verification |
| --- | --- |
| Public discovery | Map/Split/List, search, geography, bedrooms, budget, featured homes, favourites and reset reviewed. New tests verify intersecting filters, studio bedrooms, boundary prices and unavailable commute routes. |
| Collection map behaviour | Intentional lines/stations and opening framing retained. General overlays now off. Existing tests cover collection-only settings, ownership and published stock validation. |
| Commute | Existing tests cover postcode/date/mode validation, actual TfL durations, coalesced caching, provider failures and public API protection. New search tests ensure unconfirmed journeys cannot pass a combined filter. |
| Development media | Embedded video source restrictions, thumbnails, photos, descriptions and transport retained. Existing tests cover supported hosts and safe fallbacks. |
| Enquiries and sharing | Rendered React markup verifies the two direct viewing links use the correct number and collection, and generic links provide a viewing-request copy action. Existing tests cover personal, collection, friend, email and brochure link attribution. |
| Brochures | Existing PDF tests verify single A4 development pages, long notes, circular portrait clipping, enquiry attribution and video posters. Generation and attachment flow retained; no brochure layout changes in this update. |
| Profile | Dedicated personal-link destination; WhatsApp and circular portrait settings retained. Existing tests cover signed-in ownership, JPEG validation and crop bounds. |
| Collections | Saved-list default verified in rendered markup. Selection, transport, saving, preview, sharing and removal reviewed. Backend ownership/access checks retained. |
| Stock and Pending input | Published-list default verified in rendered markup; searchable stock added. Draft review, imports, extraction, duplicate handling, exact locations, team assignments and publication retained and covered by existing tests. |
| People and access | Menu roles tested for Broker, Broker admin and Admin. Existing API tests cover invitations, sessions, CSRF, disabled accounts, ownership and role changes. No broader permissions granted. |
| Team activity and analytics | Grouped under Team for Admins. Existing reporting, consent, privacy, attribution, exports and heartbeat tests retained. Budget tracking records only the filter category, never the price or postcode. |
| Responsive and accessibility | Native modal focus containment, background inertness, focus restoration, keyboard dismissal, 44px controls, mobile input sizes and safe-area footer padding implemented. Workspace navigation moves keyboard focus to the new section heading. |

## Validation and limits

Production build and all 104 tests passed. Run `npm run build -- --configLoader runner`, then `npm test` to repeat the checks. The rendered-markup checks run without a browser and cannot validate CSS, touch behaviour, focus execution or app handoff.

Browser inventory reports **Local browser use is disabled in Work settings**. No desktop visual check, phone test or WhatsApp/email app handoff was performed in this review. These remain device checks, rather than verified results:

1. On iPhone, open Map layers, turn on lines, scroll the full list, then close with Close, Done and an outside tap. Repeat in landscape and Split view.
2. Open Filters and commute search with the keyboard visible; check that fields and closing controls stay reachable. Confirm matching pins and Clear all.
3. Sign in as a broker and move between collections, profile and brochures; confirm unsaved selections/notes remain. Check desktop navigation and the mobile section selector.
4. Use a broker collection link, open a development and request a viewing. Confirm WhatsApp opens the intended conversation with the development link. No message or confirmed booking is created automatically.
5. Generate and preview a brochure, then try PDF attachment sharing on the broker's phone and email app. URI-based sharing requires attaching the downloaded PDF.

The existing large MapLibre chunk warning remains in the production build; map and staff code continue to load separately from the initial application bundle.


## Mobile screenshot follow-up

The next set of screenshots exposed remaining problems in the old header and the activity date form. The deployed bundles were checked directly: the previous Map layers dialog and workspace were present, but that did not validate the rest of the phone layout.

| Before | After | Why |
| --- | --- | --- |
| Header controls could wrap into extra rows and overlap the map | A dedicated header component; logo/favourites/menu row and an explicit Map/Split/List row on phones | Keep the header height determined by its contents and layout, without competing legacy rules. |
| Sharing, preferences, help and Manage all occupied the header | Secondary actions grouped in one menu | Preserve space for discovering homes. |
| Search, commute, favourites and count cards floated over map pins | Search and a compact commute/result row in normal flow above the map; favourites-only moved into Filters | The map receives its own uninterrupted area. |
| Map framing reserved space for the old floating search panel | Shared framing padding around the actual map viewport | Centre results within the available map. |
| Activity date inputs could exceed their grid tracks | Single-column filters on phones; labels and controls have explicit shrink/width constraints and consistent height | Keep native date fields contained and aligned. |
| A source push was the only recorded publication evidence | The build emits release.json containing only the commit and build time | Check the public deployment against the intended commit. |

Obsolete header/map layout rules were removed, while shared dark-theme selectors were preserved. Keyboard access, broker/collection attribution and the staff role model remain covered by automated checks. Native Safari layout and phone interactions are still not verified while Browser use is disabled.


## Mobile map space — 29 October

| Before | After | Why |
| --- | --- | --- |
| A separate mobile Map/Split/List row | View choices inside the menu; a single 56px header | Give the map another 60px of vertical space. Desktop view controls stay in the navigation. |
| Search, commute and broker strips consumed page height | Search and small commute/result chips float over the mobile Map canvas | The map fills the space directly beneath the header. List and Split keep their controls in normal flow. |
| Full-width broker contact strip | A 44px circular broker contact in the mobile header; full name and collection context in the menu | Keep broker contact one tap away. Broker and collection attribution is retained in its WhatsApp message. |
| Fixed map framing margins | Margins read the actual floating toolbar bounds | Keep automatic collection/commute framing and Show matching homes clear of the search controls. |

Build and regression verification cover source and rendered markup. Browser testing still reports that local browser use is disabled; no phone visual verification is claimed.
