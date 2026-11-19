# Certificate Filler

Fill certificates or badges from a spreadsheet: upload the front and back template,
upload the Excel file, drag each column onto the spot where it belongs, and print —
one page per row, at the exact millimetre size of your card.

Everything runs in the browser. No server, no database, no upload of your data anywhere.

## Run it

```bash
npm install
npm run dev      # opens http://localhost:5173
```

For a hosted copy (intranet, IIS, `python -m http.server`):

```bash
npm run build    # writes dist/
npm run preview  # serves the built copy
```

## Run it on another PC

```bash
npm run standalone
```

That writes **`standalone/Certificate-Filler.html`** — a single 496 kB file with the app,
its stylesheet and SheetJS inlined. Copy that one file to the other machine (USB, email,
shared drive) and double-click it. No Node, no install, no server, no internet. Chrome,
Edge and Firefox all work.

Don't just copy the `dist/` folder: browsers refuse to load ES modules over `file://`, so a
copied `dist/` opens as a blank page. The standalone build inlines everything precisely so
that nothing has to be fetched. Hosting `dist/` on any web server is fine.

Two things worth telling whoever receives it:

- **The template and field positions don't travel inside the HTML.** Do the placement once
  here, click *Export*, and send `card-layout.json` next to the HTML file — they click
  *Import* and the template images and every field position come back exactly as you left
  them. Opened from `file://`, the browser-storage *Save* may not persist between sessions,
  so Export/Import is the dependable route.
- In the print dialog: **Margins: None**, **Scale: 100%**, **Background graphics on**.

The font menu only offers fonts that ship with Windows, so nothing reflows on a machine
that never saw your design.

## How to use it

1. **Template** — upload the front image, and the back if your card has one
   (PNG / JPG / WebP / SVG). The card height snaps to your image's proportions on the
   first upload; you can drag an image straight onto the canvas too.
2. **Paper size** — pick a preset in the toolbar or type exact millimetres. This is the
   size that gets printed, so set it to your real certificate stock.
   *Fit to image* re-matches the height to the template's aspect ratio.
3. **Excel** — upload `.xlsx`, `.xls` or `.csv`. **Row 1 must hold the column names.**
   Multi-sheet workbooks get a sheet picker.
4. **Place the fields** — drag a column from the left panel onto the card. Drag a field to
   move it, use the right panel for font, size (in mm), colour, alignment, rotation,
   prefix/suffix. Arrow keys nudge (Shift = bigger steps), Delete removes a field.
   Double-clicking a column drops it in the middle of the card.
5. **Check** — step through rows with `‹` `›` to confirm long names and odd values still fit.
6. **Print** — tick which sides to print, then *Print this one* or *Print all*.

`sample-participants.xlsx` in this folder is a 5-row example to try it with.

### Printer settings that matter

In the browser's print dialog set **Margins: None** and **Scale: 100%**, and enable
**Background graphics** so the template image prints. The page size is emitted as a real
`@page` rule, so the printer should already offer the right paper.

Printing both sides: *Print all* emits front, back, front, back… so duplex printing lands
each back on the reverse of its own front.

### Layouts

*Save* keeps the layout (positions plus templates) in this browser. *Export* writes a
`card-layout.json` you can keep next to the certificate design and *Import* later — handy
for reusing the same placement next year.

## Stack

- **React + TypeScript + Vite** — a single static bundle, no backend
- **SheetJS (`xlsx`)** — reads the workbook in the browser
- **CSS `@page` printing** — the print output is the same component as the on-screen card,
  measured in millimetres, so what you place is what prints

```
src/
  App.tsx                  state, toolbar, print trigger
  types.ts                 field/layout model, paper presets, fonts
  components/
    Sidebar.tsx            uploads, column chips, layout save/load
    Editor.tsx             drop target, drag-to-move, resize handle
    CardFace.tsx           renders a card face (shared by screen and print)
    Inspector.tsx          font/size/colour/position of the selected field
    PrintSheets.tsx        one page per row per side
  lib/
    excel.ts               workbook -> columns + rows
    storage.ts             save/restore/export/import, image reading
```

Field positions are stored as percentages of the card, and font sizes in millimetres, so a
layout stays correct at any zoom, any screen, and any paper size you switch to.
