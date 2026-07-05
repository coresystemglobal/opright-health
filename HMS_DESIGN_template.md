---
name: Clinical Blue
colors:
  # ── Surfaces ──────────────────────────────────────────────
  background:                    '#f0f4ff'
  on-background:                 '#0f172a'
  surface:                       '#ffffff'
  surface-bright:                '#ffffff'
  surface-dim:                   '#dbeafe'
  surface-container-lowest:      '#ffffff'
  surface-container-low:         '#f8fafc'
  surface-container:             '#e8f0fe'
  surface-container-high:        '#dbeafe'
  surface-container-highest:     '#c7d7f9'
  surface-variant:               '#e8f0fe'
  surface-tint:                  '#1d4ed8'
  on-surface:                    '#0f172a'
  on-surface-variant:            '#475569'
  inverse-surface:               '#1e3a8a'
  inverse-on-surface:            '#e0e7ff'

  # ── Primary — interactive blue (buttons, links, focus) ────
  primary:                       '#1d4ed8'
  on-primary:                    '#ffffff'
  primary-container:             '#dbeafe'
  on-primary-container:          '#1e3a8a'
  inverse-primary:               '#93c5fd'
  primary-fixed:                 '#bfdbfe'
  primary-fixed-dim:             '#93c5fd'
  on-primary-fixed:              '#0f172a'
  on-primary-fixed-variant:      '#1e3a8a'

  # ── Secondary — sky blue (supporting actions, info chips) ─
  secondary:                     '#0284c7'
  on-secondary:                  '#ffffff'
  secondary-container:           '#e0f2fe'
  on-secondary-container:        '#0c4a6e'
  secondary-fixed:               '#e0f2fe'
  secondary-fixed-dim:           '#7dd3fc'
  on-secondary-fixed:            '#0c4a6e'
  on-secondary-fixed-variant:    '#0369a1'

  # ── Tertiary — warm amber (warnings, moderate alerts) ─────
  tertiary:                      '#d97706'
  on-tertiary:                   '#ffffff'
  tertiary-container:            '#fef3c7'
  on-tertiary-container:         '#78350f'
  tertiary-fixed:                '#fef3c7'
  tertiary-fixed-dim:            '#fde68a'
  on-tertiary-fixed:             '#78350f'
  on-tertiary-fixed-variant:     '#92400e'

  # ── Error / Critical — red ────────────────────────────────
  error:                         '#dc2626'
  on-error:                      '#ffffff'
  error-container:               '#fee2e2'
  on-error-container:            '#7f1d1d'

  # ── Success — green ───────────────────────────────────────
  success:                       '#16a34a'
  on-success:                    '#ffffff'
  success-container:             '#dcfce7'
  on-success-container:          '#14532d'

  # ── Outlines & borders ────────────────────────────────────
  outline:                       '#cbd5e1'
  outline-variant:               '#e2e8f0'
  outline-focus:                 '#1d4ed8'

  # ── Sidebar / navigation anchor ───────────────────────────
  sidebar-bg:                    '#1e3a8a'
  sidebar-active-border:         '#60a5fa'
  sidebar-text:                  '#e0e7ff'
  sidebar-text-muted:            '#93c5fd'
  sidebar-item-hover:            '#1d4ed8'

  # ── Utility ───────────────────────────────────────────────
  placeholder:                   '#94a3b8'
  scrim:                         '#0f172a'

typography:
  headline-h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-default:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px

rounded:
  sm:      0.25rem
  DEFAULT: 0.5rem
  md:      0.75rem
  lg:      1rem
  xl:      1.5rem
  full:    9999px

spacing:
  max-width:       1280px
  sidebar-width:   240px
  header-height:   64px
  columns:         '12'
  gutter:          24px
  margin-mobile:   16px
  margin-desktop:  32px
---

## Brand & Style

