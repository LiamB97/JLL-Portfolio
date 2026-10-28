# Broker brochures and development videos

## Brochures

Every signed-in staff role can open Manage → Brochures. Select 1–20 published developments, optionally starting from a collection owned by that broker. Add a title (100 characters), introduction (1,600 characters), and per-development notes (1,600 characters). Reorder homes inside each note panel. Generate a PDF, inspect the preview, then download or share the file. A WhatsApp number is required so enquiry links have a working broker contact.

The brochure includes a cover, condensed development summaries, up to four features, a cover photo where available, full broker notes, current starting prices and bedroom options, broker WhatsApp contact, dated disclaimer, page numbers and links back to the portfolio. Long notes continue onto extra pages. The app does not invent missing prices or images.

PDFs are generated on the device with jsPDF and bundled SIL-licensed Source Sans 3 fonts. The PDF code loads only when generating. No buyer notes or PDFs are uploaded or stored on the server. Unfinished details survive workspace tab switches while signed in, but closing or refreshing the browser tab or signing out clears them. Photo loading is limited to seven seconds per image; cross-origin restrictions or missing photos produce explicit placeholders and a report before sharing.

Native file sharing uses a prepared File and a separate click to retain user activation. Where file sharing is supported, the broker chooses WhatsApp in the device share sheet. Otherwise, download and attach the PDF as a document in WhatsApp. A wa.me URL cannot attach a locally generated PDF. The app never sends a message automatically.

## Videos

Development details support direct HTTPS MP4/WebM/OGG/M4V files and allowlisted YouTube, Vimeo, Brightcove player and bcove.video URLs. Players load only after a buyer clicks Play. YouTube watch, short and embed URLs are normalised to privacy-enhanced embeds. Vimeo unlisted hashes are preserved. Brightcove autoplay parameters are stripped. Unknown providers receive an explicit original-video fallback; arbitrary pages and scripts are never inserted as iframe HTML.

Provider-owned playback restrictions, regional rules or disabled embedding can still stop a video. The original-video link remains available. Live playback and native share-sheet checks require a browser/device; the current app settings disable browser access.

## Validation

Regression tests cover all bundled development video URLs, unsafe URL rejection, provider URL normalisation, PDF pagination, empty selections, filenames and broker/collection link attribution. Sample PDF pages were rendered with Poppler and inspected, including a 20-development long-notes case. Text margins and PDF link annotations were checked with pdfplumber and pypdf. QA artifacts remain in tmp/pdfs and are not committed.
