# Design System - FightAll

## Product Context
- **What this is:** FightAll is a record-first AI model arena for comparing ratings, matchup records, language-specific results, and run cost.
- **Who it is for:** Builders and operators who want to inspect AI model competition results without treating one language leaderboard as universal.
- **Project type:** Data-heavy web app and league dashboard.

## Design Direction
- **Reference system:** GitHub Primer.
- **Rule:** Use Primer React components and Primer visual tokens first. Add custom CSS only when FightAll needs a domain-specific layout that Primer does not provide.
- **Mood:** Serious, inspectable, and product-like. The interface should feel like a useful league console, not a student demo or marketing page.

## Implementation Baseline
- Use `@primer/react` for app-level theming, base styles, menus, buttons, labels, overlays, and future table/list controls.
- Keep Recharts for rating charts until a better Primer-compatible chart layer is chosen.
- Keep FightAll domain copy, model names, provider names, match IDs, and game names as product data rather than design-system text.

## Color
- **Light mode:** GitHub Primer light palette.
  - Background `#f6f8fa`
  - Surface `#ffffff`
  - Text `#1f2328`
  - Muted text `#59636e`
  - Border `#d1d9e0`
  - Accent `#0969da`
- **Dark mode:** GitHub Primer dark palette.
  - Background `#0d1117`
  - Surface `#161b22`
  - Muted surface `#21262d`
  - Text `#f0f6fc`
  - Muted text `#8b949e`
  - Border `#30363d`
  - Accent `#58a6ff`

## Typography
- Use the Primer/GitHub system font stack:
  `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`.
- Use compact weights and tabular numeric presentation where ranking, rating, cost, or record values need fast scanning.

## Components
- **Topbar controls:** Primer `ActionMenu` with fixed-width buttons. Visible values should stay compact so theme/language changes do not shift layout.
- **Tables and rosters:** Prefer dense, left-aligned, scan-friendly rows. Avoid card grids for core records unless the content is genuinely repeated and visual.
- **Panels:** 8px radius, Primer borders, restrained shadows.
- **Badges:** Use semantic color only for meaningful deltas, wins, losses, warnings, and status.
- **Charts:** Match Primer foreground, border, and muted colors. Chart controls should behave like compact product controls, not form demos.

## Motion
- Keep motion minimal and functional: menu open/close, row expansion, and hover/focus states only.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-29 | Adopt GitHub Primer as the primary design system | The product is data-heavy and benefits from Primer's dense, accessible, product-grade UI patterns. |
