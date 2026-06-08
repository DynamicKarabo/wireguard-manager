# WireGuard Manager — Design Specification

> **Version:** 1.0
> **Scope:** Frontend-only SPA. Dark-only theme. Steel-teal accent.
> **Non-negotiables:** No box-shadows · No glassmorphism · No blur · System fonts · Border-based depth · 5-level background hierarchy.

---

## 1. Color System

The interface uses a **5-level background hierarchy** to convey depth through luminance steps rather than shadows. Each level sits ~4–10 luminance points above the one below it.

### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `--bg-canvas` | `#0b0d0e` | App root / behind everything |
| `--bg-surface` | `#121517` | Primary content surfaces, panels |
| `--bg-raised` | `#191d1f` | Cards, modals, dropdown menus |
| `--bg-hover` | `#212628` | Hover state on interactive rows/cards |
| `--bg-active` | `#2a2f32` | Active/pressed/selected state |

### Text

| Token | Hex | Contrast vs `bg-surface` | Usage |
|---|---|---|---|
| `--text-primary` | `#f2f5f6` | ~16.5:1 (AAA) | Headings, body, key values |
| `--text-secondary` | `#b8c0c4` | ~9.8:1 (AAA) | Labels, secondary copy |
| `--text-tertiary` | `#7e888d` | ~4.6:1 (AA) | Captions, timestamps, hints |

### Accent (Steel-Teal)

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#3B8EA5` | Primary buttons, links, focus ring, active nav |
| `--accent-hover` | `#4a9fb6` | Hover on accent elements |
| `--accent-muted` | `#2a5a68` | Subtle accent fills, selected backgrounds |

### Borders

| Token | Hex | Usage |
|---|---|---|
| `--border-subtle` | `#23282b` | Default card/input/divider borders |
| `--border-strong` | `#333a3e` | Emphasized borders, table grid, graph edges |

### Status

| Token | Hex | Meaning |
|---|---|---|
| `--status-online` | `#4caf7e` | Peer connected / handshake fresh |
| `--status-offline` | `#d65a5a` | Peer down / no handshake |
| `--status-degraded` | `#d9a441` | Stale handshake / high latency |

### CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --bg-canvas:    #0b0d0e;
  --bg-surface:   #121517;
  --bg-raised:    #191d1f;
  --bg-hover:     #212628;
  --bg-active:    #2a2f32;

  /* Text */
  --text-primary:   #f2f5f6;
  --text-secondary: #b8c0c4;
  --text-tertiary:  #7e888d;

  /* Accent */
  --accent:       #3B8EA5;
  --accent-hover: #4a9fb6;
  --accent-muted: #2a5a68;

  /* Borders */
  --border-subtle: #23282b;
  --border-strong: #333a3e;

  /* Status */
  --status-online:   #4caf7e;
  --status-offline:  #d65a5a;
  --status-degraded: #d9a441;
}
```

> **Theming note:** No `[data-theme="light"]` block exists. This is a dark-only product by design (see Anti-Slop Rule #10).

---

## 2. Typography

System fonts only — no web font loading, no FOUT, no layout shift.

```css
:root {
  --font-system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                 Helvetica, Arial, sans-serif, "Apple Color Emoji",
                 "Segoe UI Emoji";
  --font-mono:   ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
                 "Liberation Mono", monospace;
}
```

### Type Scale

| Role | Size | Line Height | Weight | Font | Usage |
|---|---|---|---|---|---|
| Heading 1 | 24px | 32px (1.33) | 600 | system | Page titles |
| Heading 2 | 20px | 28px (1.4) | 600 | system | Section titles |
| Heading 3 | 16px | 24px (1.5) | 600 | system | Card titles |
| Heading 4 | 14px | 20px (1.43) | 600 | system | Subheadings, table groups |
| Body | 14px | 20px (1.43) | 400 | system | Default copy |
| Mono | 13px | 20px (1.54) | 400 | mono | Keys, IPs, config, CLI output |

```css
h1 { font: 600 24px/32px var(--font-system); color: var(--text-primary); }
h2 { font: 600 20px/28px var(--font-system); color: var(--text-primary); }
h3 { font: 600 16px/24px var(--font-system); color: var(--text-primary); }
h4 { font: 600 14px/20px var(--font-system); color: var(--text-primary); }
body { font: 400 14px/20px var(--font-system); color: var(--text-primary); }
code, .mono { font: 400 13px/20px var(--font-mono); }
```

> Mono is mandatory for: public/private keys, allowed-IPs, endpoints, handshake timestamps, and any copyable config block.

---

## 3. Spacing

A **4px base unit**. All margins, paddings, and gaps snap to this scale.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

```css
:root {
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-12: 48px; --space-16: 64px;
}
```

> No arbitrary pixel values (e.g. `13px`, `17px`) in layout. Snap to the scale.

---

## 4. Component Specifications

### Layout primitives

| Component | Property | Value |
|---|---|---|
| Sidebar | width (expanded) | 240px |
| Sidebar | width (collapsed) | 64px |
| Topbar | height | 56px |
| Card | border-radius | 6px |
| Card | padding | 16px vertical / 20px horizontal |
| Input | padding | 8px 12px |
| Badge | border-radius | 12px (pill) |

### Sidebar

```css
.sidebar {
  width: 240px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  transition: width 160ms ease;
}
.sidebar[data-collapsed="true"] { width: 64px; }
.sidebar .nav-item {
  height: 40px;
  padding: 0 var(--space-4);
  border-radius: 6px;
  color: var(--text-secondary);
}
.sidebar .nav-item:hover { background: var(--bg-hover); }
.sidebar .nav-item[aria-current="page"] {
  background: var(--accent-muted);
  color: var(--text-primary);
  border-left: 2px solid var(--accent);
}
```

### Topbar

```css
.topbar {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 var(--space-6);
  display: flex;
  align-items: center;
}
```

### Card

```css
.card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 16px 20px;
}
.card:hover { border-color: var(--border-strong); } /* depth via border, not shadow */
```

### Input

```css
.input {
  background: var(--bg-canvas);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font: 400 14px/20px var(--font-system);
}
.input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-color: var(--accent);
}
.input::placeholder { color: var(--text-tertiary); }
```

### Badge (pill)

```css
.badge {
  border-radius: 12px;
  padding: 2px 10px;
  font: 600 12px/16px var(--font-system);
  border: 1px solid var(--border-strong);
  background: var(--bg-active);
  color: var(--text-secondary);
}
```

### Button

```css
.btn-primary {
  background: var(--accent);
  color: #0b0d0e;
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 8px 16px;
  font: 600 14px/20px var(--font-system);
}
.btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 8px 16px;
}
.btn-secondary:hover { background: var(--bg-hover); }
```

---

## 5. Status Indicator System

> **Rule:** Status is **never communicated by color alone** (WCAG 1.4.1). Every status pairs a **colored dot + icon shape + text label**.

| State | Color | Icon | Label |
|---|---|---|---|
| Online | `#4caf7e` | Green check circle (●✓) | "Online" |
| Offline | `#d65a5a` | Red X circle (●✕) | "Offline" |
| Degraded | `#d9a441` | Amber warning triangle (▲!) | "Degraded" |

### Markup

```html
<span class="status status--online" role="status" aria-label="Peer status: Online">
  <svg class="status__icon" aria-hidden="true" width="14" height="14">
    <!-- check-circle path -->
  </svg>
  <span class="status__dot" aria-hidden="true"></span>
  <span class="status__label">Online</span>
</span>
```

