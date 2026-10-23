# Biodata archetypes: the contract

An archetype is a page layout family. Templates (`../templates/*.js`) pick one
archetype and tune it with palettes, fonts, ornaments, `style` options and a
little extra CSS. The renderer (`../core/render.js`) builds the data-driven
parts (rows, section titles, photo, labels) and hands them to the archetype
through a `ctx` object, so an archetype never formats or escapes data itself.

Files are plain ES2017 inside the kit wrapper (see any existing file). No DOM
access at load time. Each archetype file goes in `../bundle-order.js` *before*
the templates block.

## Shape

```js
K.archetypes.<id> = {
  id: '<id>',                              // 'classic' | 'sidebar' | 'band' | 'frame' | 'hero'
  photoSlots: ['top-right', ...],          // placements this layout supports ('none' is implicit)
  wells: 1,                                // or function (ctx, kind) -> n   (kind 'first' | 'cont')
  css: function (theme, def, design) {},   // -> CSS string, scope every rule under '.bd-arch-<id>'
  pageShell: function (ctx, kind) {},      // -> { before, after }   (required)
  headerBlocks: function (ctx) {},         // optional -> html[]  identity as flow blocks (classic)
  chromeHeader: function (ctx) {},         // optional -> html    first-page chrome (band, hero, sidebar rail)
  flowBlocks: function (ctx) {},           // optional -> html[]  replaces the default flow entirely
  sectionTitle: function (ctx, sec, labelHtml) {}, // optional -> inner HTML of a section-title block
  prepare: function (ctx) {},              // optional, runs before any block is built (set ctx.pairRows etc.)
  validate: function (def, fail) {},       // optional, called by registry.register; fail('message') throws
};
```

### How a page is assembled

For `kind` in `first` and `cont` the renderer emits

```html
<template id="bd-shell-<kind>">
  <section class="bd-page bd-page-<kind>">
    {before}<div class="bd-well" data-col="1"></div>...<div class="bd-well" data-col="n"></div>{after}
  </section>
</template>
```

So `before`/`after` wrap the wells: put frames, corner ornaments, bands, rails,
running heads and the footer there. Wells must end up with a **definite
height** and `overflow:hidden`, typically a flex column
(`.bd-sheet{position:absolute;top..;bottom..;display:flex;flex-direction:column}`
with `.bd-well{flex:1 1 auto}`; the base CSS already sets `min-height:0`).
For two columns, open a grid in `before` and close it in `after`
(`before: '...<div class="bd-cols">'`, `after: '</div>...'`). The paginator
fills wells in `data-col` order (left first), page by page. Never put
content whose height changes after pagination inside a page shell (the footer
spans already reserve their line; `.bd-pageno` is filled with `n / total`).

The flow (`#bd-flow`) is, in order:
1. `flowBlocks(ctx)` if defined, otherwise
2. `headerBlocks(ctx)` (if defined) followed by `ctx.allSectionBlocks()`.

`chromeHeader(ctx)` is called first, and its result is stored in
`ctx.chromeHeaderHtml` for your `pageShell(ctx, 'first')` to place. Use
`flowBlocks` when some sections live in chrome, e.g. a sidebar rail holding
contact details: `return ctx.allSectionBlocks(['contact'])`.

### Blocks

A block is `ctx.block(cls, innerHtml, attrs?)` -> `<div class="bd-block cls" ...>`.
Blocks are atomic: the paginator never splits one. Add `bd-keep` to a block
that must stay with the next one (section titles already have it). Keep blocks
small (one row, one paragraph): a block taller than an empty well is clipped
and marked `.bd-overflow`.

Block classes the renderer produces: `bd-title` (+`data-sec`), `bd-row`,
`bd-pair` (two `bd-row bd-cell` side by side), `bd-prose` / `bd-prose-cont`
(paragraphs in the value column) or `bd-plabel` + `bd-para` when
`ctx.proseStyle = 'stacked'`.

## `theme` (passed to `css`)

`{ vars: {primary, accent, ink, muted, paper, rule, band, bandInk}, fonts:
{display, body, families}, scale, spacing, sp, labelW, pairLabelW, printSafe,
design }`. You rarely need it: the same values are CSS custom properties on
`.bd-doc`:

