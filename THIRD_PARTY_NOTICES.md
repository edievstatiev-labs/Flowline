# Third-party notices

This application includes copied registry source and installed dependencies. Upstream license texts for copied components and earlier development dependencies are preserved in `licenses/`; npm dependency licenses remain in their packages when installed. No single application-wide license replaces those terms.

| Source | Use | License and retained notice |
|---|---|---|
| [Bklit](https://bklit.com/docs/installation) / [official source repository](https://github.com/bklit/bklit-ui) | Every overview and run-history chart | MIT; copyright 2026 uixmat; `licenses/bklit-LICENSE.txt` |
| [BeUI](https://beui.dev/) / [official source repository](https://github.com/starc007/ui-components) | Current review interface, copied from the official registry | MIT; copyright 2026 Saurabh Chauhan; `licenses/beui-LICENSE.txt` |
| [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) | Earlier starter; removed from the current submission | MIT; copyright 2026 Micka Touillaud; `licenses/fluid-functionalism-LICENSE.txt` |
| [REUI](https://github.com/keenthemes/reui) | Earlier Trace source; removed from the current submission | MIT; copyright 2025 Keenthemes Inc; `licenses/reui-LICENSE.txt` |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Registry tooling and earlier Base UI Trace provenance | MIT; copyright 2023 shadcn; `licenses/shadcn-ui-LICENSE.txt` |
| [React Bits](https://github.com/DavidHDev/react-bits) | Earlier FadeContent source; removed from the current submission | MIT + Commons Clause; copyright 2026 David Haz; `licenses/react-bits-LICENSE.txt` |
| [DejaVu fonts](https://dejavu-fonts.github.io/) | Embedded font subsets in `SPEC.pdf` | Bitstream Vera/DejaVu font license; `licenses/dejavu-fonts-LICENSE.txt` |

## BeUI source and adaptations

All visible review controls use BeUI. The earlier Fluid, REUI and React Bits component sources were removed from this submission; their licenses remain as a record of the development history. No fallback control from another library was required.

BeUI is distributed as copied registry source rather than an npm runtime package. Components were retrieved from `https://beui.dev/r/{slug}.json`; the inspected official repository commit was `1572b0ed728836080df8925672df82ce11df6f76`. `components/beui/SOURCE_MANIFEST.json` records original file paths, registry slugs, local paths and original/local SHA-256 hashes. Original-source hashes describe the retrieved upstream files; local hashes describe the modified files shipped here.

The installed registry items are `agent-activity`, `alert`, `animated-badge`, `animated-toast-stack`, `bouncy-accordion`, `breadcrumb`, `button-base`, `card`, `collapsible`, `drawer`, `input`, `loader`, `select`, `table`, `tabs` and `tooltip`. Shared files are included where required. The app uses the relevant subset; installing a registry item does not mean it appears in the review interface.

Deliberate adaptations: imports use the local `components/beui` namespace; Table supports native page scrolling without virtualization for this 40-workflow review; SelectTrigger passes accessible labels through; semantic theme roles improve border, muted-text and destructive-state readability. Primary blue is deepened from `#0285f7` to `#006bd6`, increasing white-text contrast from approximately 3.68:1 to 5.15:1; amber badge text is also darkened. Drawer retains keyboard/focus/body-lock behavior, with the app choosing its panel size and supplying a close control; its focus trap excludes descendants of hidden tab panels. Table row activation ignores nested links/buttons to prevent duplicate activation. Bklit supplies every chart, as described below.

## Bklit source and adaptations

Bklit chart sources were retrieved from `https://ui.bklit.com/r/{name}.json` and installed through the shadcn CLI using a local bundle that preserves their original content while isolating imports and theme roles. The inspected repository commit was `e303e47d9d0599be79b328c5f5098ec8605d9e97`. `components/bklit/SOURCE_MANIFEST.json` records original paths, registry/local paths and original/local SHA-256 hashes. The source bundle covers Area, Pie, Scatter, Legend and their recursive registry dependencies. Legend was subsequently installed with `npx shadcn@latest add @bklit/legend`; existing chart source was reused. The CLI's utility overwrite prompt was declined to preserve BeUI's shared utility. No Studio code or Bklit service/API is included.

Local adaptations: imports use `components/bklit`; a relocated loading-label import is corrected; Scatter supports an explicit 0–24 clock-hour domain without automatic expansion and publishes that domain to its shared YAxis; grid and axis use matching explicit clock ticks; Area forwards a source-date formatter; Area/Scatter support native vertical touch panning without touchmove cancellation, and Pie uses `pan-y`. Scoped theme roles match BeUI. The application disables entry animation, provides exact UTC/source-clock tooltips, and offers keyboard run controls/source tables because Scatter's individual points are hover-oriented. Two integration regressions exercise actual chart SVGs and interaction hooks with DOM-size shims.

React Bits was used in an earlier iteration and is no longer included in the current component source. Its retained MIT + Commons Clause license documents that development history; the original license text remains authoritative.

The component registry files are copied source, so future upstream changes are not installed automatically by `npm update`. Review changes against this application's interaction, accessibility and shared-design defaults before replacing files. The lockfile records npm package versions.

Original license files were retrieved from the official repositories on 27 October 2026. Their URLs and hashes are recorded in `licenses/manifest.json`.

The chart styling revision applies Bklit's [Linked legend](https://bklit.com/recipes#linked-legend) and [Gradient glow](https://bklit.com/recipes#gradient-glow) recipes. Legend stays in the existing `components/bklit` namespace and uses host semantic tokens. BeUI buttons inside LegendItem add keyboard and touch preview through Bklit's public legend context. Percentage values use total workflows as `maxValue`, as required by the installed source. The dark chart palette resolves `--chart-1` through the host's lighter `--info` token. Area keeps its original data, linear curve, dimensions, axes and tooltip; only the requested grid/fill/stroke/fade treatment changes. Its internal `useId()` keeps gradients and masks unique. No RingChart is rendered, so no extra ring or progress visualization was introduced.

The official `bklit-ui` and `bklit-ui-design` skills were installed from `bklit/bklit-ui/skills` for this revision. Their project/design detection, source inspection and recipe guidance were applied. The design detector only scans conventional chart locations and the configured global CSS; its missing-Bklit/palette warning did not recognize this project's namespaced components and imported theme. Installed source and theme files were checked directly.

A subsequent table cleanup gives open BeUI Select roots their own stacking layer so sticky table headings cannot cover menu options. Rounded table surfaces use CSS `overflow: clip`, which clips the edge paint without introducing a scrolling ancestor. Spacer cells are hidden using their aria-hidden attribute rather than a last-child selector, preserving the empty-results cell. The title's scope-rule badge uses the already installed MorphPopover, MorphPopoverTrigger, MorphPopoverContent, Button and AnimatedBadge.


The later chart-spacing revision uses Bklit's official Scatter and TooltipContent guidance with the existing copied chart source. App composition supplies larger figures, status colors, active-point dimming and a selected-run inspector. The area plot grows to 152px following the user's later sizing request. Source timestamps and data are unchanged. Additional chart guidance uses BeUI's inline Collapsible to remain within the drawer's focus boundary. No copied vendor files or dependencies changed in this pass.
