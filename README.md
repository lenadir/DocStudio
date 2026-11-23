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
3. **Excel** — upload `.xlsx`, `.xls` or `.csv`. The row holding the column names is found
   automatically, so a title and blank rows above the table are fine; if it picks the wrong
   one, set **Header row** (it uses the same row numbers as Excel). Multi-sheet workbooks get
   a sheet picker. The panel shows how many rows and columns were read — check it matches
   your file. The sheet's own declared range is ignored in favour of the cells that really
   exist, because exporters often declare one that is too small (data cut off) or far too
   large (phantom empty columns).
4. **Place the fields** — drag a column from the left panel onto the card. Drag a field to
   move it, use the right panel for font, size (in mm), colour, alignment, rotation,
   prefix/suffix. Arrow keys nudge (Shift = bigger steps), Delete removes a field.
   Double-clicking a column drops it in the middle of the card.
   **Images** — click *+ Add image* to place a logo, signature, stamp or photo (PNG, JPG,
   WebP, SVG; PNG transparency is kept). It lands on the side you are viewing; drag it, drag
   the dot on its right edge to resize (height follows the picture), or use the right panel
   to set width, rotation and side. Unlike the template, image fields **are printed**, and
   the same picture appears on every record. Fields stack in the order they were added, so
   an image added after a text field sits on top of it. Large uploads are scaled down to
   1600 px so Save still fits in the browser's storage.
5. **Check** — step through rows with `‹` `›` to confirm long names and odd values still fit.
6. **Print** — tick which sides to print, set **Rows _from_ – _to_** to choose a slice of the
   sheet (rows 5–10, say; it defaults to all of them), then *Print this one* for the record
   on screen or the main button for the range.

### Big lists: print in batches

The browser's print engine slows down disproportionately as pages pile up. Measured on this
app, with both sides printed:

| Records | Pages | Time to render the print job |
| ------- | ----- | ---------------------------- |
| 250     | 500   | 1.5 s                        |
| 1 000   | 2 000 | 36 s                         |
| 3 000   | 6 000 | never finished (gave up at 4 minutes) |

Reading the spreadsheet is not the problem: 5 000 rows load in well under a second, and the
app stays responsive. It is the printing that falls over. So for a long list, use the row
range and print a few hundred rows at a time. Above 1 000 pages the app asks for
confirmation first, because a job that size can lock the browser up.

`sample-participants.xlsx` in this folder is a 5-row example to try it with.

### Printer settings that matter

**The template is never printed.** It is a positioning guide on screen only. What goes on
paper is strictly the values you placed, so you feed your real pre-printed certificates
through the printer and the app overprints the names, numbers and dates onto them.

In the browser's print dialog set **Margins: None** and **Scale: 100%**. The page size is
emitted as a real `@page` rule, so the printer should already offer the right paper.
Leave **Background graphics** off — nothing depends on it any more.

Because only text is printed, do a test run on a blank sheet first and hold it against a
real certificate to check the alignment before using your actual stock.

Printing both sides (recto/verso): *Print all* emits recto, verso, recto, verso… one pair
per record, so with **Two-sided** switched on in the print dialog each verso lands on the
reverse of its own recto, on the same sheet. A record always produces exactly two pages, so
pairs can never drift out of step.

- If the verso comes out upside down (common with landscape sheets and long-edge flipping),
  tick **Flip verso 180°** before printing.
- No two-sided printer? Untick *Back (verso)* and print the rectos, put the stack back in the
  tray, then untick *Front (recto)*, tick *Back (verso)* and print again.

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
