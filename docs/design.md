# Design system

A deep aubergine primary, a Geist Sans / Geist Mono / Literata trio where the
mono tier is load-bearing, two marks reserved for the AI, a tight radius scale
with no pills, and depth carried by hairline borders rather than shadows.

Two files are the source of truth:

- [`src/app/globals.css`](../src/app/globals.css) — the palette (light and dark),
  the `@theme` block (color, font, radius, type tokens), the display-type
  utilities, the focus ring, the entrance animation.
- [`src/components/ui/`](../src/components/ui/) — the primitives and class
  helpers every screen imports.

This document records the **rules and the reasoning**. Values live in the code
and are linked, not copied — a doc that mirrors implementation is a doc that
drifts, which is exactly how the previous version of this file ended up
describing a system that no longer existed.

## Overview

The accent is a deep aubergine (`--color-primary`). Everything around it is a
neutral biased toward that aubergine — the greys carry a red/purple undertone
rather than being pure, so the accent reads as part of the palette instead of
dropped onto it.

Typography is a **trio**, each tier answering "who produced this": Geist Sans for
interface, Geist Mono for what a machine computed, Literata for what reads as a
document — job postings, coaching briefs, interview questions. Buttons are 7px,
cards 12px; nothing is a pill. Regions are separated by 1px hairlines and, in
dark mode, a real surface step.

### Key characteristics

- **One aubergine accent, in two roles** — as a fill behind white text (buttons,
  active nav) and as ink on the page (wordmark, accent text, icons). The roles
  are separate tokens because in dark mode they cannot share a value. Blue
  (`--color-link-blue`) is the only other chromatic note in body type, reserved
  for inline links.
- **Marker and pen are the AI's voice** — `--color-marker` highlights what the
  posting and your resume agree on; `--color-pen` underlines what is missing.
  They appear nowhere else, so seeing either one always means "the model marked
  this". This is why the app has no ✨ icon: the mark *is* the signal.
- **Mono as an information channel**, not decoration: it marks a value as
  computed and comparable.
- **A tight radius scale** (4–12px) assigned by role.
- **Borders, not shadows.** Shadow is reserved for things that genuinely float.
- **Indicators are dots**, so a dense list isn't a wall of tinted chips.
- **Dark mode is a palette swap**, not an inversion.
- **A categorical status palette** for the pipeline — the one deliberate break
  from the single-accent rule.

## Color

All tokens are `--color-*` properties in the `@theme` block, fed by raw
properties the dark palette redefines. See
[`globals.css`](../src/app/globals.css) for the values.

| Group | Tokens | Role |
| --- | --- | --- |
| Brand — fill | `primary`, `primary-press`, `on-primary` | Filled buttons, active nav, bar fills — anywhere the accent is a surface under white text |
| Brand — ink | `primary-ink` | The accent *drawn on* the page: wordmark, accent text, icons, the selected-tab underline, the outline button's border, the input focus ring |
| Brand — band | `surface-brand`, `on-surface-brand`, `on-surface-brand-mute` | The landing's closing band. Fixed aubergine, never theme-swapped |
| AI | `marker`, `marker-ink`, `pen` | The only marks the model may make on a document: highlight for a match, underline for a gap |
| Link | `link-blue`, `link-hover` | Inline links — the only non-aubergine body colour |
| Surface | `canvas`, `canvas-lavender`, `canvas-lavender-hover`, `surface-hover` | `canvas` is the card; `canvas-lavender` is the page beneath it |
| Line | `hairline` | 1px borders and dividers — the workhorse |
| Text | `ink`, `ink-mute` | Body and secondary; `ink` is also the focus ring |
| Semantic | `semantic-{error,success,warning}` + `-tint` | Status feedback, never decoration |

Two values worth knowing the reasoning for:

