# Brand logo assets

The public landing page (`/`) automatically renders official brand logos from
this folder in the **Brands** section. Until a file exists, the card falls back
to a coloured dot + brand name — no broken images.

## Add your logos here

Save each brand's logo with **exactly** these names (SVG preferred; PNG works as
a fallback — the page tries `.svg` first, then `.png`):

| File                        | Brand                 | Notes                          |
| --------------------------- | --------------------- | ------------------------------ |
| `bookends.svg` / `.png`     | Bookends Hospitality  | Blue wordmark                  |
| `capiche.svg` / `.png`      | Capiche               | Red "Capiche" wordmark / mark  |
| `aiko.svg` / `.png`         | Aiko                  | Gold "AIKO" wordmark / mark    |

Guidance:
- **SVG** is strongly preferred (crisp at any size, tiny file).
- If using PNG, export at ~2× the display size (roughly 340px wide) with a
  transparent background.
- The card renders the logo at ~36px tall and ≤170px wide, `object-contain`, so
  wordmarks and square marks both look right.

That's the only step — no code changes needed. Once the file is in this folder,
`npm run build` (or the dev server) will pick it up and show the real logo.
