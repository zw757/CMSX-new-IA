# CMSX design system documentation

A separate, local documentation site inside the CMSX repository, tracked on the `design_system` branch. It uses [Base UI's documentation](https://base-ui.com/react/overview/quick-start) as the presentation reference: grouped navigation, examples first, nearby code and source access, and concise usage guidance. CMSX's own styles and assets remain the source; Base UI is a reference, not a replacement component library.

## Run

```sh
cd design-system
npm run dev
```

Open **http://127.0.0.1:5001/**. No dependency installation is required. “Open product” links use the existing product server at `http://127.0.0.1:5000/`.

Run these commands from the repository root on `design_system`. The server refreshes read-only snapshots of the parent product's source and assets on startup. Restart it after product changes. Product files and local-storage state are never modified by the documentation. `.generated/` and `dist/` are ignored, disposable outputs.

## Scope

- Overview and section indexes for Foundations, Components, and Patterns.
- Five foundations, nine component families, and five patterns.
- All 13 product HTML pages mapped to the shared documentation, including alternate in-page views and query-string modes.
- Component specimens, theme previews, source viewer, search, and review notes.
- Examples use actual shared CSS, the actual select and sidebar modules where applicable, and illustrative content. Other example interactions are documented simulations and do not execute product persistence logic.
- Documentation guidance and unresolved inconsistencies are distinguished from implemented behavior. This is an initial source audit, not an accessibility certification or a complete behavior specification.

## Build and verify

```sh
npm run check
npm run build
```

`dist/` is a standalone static site with its source snapshots. Serve it using a static HTTP server; hash-based routes preserve deep links without server rewrites. Hosted builds link to page coverage and source snapshots instead of localhost. Local development retains the links to the product server.

## Hosting

The Sites project ID is recorded in `.openai/hosting.json`. Publish only from `design_system`, using a fresh `npm run build` output. The deployment is a documentation-only snapshot; the product application and its persistence logic are not deployed. The source snapshots available in the documentation's source viewer are included.

The catalog is maintained in `content.js`; layout and rendering live in `app.js` and `styles.css`. The preparation script extracts shared light/dark token values and source files directly from CMSX. Avoid manually editing generated snapshots.