- **The accent is two tokens, because it cannot be one.** In dark mode a fill
  has to stay dark enough to carry white button text (white on `--primary`
  measures 5.9:1) while ink has to be light enough to read against the page.
  Those pull opposite ways: every value light enough to pass as text drops
  white-on-it below 3.8:1. `--primary` keeps the fills; `--primary-ink` lifts to
  a lighter mauve in dark and clears 4.5:1 on **every** dark surface in the
  palette, including the lightest. In light mode the two are the same aubergine.
  This was found the hard way — every screen in the app failed contrast in dark
  mode while `--primary` was doing both jobs.
- **`surface-brand` is not `primary`.** The closing band needs an aubergine that
  is dark enough for white type in *both* themes, so it is fixed rather than
  swapped — `primary`'s dark-mode lightening would put a glowing slab in the
  middle of a dark page.
- **The light warning is a dark amber, not a bright one.** It appears as 12–13px
  text, and badge text is never "large text" under WCAG.

> [!IMPORTANT]
> **`canvas-lavender` inverts its relationship to `canvas` between themes.** On
> light it is the paper *under* white cards; on dark it is the page *under*
> lighter cards. So a chip filled with it lifts on light and sinks on dark.
> Anything that must read as raised in both themes tints with the accent
> (`bg-primary/15`) instead. This is exactly the bug that hid the landing's
> feature-icon chips in dark mode.

### Pipeline status — a categorical scale

The five stages need colours that read as *different*, not as *more or less
branded*, so they come from Tailwind's palette rather than the aubergine system.
[`status-colors.ts`](../src/components/ui/status-colors.ts) is the single source:
one entry per status supplying every surface it appears on (`badge`, `dot`,
`fill`, `num`, `seg`), each with a dark variant.

`SAVED` zinc · `APPLIED` blue · `INTERVIEW` amber · `OFFER` green · `REJECTED` red

