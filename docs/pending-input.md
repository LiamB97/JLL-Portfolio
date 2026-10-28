# Pending input for the sales team

The owner's supplied 81 lines are represented as 75 distinct development requests. The initial stock check matched 20 existing developments and identified 55 awaiting completion or review. Repeated names and alternative URLs are retained on their original work item.

Open **Manage → Pending input**. Admins and Broker admins can use this shared queue; regular Brokers cannot read or change it. Existing developments link to their current public record rather than being duplicated. Counts are recalculated against current stock.

Each unpublished item includes the available source facts, image/video URLs, original links, missing-field checklist, review notes, extraction history and an assignee. Recoverable information from the 27 October 2026 source review prepopulates 43 requests even if their sites cannot currently be read. Historical facts are explicitly labelled for confirmation; no pricing or availability is guaranteed by an import. The Netlify build plugin attempts the remaining source extraction before bundling, stores candidates only in the private server bundle, and caches the intake snapshot across builds. It does not put raw candidates in public assets or publish developments.

1. Search or filter the queue, including **Assigned to me**.
2. Open **Complete entry**. Assign an active Admin or Broker admin and leave team notes.
3. Fill the missing facts and inspect the photographs. **Save draft** preserves the shared work and updates the checklist. A stale save returns a conflict rather than overwriting another person's changes.
4. Use **Read source again** after saving if needed. This fills empty saved fields only. Failed source attempts remain visible, with manual entry available.
5. Check any postcode-derived pin against the map link and confirm the exact position. Confirm full-market starting price, bedroom options, property types, description, amenities, availability, media rights and removal of third-party contact details/branding.
6. Tick the review checkbox and **Publish to portfolio**. Incomplete records, unchecked postcode-centre pins and duplicates are rejected. Published work keeps its new development ID in the queue for reference.

**Mark as not required** moves an item out of the active work queue; it does not remove published stock. It can be restored. The queue, assignments and notes persist in the existing private production store and in local SQLite. Prepared build data fills untouched skeletons only and never replaces saved team work.

Specific review notes include Coronation Square's shared-ownership price, Peninsula Gardens' developer-office address, the separate identity of Copper Yard, and West End Gate's completed status and possible overlap with existing stock. Broadoaks Park is the named out-of-London exception already approved by the owner, and keeps its West Byfleet, Surrey area.

The batch does not change staff permissions, accounts, buyer collections or analytics settings. No buyer addresses or outbound email/WhatsApp delivery have been added. Source parsing remains best effort; a ready-for-review label means required fields are populated, not that a staff member has approved them.

## Broker transport map defaults

In Manage, brokers can save the lines and stations shown on their personal portfolio link using **Save map defaults**. Buyer collections have an independent transport selection saved with the collection. Enable **Show TfL lines** and/or **Show stations**, then choose specific lines and optionally individual stations. Empty selections mean all lines or all stations on the selected lines. Explicit station selections are independent of the displayed lines. Buyers can change the transport controls in Map tools; choosing a line or Show all lines clears the initial individual-station restriction.

Existing links keep their previous map behaviour until defaults are saved. Collection defaults take precedence over the broker's personal defaults; older collections without defaults inherit personal defaults where present.