This design system is built on a **Corporate / Modern** foundation tailored for the high-stakes environment of healthcare management. The brand personality is rooted in clinical excellence, reliability, and trust. The interface aims to evoke calm confidence and structural order, so hospital staff — from surgeons to administrators — can process complex data without cognitive fatigue.

Blue is the universal language of healthcare. Every major clinical platform (Epic, Cerner, NHS, Mayo Clinic) anchors on blue because of its psychological associations with trust, sterility, and calm authority. This system extends that convention with a precise three-tier blue hierarchy: a deep navy for structural anchors, an interactive blue for all actions, and a soft blue-white for surfaces.

The visual language prioritizes utility over decoration. Whitespace is used deliberately to reduce visual noise. Every element serves a clear functional purpose.

## Colors

The palette uses a disciplined blue hierarchy as its foundation:

- **Interactive Blue `#1d4ed8`:** The primary action color. Used for buttons, links, active states, and focus rings. Passes WCAG AA contrast (4.6:1 on white).
- **Primary Dark `#1e3a8a`:** Navigation anchor, sidebar background, hover/pressed states. Gives the interface authority and depth.
- **Sky Blue `#0284c7`:** Secondary actions, informational chips, and supporting UI elements.
- **Blue-White `#f0f4ff`:** Application background. A 2% blue tint on white — clinical and clean without being stark.

A high-visibility clinical status system sits on top of the blue base:

- **Success Green `#16a34a`:** Completed tasks, normal lab ranges, low-risk patient status.
- **Warning Amber `#d97706`:** Moderate risk, elevated vitals, non-critical alerts.
- **Error Red `#dc2626`:** Emergency status, critical values, destructive actions.
- **Info Sky `#0284c7`:** Informational notices, secondary clinical data.

The neutral text scale uses near-black `#0f172a` on all surfaces for maximum legibility during long clinical shifts.

## Typography

**Inter** — designed for high legibility on digital screens — is the sole typeface. Given the data-heavy nature of hospital management, the scale is compact to maximize information density while maintaining readability.

- **Headlines:** Tighter letter-spacing and heavier weights anchor sections clearly.
- **Body Text:** 14px default accommodates dense data tables and patient records without overwhelming the viewport.
- **Captions & Labels:** 12px, paired with `on-surface-variant` (`#475569`) to establish clear visual hierarchy.

Font stack for email and fallback contexts: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy optimized for the desktop monitors standard in clinical settings.

- **Sidebar:** A persistent 240px deep-navy vertical navigation is the primary structural anchor. It is visually separated from the workspace by the contrast between `sidebar-bg` (`#1e3a8a`) and the surface (`#ffffff`).
- **Top Nav:** A 64px white header (`#ffffff`) with a bottom border (`#e2e8f0`) contains global search, notifications, and user profile.
- **Content Area:** A 12-column grid with 24px gutters and a 1280px max-width, centered in the viewport.
- **Responsive Behavior:** On tablet, the sidebar collapses into a drawer. On mobile, the 12-column grid reflows to single column with 16px horizontal margins.

Spacing is calculated in 4px/8px increments for consistent mathematical rhythm.

## Elevation & Depth

This system uses **Tonal Layers** and **subtle outlines** rather than aggressive shadows — a clean, sanitized aesthetic appropriate for medical software.

- **Level 0 — Background:** `#f0f4ff`. The base canvas. Blue-tinted to reinforce brand without distraction.
- **Level 1 — Cards / Surfaces:** `#ffffff`. Elevated with a 1px `#e2e8f0` border and a soft ambient shadow (`box-shadow: 0 1px 3px rgba(15,23,42,0.08)`).
- **Level 2 — Modals / Popovers:** `#ffffff`. More pronounced shadow (`box-shadow: 0 4px 16px rgba(15,23,42,0.12)`) to pull the element forward from the workspace.
- **Sidebar Depth:** `#1e3a8a` creates a clear structural anchor on the left, visually separating navigation from the functional workspace.

## Shapes

**Rounded**, using a 0.5rem (8px) base radius. This softens the technical nature of the application, making it feel modern and approachable while remaining professional.