This is the system's one sanctioned break from the single-accent rule — see
[Deliberate departures](#deliberate-departures).

### Dark mode

Dark is a **redefinition of the raw custom properties**, not `dark:` classes
scattered through components. Three pieces make it work:

1. **Token indirection.** `@theme inline` maps `--color-*` to `var(--*)` rather
   than to literal hex. This matters: with a literal, Tailwind bakes the value
   into the generated utility and no re-declaring can flip it.
2. **A variant that honours both signals.** `@custom-variant dark` matches
   `[data-theme="dark"]` *or* `prefers-color-scheme: dark` when no theme is set,
   so the OS preference works and the in-app toggle wins when used.
3. **A pre-paint script** in [`layout.tsx`](../src/app/layout.tsx) stamps
   `data-theme` before first paint, so there is no flash.

Components reference tokens and the palette does the rest. The exception is
`STATUS_COLORS`, which uses Tailwind palette classes and spells its dark
variants out.

## Typography

Geist Sans (`--font-sans`) and Geist Mono (`--font-mono`) via the `geist`
package, plus Literata (`--font-serif`) via `next/font/google` — all loaded in
[`layout.tsx`](../src/app/layout.tsx). Literata is the document tier: it sets the
text the app did not write, so a job posting never looks like interface.

**Display tier** — `font-display-lg` (50px) / `-md` (32px, the workhorse) /
`-sm` (24px). Implemented as `@utility` classes rather than `@theme` variables so
each bundles size, weight, leading and tracking: a headline can never be set at
default tracking by accident.

**UI tier** — `--text-title` (18px) / `-body-lg` (16) / `-body` (14) /
`-caption` (13) / `-fine` (12). Denser than a marketing scale, because app chrome
carries more per screen than a landing page.

**Mono tier** — no size scale of its own; it borrows the UI tier and is applied
with `font-mono`. It is a channel, not a hierarchy.

| Mono | Sans |
| --- | --- |
| Dates, deadlines, percentages, scores | Prose, labels, headings, button text |
| Counts, statistics, token/latency/cost | |
| Identifiers, filenames, error digests | |

`Added` stays sans while the date beside it goes mono — the word is prose, the
value is data. Pair `tabular-nums` with mono wherever values stack in a column.

### Principles

- **Tight tracking on display.** Negative letter-spacing across 24–50px; without
  it the headlines read loose and unedited.
- **Mono means "measured".** If a human wrote it, sans. If the system computed
  it, mono.
- **Reach for a `--text-*` token,** never `text-sm` / `text-xs`.

## Layout & spacing

Tailwind's default 4px scale; the app defines no spacing tokens. Cards are `p-8`
(compact ones `p-6`). The landing bands run `py-16 md:py-24`, except the closing
aubergine band at `py-20 md:py-28` — it is the page's last statement and is
given room to be one. The application detail page separates sections with
`divide-y divide-hairline` rather than wrapping each in a card.

## Elevation & depth

Border first, surface step second, shadow only when something genuinely floats.

| Level | Treatment | Token | Use |
| --- | --- | --- | --- |
| 0 | Flat on `canvas-lavender` | — | The page |
| 1 | `border-hairline` + `bg-canvas` | — | Cards, rows, panels — the default |
| 2 | Soft cast shadow | `shadow-panel` | The landing's board frame |
| 3 | Stronger cast shadow | `shadow-panel-lg` | The landing's fit console |
| 4 | Lifted | *(literal, not yet tokenized)* | Drag overlay, dialogs |

In dark mode the border does less work and the surface step does more: the page
is darker than the card, so cards read as raised even where a hairline is nearly
invisible.

**The shadow changes hue between themes, and the tokens are why.** In light mode
it is aubergine at low alpha, so the cast reads as tinted by the brand rather
than as grey dirt. Carried into dark mode unchanged, that same aubergine sits on
a near-black page as a faint purple halo — light where a shadow should be dark.
So `--elevation-panel` swaps to black at a much higher alpha in dark: on a
`#141017` page only black is actually darker than the surface it falls on.

Levels 2 and 3 are tokenized. Level 4 is still three hand-written
`shadow-[0_…_rgba(74,21,75,…)]` literals in `confirm-dialog.tsx`, `board.tsx`
and `resumes/page.tsx` — each a different guess, none theme-aware. They move to
tokens when those screens are audited; until then this table is describing an
intent the code only half keeps.

## Shape

The radius scale is redefined in `@theme`, overriding Tailwind's defaults. There
is no pill token.

| Class | Radius | Role |
| --- | --- | --- |
| `rounded-sm` | 4px | Form inputs |
| `rounded-md` | 6px | Badges, chips, segmented segments, logo tiles, icon-only affordances |
| `rounded-lg` | 7px | **Buttons**, banners, icon chips, compact cards |
| `rounded-xl` | 9px | Board cards and troughs, fit rows, unlock boxes |
| `rounded-2xl` | 12px | Standard cards, the list table, landing panels |
| `rounded-full` | ∞ | Dots and bar fills — things that are actually round |

- **Nesting steps down.** An inner radius always sits one step below its
  container: a `rounded-lg` segmented control holds `rounded-md` segments.
- **`rounded-full` is geometry, not style.** A status dot is round because it is
  a dot. Nothing with a text label is round any more.

## Motion

`--animate-rise` (0.5s, used by the dashboard pipeline cards) and `.reveal`, a
scroll-triggered fade on the landing only
([`reveal.tsx`](../src/components/ui/reveal.tsx)). Reveal **opts out entirely**
under `prefers-reduced-motion` — it never sets the hidden state, so content is
visible immediately rather than animating quickly. A global rule flattens every
animation, transition and smooth scroll under the same query.

## Components

Every primitive lives in [`src/components/ui/`](../src/components/ui/) and is the
only place its thing is styled. Classes are not reproduced here — read the file.

| Primitive | What it is |
| --- | --- |
| [`button.tsx`](../src/components/ui/button.tsx) | `rounded-lg`, eight variants (primary / secondary / outline / on-brand / outline-on-brand / ghost / danger / danger-solid), three sizes. `md` and `lg` land at ~42px and ~52px tall. The two `*-on-brand` variants exist only for the closing band, where `primary` would vanish into the surface and `ghost` would float on it |
| [`card.tsx`](../src/components/ui/card.tsx) | `rounded-2xl` + hairline; padding passed by the caller |
| [`empty-state.tsx`](../src/components/ui/empty-state.tsx) | The same shape, dashed, with icon / title / body / CTA slots |
| [`form-styles.ts`](../src/components/ui/form-styles.ts) | `inputClass` + `labelClass`. Every form imports both — a field styled by hand is a bug |
| [`badge.tsx`](../src/components/ui/badge.tsx) | `Badge` (a `rounded-md` tint, for **tags only**) and `Dot` |
| [`status-badge.tsx`](../src/components/applications/status-badge.tsx) | A `STATUS_COLORS` dot plus the status label |
| [`segmented-control.tsx`](../src/components/ui/segmented-control.tsx) | `rounded-lg` shell, `rounded-md` segments; `filterChipClass` follows the same logic standalone |
| [`section-nav.tsx`](../src/components/applications/section-nav.tsx) | The detail page's scroll-spy rail, `lg` and up |

Inline messages share one shape — `rounded-lg` with a semantic surface; errors
carry `role="alert"`, status messages `role="status"`.

### Indicators — dots, not pills

The signature move. A tinted pill per row turns a dense list into confetti, so
state is carried by a 6px dot beside neutral text: the colour identifies, the
text says it out loud. `Dot` is always `aria-hidden` — it is never the only
carrier of meaning. Fit pairs a `Dot` toned by `fitBand()` with the score in
mono; band and number travel together.

`Badge` survives for genuine tags — skill chips, "Best fit" — but no longer
carries status and is no longer a pill.

### Deadline tone

Urgency is honest or it is noise. `deadlineTone()`
([`format.ts`](../src/lib/format.ts)) buckets a date and
[`deadline.ts`](../src/components/ui/deadline.ts) maps it to one class:

| Tone | When | Reads as |
| --- | --- | --- |
| `overdue` | before today | error, semibold |
| `soon` | within 3 days | warning |
| `upcoming` | later | muted |

Every deadline in the app imports this map, so a date can't be red on one screen
and grey on another. A date that is merely *present* is never coloured.

### Focus ring

A system-wide rule in `globals.css`: a 2px `ink` outline, offset, with a `canvas`
halo. A `currentColor` ring would be white-on-white on aubergine-filled buttons;
an ink ring separated by a halo stays visible on light surfaces, aubergine ones
and dark mode alike.

## Responsive behavior

Tailwind's default breakpoints. The three patterns that matter:

- **The board becomes an accordion.** Below `lg` the columns stack full-width,
  each header collapsing its cards; from `lg` they are side-by-side columns and
  the header is inert. Every section auto-expands while a card is dragged, so a
  collapsed stage never stops being a drop target.
- **The list table keeps all three columns.** Below `sm` the status and deadline
  columns narrow and the role truncates, rather than forcing a horizontal scroll
  that would push the deadline off-screen.
- **The detail page collapses its rail.** From `lg` it is a sticky facts +
  on-this-page rail beside the content; below that the facts stack on top and the
  scroll-spy nav hides.

**Touch targets.** `md` buttons land at ~42px, `lg` at ~52px, fields at ~44px —
at or above the 44×44 target of WCAG 2.5.5. Button padding is not a free
parameter.

## Do's and Don'ts

**Do** — reserve aubergine for filled buttons and active nav (one filled
aubergine button per viewport) · reach for `primary-ink` whenever the accent is
drawn on the page rather than filled behind white text · reserve `marker`/`pen` for marks the
model made · set document text in `font-serif` · set computed values in `font-mono` with
`tabular-nums` · set headlines with a `font-display-*` utility · import the
primitives rather than restyling · take pipeline colours from `STATUS_COLORS` ·
tint with `bg-primary/15` when a surface must read as raised in both themes.

**Don't** — add a fourth colour family · use `marker` or `pen` for anything a
human wrote · use aubergine for body text · reach for
`rounded-full` on anything with a text label · set prose in mono or a computed
value in sans · colour a deadline by hand · fill a status pill where a dot will
do · assume `canvas-lavender` lifts (it inverts) · write a `dark:` class where a
token would flip on its own · reach for a shadow where a hairline will do.

## Deliberate departures

Where the system diverges from the marketing language it started in. These are
choices, not drift:

| Departure | Why |
| --- | --- |
| **The 90px pill was removed entirely** | A marketing page has a handful of CTAs; this app has buttons, chips, segments and toggles on every screen. At that density uniform pills stop reading as emphasis and start reading as a default — nothing has a stance. 7px lets shape carry role again. |
| **A mono tier was added** | A tracker is mostly numbers. One family gives the reader no way to tell a computed value from a written one; mono is the cheapest possible signal. |
| **The pastel-mesh gradient was dropped** | Behind a real board it fought the cards. The original note here also claimed it had no honest dark-mode analogue — that turned out to be wrong, and a low-opacity translation of the same stops reads well on a dark page. The reason it stays out is the one found when that was tested: **a gradient behind text defeats axe's contrast check**. Measured on the landing hero, adding it took the page from 2 reported violations to 0 — and 17 elements, including the `<h1>`, the body copy and both buttons, to *"background could not be determined"*. The gate would have gone **greener** while checking less, which is the failure nobody notices. If this is ever revisited, the depth has to come from something axe can resolve — a solid tint, or the shadow the product panel already uses. |
| **Neutrals were biased toward the accent** | Pure greys made the aubergine look pasted on. |
| **Status pills became dots** | Fine on a marketing card, unreadable on a 12-row table. |
| **A categorical status palette** breaks the "never add a third accent" rule | Five stages must be *distinguishable*, not *branded*. Ranking them by how aubergine they are would encode a meaning the data doesn't have. Confined to `STATUS_COLORS`, so it can't leak into brand surfaces. |
| **Dark mode as a palette swap** rather than `dark:` classes | Scattering overrides through components makes the palette unknowable. |
| **A focus-ring rule was added** | The source never contended with aubergine-filled buttons, where a `currentColor` ring disappears. |

## Provenance

This system began as an adaptation of a design-language study of a Slack-inspired
marketing site: the aubergine palette, the lavender canvases, the 90px pill, the
pastel-mesh gradient and the display-typography rules came from there, with
**Inter** substituted for the study's two proprietary faces.

It has since been rebuilt. The marketing language was doing what it was designed
to do — sell on a page with three CTAs and a lot of air — and that is the wrong
job for a board, a table, and a detail page with six sections. What replaced it
is documented above.

What survived, and where:

| From the study | Where it lives now |
| --- | --- |
| The aubergine, its pressed state, the link blue, the success green | `--primary`, `--primary-press`, `--link-blue`, `--semantic-success` |
| Tight negative tracking on display type | `font-display-*` utilities |
| The closing aubergine band, and its muted mauve for secondary type on it | `--surface-brand`, `--on-surface-brand-mute`, the landing footer |
| Statistics carried by scale alone | The landing's stat row, set at the display tier |

Everything else — the 90px pill, the radius scale, the seven-tier display scale,
the two proprietary typefaces, the cream canvas, the pastel-mesh gradient, the
status pills — was replaced or dropped for the reasons in the table above. The
study itself is not vendored here; it was a starting point, not a dependency,
and this document is the system of record.

## Related docs

- [Architecture & design decisions](architecture.md)
- [Local setup & scripts](setup.md)