| var | meaning |
|---|---|
| `--bd-primary --bd-accent --bd-ink --bd-muted --bd-paper --bd-rule --bd-band --bd-band-ink` | palette |
| `--bd-tint`, `--bd-tint-2` | 6% primary / 14% accent over paper (soft fills) |
| `--bd-font-display`, `--bd-font-body` | font stacks (Devanagari fallback included) |
| `--bd-scale` | 0.85..1.15; base font size is `calc(9.4pt * var(--bd-scale))`, use `em` |
| `--bd-sp` | spacing multiplier: compact .78, normal 1, relaxed 1.24 |
| `--bd-label-w`, `--bd-pair-label-w` | label column width (depends on label language) |

Root classes on `.bd-doc`: `bd-mode-{preview|pdf|thumbnail}`, `bd-arch-<id>`,
`bd-t-<templateId>`, `bd-lang-{en|hi|both}`, `bd-sp-<spacing>`,
`bd-photo-<placement|none>`, `bd-print-safe`. With `printSafe` templates use no
fills or backgrounds.

## `ctx` (render context)

Data (already cleaned by `K.schema.clean`) and design (`K.registry.resolveDesign`):

| member | |
|---|---|
| `ctx.def`, `ctx.design`, `ctx.data`, `ctx.mode`, `ctx.now`, `ctx.theme`, `ctx.archetype` | inputs |
| `ctx.lang` | label mode `'en' \| 'hi' \| 'both'`; `ctx.valueLang` is `'hi'` only in hi mode |
| `ctx.esc`, `ctx.attr`, `ctx.fmt` | escaping and formatters (`K.fmt`) |
| `ctx.label(group, key)` | escaped label in the current mode (`K.label`) |
| `ctx.t(group, key)` | plain text in the value language |
| `ctx.titleText(key='biodata')` | escaped misc label ("Biodata" / "बायोडाटा") |
| `ctx.ornament(role, cls)` | SVG for `def.ornaments[role]` or `''` when the template sets none |
| `ctx.hasPhoto`, `ctx.photoPlacement` | photo present and its slot |
| `ctx.photo(cls)` | `<div class="bd-photo bd-shape-..."><img></div>` or `''`; size it with CSS |
| `ctx.identity` | plain strings `{name, headline, place, age, height, community}` (escape them) |
| `ctx.invocationHtml(cls)` | optional invocation line (`dir="auto"`) or `''` |
| `ctx.footer()` | footer with footer text + `.bd-pageno` |
| `ctx.runningHead()` | slim name + "Biodata" line for continuation pages |
| `ctx.value(id)`, `ctx.text(id)`, `ctx.html(id)` | raw / display text / escaped display of a field |
| `ctx.isHidden(id)`, `ctx.isSectionHidden(sec)` | user hiding |
| `ctx.sections(skip?)` | visible, non-empty sections in the user's order |
| `ctx.rows(sec)` | `[{id, kind:'row', label, value, short}` or `{id, kind:'prose', label, paras}]`; label/value are escaped HTML |
| `ctx.factRows(ids)` | rows for given field ids (key-fact panels), e.g. `['personal.age','personal.heightCm','religion.gotra']` |
| `ctx.rowHtml(row)` | `<div class="bd-l">..</div><div class="bd-v">..</div>` |
| `ctx.rowBlocks(row)`, `ctx.titleBlock(sec)`, `ctx.sectionBlocks(sec)`, `ctx.allSectionBlocks(skip?)` | ready flow blocks; empty sections give `[]` (no empty headings) |
| `ctx.block(cls, html, attrs)` | wrap any HTML as a flow block |
| `ctx.pairRows` (default false), `ctx.pairMaxValue`, `ctx.pairMaxLabel` | two-up pairing of short rows; set in `prepare` |
| `ctx.proseStyle` | `'grid'` (default) or `'stacked'` (narrow columns) |
| `ctx.chromeHeaderHtml` | result of `chromeHeader(ctx)` |

Derived rows the renderer builds for you: `personal.age` (after date of birth;
still shown when the date is hidden), siblings (one row per sibling, label =
relation), `education.degrees` (one row, one line per degree), `income.amount`
(formatted income), `partner.age` / `partner.height` (ranges),
`contact.contactPerson` (with relation), `contact.location` (city, state,
country). Name and gender are never rows (use `ctx.identity`).

## Rules

- Never print a user string without `ctx.esc`/`ctx.attr`; prefer the ready
  helpers, which already escape.
- Scope all CSS under `.bd-arch-<id>` (template CSS under `.bd-t-<id>`); never
  style `html`, `body` or bare elements: the share page injects the CSS into
  the site page.