```css
.status { display: inline-flex; align-items: center; gap: var(--space-2);
          font: 600 13px/16px var(--font-system); }
.status__dot { width: 8px; height: 8px; border-radius: 50%; }
.status--online   { color: var(--status-online); }
.status--online   .status__dot { background: var(--status-online); }
.status--offline  { color: var(--status-offline); }
.status--offline  .status__dot { background: var(--status-offline); }
.status--degraded { color: var(--status-degraded); }
.status--degraded .status__dot { background: var(--status-degraded); }
```

> Icon **shape** carries meaning for color-blind users: distinct silhouettes (circle/X/triangle) are distinguishable without hue.

---

## 6. QR Code (Peer Config)

For sharing peer configs with mobile clients.

| Property | Value |
|---|---|
| Size | 256 × 256 px |
| Color scheme | **Dark modules on light background** (inverse of app theme — required for scanner reliability) |
| Quiet zone | 3 modules |
| Error correction | Level **H** (~30% recovery) |
| Render target | `<canvas>` |

> The QR code intentionally **breaks** the dark theme: it must be dark-on-light so phone cameras scan reliably. Frame it in a light card.

```js
function renderPeerQR(canvas, configText) {
  QRCode.toCanvas(canvas, configText, {
    width: 256,
    margin: 3,                 // 3-module quiet zone
    errorCorrectionLevel: 'H',
    color: {
      dark:  '#0b0d0e',        // dark modules
      light: '#ffffff',        // light background
    },
  });
}
```

```html
<div class="qr-frame">
  <canvas id="peer-qr" width="256" height="256"
          role="img" aria-label="QR code for peer configuration"></canvas>
</div>
```

```css
.qr-frame {
  background: #ffffff;        /* deliberate light island */
  padding: var(--space-4);
  border-radius: 6px;
  width: max-content;
}
```

---

## 7. Topology Graph

D3 **force-directed** graph of the WireGuard mesh.

| Element | Shape | Fill | Notes |
|---|---|---|---|
| Server node | Hexagon | `#3B8EA5` (accent) | Sized larger than peers |
| Peer node | Circle | `#b8c0c4` (text-secondary) | r ≈ 8px |
| Edge | Line | `#333a3e` (border-strong) | 1px stroke |
| Label | Text | `#b8c0c4` | 12px system font, bottom-center under node |

**Interactions:** pan + zoom (`d3.zoom`), hover highlights the hovered node and its directly connected neighbors + edges (others dim to ~30% opacity).

```js
const sim = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(80))
  .force("charge", d3.forceManyBody().strength(-240))
  .force("center", d3.forceCenter(width / 2, height / 2));

const svg = d3.select("#topology")
  .attr("role", "img")
  .attr("aria-label", "Network topology graph");

const g = svg.append("g");
svg.call(d3.zoom().scaleExtent([0.4, 4]).on("zoom", e => g.attr("transform", e.transform)));

// Servers — hexagons
g.selectAll(".server")
  .data(nodes.filter(n => n.type === "server")).enter()
  .append("polygon")
    .attr("points", d => hexPath(14).map(p => p.join(",")).join(" "))
    .attr("fill", "#3B8EA5");

// Peers — circles
g.selectAll(".peer")
  .data(nodes.filter(n => n.type === "peer")).enter()
  .append("circle")
    .attr("r", 8)
    .attr("fill", "#b8c0c4");

// Edges
g.selectAll(".edge").data(links).enter()
  .append("line").attr("stroke", "#333a3e").attr("stroke-width", 1);

// Labels — bottom-center, 12px system
g.selectAll(".label").data(nodes).enter()
  .append("text")
    .text(d => d.name)
    .attr("text-anchor", "middle")
    .attr("dy", 26)
    .attr("font", "400 12px -apple-system, system-ui, sans-serif")
    .attr("fill", "#b8c0c4");

function highlight(node) {
  const connected = new Set([node.id]);
  links.forEach(l => {
    if (l.source.id === node.id) connected.add(l.target.id);
    if (l.target.id === node.id) connected.add(l.source.id);
  });
  g.selectAll("polygon,circle").attr("opacity", d => connected.has(d.id) ? 1 : 0.3);
  g.selectAll("line").attr("opacity", l =>
    l.source.id === node.id || l.target.id === node.id ? 1 : 0.15);
}
```

