# Contributing to xxd-ui-kit

[中文](CONTRIBUTING.md) · **English**

This is an MIT open-source project — issues and pull requests are welcome. It is also the design system of one maker's brand, and **the author makes the design calls**, so please read “What's welcome” below before you start, to avoid wasted work.
When you change the internals of `packages/kumo`, upstream's guide in `docs/upstream/KUMO-CONTRIBUTING.md` still applies.

## What's welcome

| Very welcome — just open a PR | Open an issue first | Usually not accepted |
| --- | --- | --- |
| Bug fixes, accessibility (keyboard, screen readers, contrast), browser compatibility, Traditional Chinese and English translations, docs, tests, CLI improvements | New components, new patterns, changing how an existing component looks or behaves, new tokens | Visual changes that break the [design principles](https://ui.xiaoxiaodong.ai/en/principles) (shadows on cards, weight 700, web fonts…), changes that are purely a matter of taste |

A visual change has to trace back to one of the design principles; if it doesn't, discuss it in an issue first.

## Before you start

1. Read the design principles (`docs/DESIGN-PRINCIPLES.md`, or the [English page](https://ui.xiaoxiaodong.ai/en/principles)).
2. Set up: Node 24.12 or later, pnpm 12; `pnpm install && pnpm xxd:build`.
3. See it locally: `pnpm dev` (the showcase at http://localhost:4400).

## Where to change things

| To change | Edit only | Then |
| --- | --- | --- |
| Colors, radii, type sizes, spacing, motion | `packages/xxd-tokens/tokens.css` | `pnpm --filter @xxd/tokens build`; the contrast tests must pass |
| Icons | `packages/xxd-icons/src/nodes.js`; categories and Chinese keywords in `src/meta.js` | The icon rule tests must pass |
| Native components | `packages/xxd-css/src/css/*.css`, `src/js/*.js` | Update `registry.json` and its English counterpart `registry.en.js`; check all four appearances |
| How React components map to colors | `packages/kumo/scripts/theme-generator/xxd-overrides.ts` | `pnpm --filter @cloudflare/kumo codegen:themes`, update `docs/token-map.md` |
| React component internals | `packages/kumo/src/components/…` | Change as little as possible (we merge upstream); explain why in the commit message |
| Extension template / CLI | `packages/xxd-extension/`; the command list is `scripts/commands.mjs` | Generate one with `pnpm xxd new` and look at it |
| Showcase pages | `packages/xxd-site/src/views/` (the body), with an entry in both `src/pages/` and `src/pages/en/` | Both languages are required (the tests check) |

Don't hand-edit generated files: `theme-kumo.css`, `ai/*`, `src/primitives/*`, `packages/xxd-react/src/kumo-exports.ts`, any package's `dist/`, or a project's `vendor/xxd/`, `xxd:tokens` region and `xxd-icon-nodes.js`.

## Before you commit

```bash
pnpm xxd:build && pnpm xxd:test           # XXD packages (including all contract tests)
pnpm --filter @cloudflare/kumo test       # if you touched packages/kumo
pnpm lint
pnpm changeset                            # if users will notice the change: add a version note (see .changeset/README.md)
```

The showcase's two checks (`visual` screenshots and the `audit` stress test) need headless Chrome. If you can't run them, say so in the PR and a maintainer will; `audit` also runs in CI.

Visual changes: attach screenshots of all four appearances (light / dark × square / rounded, with at least one accent) and name the principle it follows.

## Commit messages

`feat(xxd): …` / `fix(xxd): …` / `docs: …`, saying what changed and why. One change per commit. Chinese or English are both fine.

## License

Contributions are released under the MIT License. Keep `LICENSE-KUMO` for code that comes from Kumo.

## Conduct and security

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md), not in a public issue.