- Never letter-space Devanagari: the base CSS resets `letter-spacing` on
  `[lang="hi"]`, so keep Hindi inside the label spans the kit emits.
- Size things in `mm` for geometry and `em` for type so `--bd-scale` works.
- Target: `K.sampleData()` fits 1-2 A4 pages in English. Check with
  `node packages/shared/scripts/render-sample.js --only <templateId>` and
  headless Chrome (page counts, no `.bd-overflow`).

## classic (reference implementation)

Single column, centred identity header in the flow, label/value rows with
two-up pairing of short rows, optional ornamental frame. Photo slots:
`top-right` (framed, right of the centred header) and `top-center` (above the
name). `def.style` options (validated):

| option | values | default |
|---|---|---|
| `frame` | `double`, `single`, `hairline`, `none` | `double` |
| `corners` | bool (needs `ornaments.corner`) | `false` |
| `titleStyle` | `rule`, `center`, `ornate` (centred between two `title` motifs), `underline`, `band` | `rule` |
| `caps` | bool, uppercase section titles | `true` |
| `colon` | bool, ':' after labels | `true` |
| `rowLines` | `hair`, `dotted`, `none` | `hair` |
| `eyebrow` | bool, small "BIODATA" above the name | `true` |
| `headerAlign` | `center`, `left` | `center` |
| `tint` | bool, soft tinted page ground | `false` |
| `nameWeight` | number | `600` |
| `pairs` | bool, two-up short rows | `true` |

Ornament roles: `divider` (under the name; none gives a hairline), `corner`,
`watermark` (faint motif behind the first-page header), `title` (under
centred titles, or either side of them with `ornate`). Ornament keys: see
`../core/ornaments.js` (`lotus`, `diamond`, `bead`, `corner`, `mandala`,
`star`, `star8`, `quatrefoil`, `filigree`, `floral`, `scroll`, `vine`,
`paisley`, `marigold`, `bloom`).

Bilingual labels (`labelLanguage: 'both'`): the Hindi half of a row label
follows the English on the same line when it fits and otherwise drops, whole,
to a tight second line (`.bd-lang-both` rules in the archetype CSS). This
keeps `K.sampleData()` at two pages in every label mode. frame and hero use
the same rules.

## frame

A full-page ornamental border repeated on every page (rules in `pageShell`,
four corner ornaments, optional marks breaking the top and bottom rules), a
centred identity header in the flow and a single column of rows inside the
frame. Photo slots: `top-center` (medallion above the name; shape follows
`photoShape`) and `top-right` (beside the centred header). Continuation pages
carry the running head inside the frame. `def.style` options (validated):

| option | values | default |
|---|---|---|
| `border` | `double` (thick + fine rule), `band` (filled band between hairlines), `fine` (fine double rule) | `double` |
| `cornerSize` | mm, 12..36 | `24` |
| `sideMarks` | bool, `ornaments.mark` centred on the top and bottom rules | `false` |
| `titleStyle` | `flank` (rules with diamond tips either side), `center` (ornament below) | `flank` |
| `caps`, `colon`, `rowLines`, `eyebrow`, `tint`, `nameWeight`, `pairs` | as classic | |

Ornament roles: `corner`, `mark`, `divider`, `title`, `watermark`.

## hero

Page 1 opens with a full-bleed block in the band colour (`heroHeight`, about
100 mm). With a photo, the portrait fills the right `photoWidth` mm and fades
into the band; the name, eyebrow and headline sit over the gradient on the
left and a key-facts strip (age, height, education, occupation, work
location or city; hidden fields and sections are respected) runs along the
bottom. Without a photo the block is `plainHeight` tall and shows a monogram
of the initials instead. Continuation pages are plain: a slim band edge and
the running head. Photo slot: `hero` (a full-bleed crop: `photoShape` does
not apply). `def.style` options (validated):

| option | values | default |
|---|---|---|
| `heroHeight` | mm, 96..112 | `100` |
| `plainHeight` | mm, 70..100 | `80` |
| `photoWidth` | mm, 90..130 | `100` |
| `facts` | bool, key-facts strip | `true` |
| `caps` | bool, uppercase section titles | `false` |
| `colon` | bool | `false` |
| `rowLines` | `hair`, `dotted`, `none` | `hair` |
| `pairs` | bool | `true` |

Ornament roles: `mark` (small motif before the eyebrow line).