---

## 8. Anti-AI-Slop Rules

Ten hard rules. CI lints against violations where mechanically checkable.

1. **No purple/violet gradients.** No `linear-gradient` decorative fills. Flat fills only; accent is steel-teal, not purple.
2. **No glassmorphism.** No `backdrop-filter`, no translucent frosted panels.
3. **No box-shadows.** `box-shadow` is banned globally. Depth comes from background steps + borders.
4. **No blur.** No `filter: blur()` or `backdrop-filter: blur()` anywhere.
5. **No rounded-everything.** Only 6px border-radius on cards, inputs, and buttons. No pill buttons, no 9999px radius, no circular elements (except status dots at 50%).
6. **System fonts only.** No `@font-face`, no Google Fonts, no web font loading. Zero FOUT, zero layout shift from font swap.
7. **Real data in mocks.** No "lorem ipsum" in any data file. Peer names are realistic ("phone", "laptop", "server-01"), IPs are valid RFC1918 addresses, keys are correctly formatted base64.
8. **Border-based depth.** Cards have `border: 1px solid var(--border-subtle)` that strengthens on hover. No shadows, no `z-index` stacking for elevation. Depth hierarchy is `bg-canvas → bg-surface → bg-raised → bg-hover → bg-active`.
9. **Status never color-only.** Every status indicator includes shape + text + color — never relies on hue alone (WCAG 1.4.1).
10. **Dark-only default.** No light mode. No theme toggle. Dark theme is the product identity, not an afterthought.

---

## 9. WCAG Compliance

### Contrast

| Text level | Minimum contrast | Measured |
|---|---|---|
| Primary (`#f2f5f6`) | 7:1 (AAA) | ~16.5:1 ✓ |
| Secondary (`#b8c0c4`) | 7:1 (AAA) | ~9.8:1 ✓ |
| Tertiary (`#7e888d`) | 4.5:1 (AA) | ~4.6:1 ✓ |

### Focus Indicators

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Applied to all interactive elements: links, buttons, inputs, table rows (when `tabindex="0"`), and graph nodes.

### Keyboard Navigation

- **Skip-to-content link** is the first focusable element on every page, linking to `#main-content`
- **Sidebar nav** is a `<nav>` with `<a>` elements — fully keyboard navigable
- **Peer table** rows have `tabindex="0"` and `onKeyDown={Enter → navigate}` for arrow-key scrolling
- **Topology graph** supports Tab to focus the SVG container, then arrow keys to pan, +/- to zoom
- **Settings form** uses standard `<form>` with labeled inputs — Tab flows naturally

### Aria Patterns

```html
<!-- Skip link -->
<a href="#main-content" class="skip-link">Skip to content</a>

<!-- Nav landmark -->
<nav aria-label="Main navigation">

<!-- Status indicators (already covers color + shape) -->
<span role="status" aria-label="Peer status: Online">

<!-- Charts for screen readers (data table hidden behind toggle) -->
<div role="img" aria-label="Transfer chart for peer laptop. Last 24 hours: 1.2GB received, 340MB sent.">

<!-- Topology graph -->
<svg role="img" aria-label="Network topology: 3 servers, 12 peers">

<!-- Dynamic content regions -->
<section aria-label="Server health matrix" aria-live="polite">
```

### Error Handling

- **Error Boundary** catches runtime errors per route and shows a user-friendly message with a Retry button
- **Empty states** show descriptive fallback messages, never raw error text
- **Data staleness** warning when `generatedAt` is older than 2× refresh interval
- **Schema validation errors** are caught by the fetch layer and shown as "Data format error" — never raw Zod output
