# xxd-ui-kit · XXD UI Kit

[中文](README.md) · **English**

The interface kit behind XXD (小小东): the member site and every Chrome extension use it, so they all look like they come from the same place.

It is built on Cloudflare's open-source component library [Kumo](https://github.com/cloudflare/kumo). Kumo handles the hard-to-get-right parts — keyboard navigation, focus, screen readers — and we give it the XXD look. Open source under the [MIT License](LICENSE).

**Browse every component live: <https://ui.xiaoxiaodong.ai/en/>**

**Out of the box:**

- Square corners by default, with a switch for rounded
- Light and warm-black dark themes
- Emphasis in ink by default, or one of 18 accent colors
- Three languages: Simplified Chinese, Traditional Chinese, English
- System sans-serif fonts only — no web fonts to load

## What's inside

Three layers, bottom to top; each layer uses the one below:

```
Tokens      colors, type sizes, spacing, radii              @xxd/tokens   @xxd/icons
  ↓
Components  native, framework-free (extensions, site)       @xxd/css
            React (Kumo, restyled)                          @xxd/react
  ↓
Extension   create extensions, sync components,             @xxd/extension
kit         sync settings
```

| Package          | In one sentence                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@xxd/tokens`    | The single source of every color, type size, spacing step and radius. Ships a first-frame script so pages open in the user's theme without a flash   |
| `@xxd/icons`     | 201 icons drawn one way (24 grid, 1.5 stroke)                                                                                                        |
| `@xxd/css`       | 59 native components and 13 XXD patterns (drag and drop, image viewer, confirm twice…) — one CSS file plus one JS file                               |
| `@xxd/react`     | Kumo's React components in the XXD look, plus XXD-only components and two providers for appearance and language                                      |
| `@xxd/extension` | The Chrome extension toolkit: one command creates an extension, appearance settings sync across its pages, UI injected into web pages stays isolated |
| `@xxd/site`      | The showcase: every component, pattern, full-page template and design principle, live, in Chinese and English                                        |

## How to use it

Start with what kind of project you have.

### 1. A new Chrome extension

```bash
pnpm xxd new ~/js/today-extension --name "Today" --slug today
```

You get an extension you can load right away with “Load unpacked”: side panel, settings page, membership page and three languages included. The component files are copied into the extension's own `vendor/xxd/`, because Chrome extensions can't load remote code.

When the components are updated later:

```bash
pnpm xxd sync ~/js/today-extension     # copy in the latest version
pnpm xxd status ~/js/*                 # see which extensions are behind
```

Wire it into a page like this:

```html
<!-- boot.js goes first: the very first frame already uses the user's theme -->
<script src="vendor/xxd/boot.js" data-key="today-ui"></script>
<link rel="stylesheet" href="vendor/xxd/xxd.css" />
<script src="vendor/xxd/icons.js"></script>
<script src="vendor/xxd/xxd.js"></script>
<script src="vendor/xxd/extension.js"></script>
<body class="xxd-page">
  …
</body>
```

For the details — how appearance settings are stored, how to put UI into a web page — see the [extension kit](docs/en/EXTENSION-KIT.md).

### 2. An existing project with its own styles (like the member site)

Bring in the new variables and icons without changing how anything looks. Existing variables always win; the tokens only add what's missing:

```bash
pnpm xxd sync  <project-dir>    # write tokens and icons as the project's xxd.config.json says
pnpm xxd adopt <project-dir>    # optional: drop old variables identical to the tokens and let the tokens provide them
```

How to write the config and how to prove “zero visual change”: [member site integration](docs/member-site.md) (in Chinese).

### 3. A React project

```tsx
import {
  Button,
  Dialog,
  DialogActions,
  XxdAppearanceProvider,
} from "@xxd/react";
import "@xxd/react/standalone.css"; // without Tailwind
// With Tailwind v4 use instead: @import "tailwindcss"; @import "@xxd/react/styles.css";
```

## Looking up components

From the command line, no docs needed:

```bash
pnpm xxd ls             # list every component
pnpm xxd doc Dialog     # usage, attributes and rules for one component
pnpm xxd doc Dialog --react
```

To see them in action, open the showcase at <https://ui.xiaoxiaodong.ai/en/>. While changing code, run it locally:

```bash
pnpm --filter @xxd/site dev     # open http://localhost:4400/en/
```

The showcase comes in Chinese and English (English under `/en/`; switch in the top right). Every page also has a `.md` version, plus `llms.txt` and a component registry API, so AI assistants can read it.

## Development

Requires Node 24+ (verified on 26.11) and pnpm 12.

```bash
pnpm install
pnpm xxd:build              # build every XXD package
pnpm xxd:test               # run every XXD test
pnpm --filter @cloudflare/kumo test   # also run this after changing packages/kumo
pnpm lint
```

### Two checks before shipping

```bash
pnpm --filter @xxd/site build
pnpm --filter @xxd/site visual   # screenshot comparison: every page × 4 appearances against the last run
pnpm --filter @xxd/site audit    # stress test: zero accessibility issues, long text never overflows, hostile pages can't interfere, high-contrast mode stays readable, nothing left untranslated on English pages
```

Both need headless Chrome; set `CHROME_EXE`. The screenshot baseline lives only on your machine.

### Updating the live showcase

```bash
pnpm --filter @xxd/site run release   # build, then deploy to Cloudflare (ui.xiaoxiaodong.ai)
```

Log in to Cloudflare with `wrangler login` first. Pushing to GitHub does not update the site; run this command yourself.

### Where to change things

- **Something looks wrong**: change the tokens in `packages/xxd-tokens/tokens.css`; components never hard-code colors.
- **A component is wrong**: change `packages/xxd-css/src/`, then update its description in `registry.json` and the English text next to it in `registry.en.js` (tests fail if you forget).
- **The parts of React components that come from Kumo**: change the source config in `packages/kumo`, then run codegen. Never hand-edit generated files like `theme-kumo.css`.

The full map is in the [contributing guide](CONTRIBUTING.md) (in Chinese).

### A few hard rules

- No shadows on cards, rows or buttons.
- Font weights 400, 500 and 600 only.
- Animations only change opacity and position.
- Every visual decision has to trace back to the [design principles](docs/DESIGN-PRINCIPLES.md) (in Chinese; the [principles page](https://ui.xiaoxiaodong.ai/en/principles) shows them in English).

## Documentation

Most docs are in Chinese; the showcase covers the same ground in English.

| To find out                       | Read                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Why it looks this way             | [Design principles](docs/DESIGN-PRINCIPLES.md) · [in English, live](https://ui.xiaoxiaodong.ai/en/principles) |
| How to use it in an extension     | [Extension kit](docs/en/EXTENSION-KIT.md)                                                                     |
| How it fits into the member site  | [Member site integration](docs/member-site.md)                                                                |
| How the showcase is built         | [Docs site](docs/DOCS-SITE.md)                                                                                |
| Which Kumo variable maps to which | [Token map](docs/token-map.md)                                                                                |
| How to merge new Kumo versions    | [Syncing upstream](docs/UPSTREAM.md)                                                                          |
| Progress so far                   | [Plan](docs/PLAN.md), [optimization plan](docs/OPTIMIZATION-PLAN.md)                                          |
| Instructions for AI assistants    | [AGENTS.md](AGENTS.md)                                                                                        |

> The repository still contains Kumo's original docs site: `pnpm dev` at the root opens localhost:4321. That is Kumo's own site, used when merging upstream; to see the XXD look, use the showcase on port 4400.

## License

MIT. The XXD parts are in [LICENSE](LICENSE); the code from Kumo is also MIT, with its text in [LICENSE-KUMO](LICENSE-KUMO).