- **Standard Elements — 0.5rem:** Buttons, inputs, small chips.
- **Containers — 1rem:** Cards, modals, panels.
- **Status Indicators — Full pill (9999px):** Badges, risk level chips. Visually distinct from interactive buttons.

## Components

### Buttons

- **Primary:** Background `#1d4ed8`, white text, 0.5rem radius. Hover: `#1e3a8a`. Active: `#1e3a8a` + inset shadow.
- **Secondary:** `#ffffff` background, 1px `#cbd5e1` border, `#1d4ed8` text. Hover: `#f0f4ff` background.
- **Danger:** Background `#dc2626`, white text. Reserved for irreversible destructive actions only.
- **Ghost:** No background or border, `#1d4ed8` text. Used for secondary actions in headers and toolbars.
- **Disabled:** Background `#e2e8f0`, text `#94a3b8`. No hover or focus effects.

### Input Fields

White background, 1px `#cbd5e1` border, 0.5rem radius. On focus: border transitions to `#1d4ed8` with a 3px outer glow (`rgba(29,78,216,0.15)`). Error state: `#dc2626` border with `#fee2e2` background tint. Placeholder text: `#94a3b8`.

### Badges & Risk Levels

Pill-shaped (`full` radius). Light tinted background with dark foreground text for accessibility (all exceed WCAG AA 4.5:1):

- **Low Risk / Normal:** `success-container` `#dcfce7` background / `on-success-container` `#14532d` text.
- **Moderate / Urgent:** `tertiary-container` `#fef3c7` background / `on-tertiary-container` `#78350f` text.
- **Emergency / Critical:** `error-container` `#fee2e2` background / `on-error-container` `#7f1d1d` text.
- **Informational:** `secondary-container` `#e0f2fe` background / `on-secondary-container` `#0c4a6e` text.

### Data Tables

Tables are the core of the HMS interface:

- **Header row:** `surface-container` `#e8f0fe` background, `body-medium` typography, `on-surface` `#0f172a` text.
- **Striped rows:** Alternating `#ffffff` and `surface-container-low` `#f8fafc` for horizontal tracking.
- **Row hover:** `surface-container` `#e8f0fe`.
- **Selected row:** `primary-container` `#dbeafe` with a 2px left border in `primary` `#1d4ed8`.
- **Sticky headers:** Enabled for all tables with more than 10 rows.
- **Vertical alignment:** Middle for all cells.
- **Pagination:** Integrated in the card footer — "Previous / Next" controls with record count label.

### Navigation Accents

The sidebar uses `sidebar-bg` `#1e3a8a` as its base. The active menu item has a 4px left-border accent whose color reflects the user's role:

- **Admin:** `primary` `#1d4ed8`.
- **Doctor:** `sidebar-active-border` `#60a5fa` (bright sky — highest visibility).
- **Nurse / Staff:** `secondary` `#0284c7`.
- **Patient Portal:** `primary-container` `#dbeafe` text on `primary` `#1d4ed8` background.

### Notification & Alert Banners

Full-width banners that sit below the top nav, using the clinical status color system:

- **Info:** `secondary-container` background / `on-secondary-container` text / `#0284c7` left border.
- **Success:** `success-container` background / `on-success-container` text / `#16a34a` left border.
- **Warning:** `tertiary-container` background / `on-tertiary-container` text / `#d97706` left border.
- **Critical:** `error-container` background / `on-error-container` text / `#dc2626` left border.

### Email Templates

HTML emails follow the same brand system. Font stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`. Max-width: 600px, centered.

- **Header bar:** `sidebar-bg` `#1e3a8a` background, white "Hospital Management System" wordmark.
- **Body container:** `#ffffff` background, 1px `#e2e8f0` border, 1rem radius.
- **CTA button:** `primary` `#1d4ed8` background, white text, 0.5rem radius.
- **Footer:** `surface-container-low` `#f8fafc` background, `caption` typography in `#475569`.
