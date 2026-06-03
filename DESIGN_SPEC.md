# Student Progress Tracker - Premium UI/UX Design Specification

This document serves as the comprehensive design system and visual style guide for the **Al-Xorazmiy School Student Progress Tracker** application. It details the theme variables, color tokens, typography, component styling, animations, and layouts. The core design language is rooted in **Refined Glassmorphism** and **High-Contrast Modernism**, aiming for a premium, lightweight, and highly intentional aesthetic.

---

## 1. Design Tokens & CSS Variables

The application uses custom CSS variables to support dynamic themes (Light and Dark Mode), leaning heavily into translucent surfaces, microscopic borders, and deep, multi-layered shadows.

### 1.1 Color Tokens & Hierarchy

| Variable | Light Theme | Dark Theme | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| `--bg-main` | `#f6f8fa` (Cool off-white) | `#050505` (Pitch black/Deep void) | Main application canvas |
| `--bg-sidebar` | `rgba(255, 255, 255, 0.4)` | `rgba(15, 15, 15, 0.4)` | Sidebar container (Requires backdrop blur) |
| `--bg-card` | `rgba(255, 255, 255, 0.7)` | `rgba(24, 24, 27, 0.65)` | Cards, tables, and modals |
| `--bg-card-hover` | `rgba(255, 255, 255, 0.95)` | `rgba(39, 39, 42, 0.8)` | Row and card interactive hover background |
| `--border-subtle` | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.08)` | Micro-borders for structure, replacing heavy solid lines |
| `--border-highlight`| `rgba(255, 255, 255, 0.6)` | `rgba(255, 255, 255, 0.12)` | Top/inner borders to simulate light reflection |
| `--text-primary` | `#0f172a` (Deep slate) | `#ffffff` (Pure white) | Primary text and headings |
| `--text-secondary` | `#64748b` | `#a1a1aa` | Secondary/metadata text and labels |
| `--accent-hero` | `#000000` (Stark black) | `#6366f1` (Vibrant Indigo) | The single hero accent color |
| `--accent-hover` | `#333333` | `#818cf8` | Hover state for primary items |
| `--accent-glow` | `rgba(0, 0, 0, 0.15)` | `rgba(99, 102, 241, 0.4)` | For active states and button shadows |

### 1.2 Depth, Elevation & Texture Tokens

* **Shadows (`--glass-shadow-soft`)**:
  * *Light*: `0 12px 32px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.04)`
  * *Dark*: `0 24px 48px -12px rgba(0, 0, 0, 0.4), 0 12px 24px -8px rgba(0, 0, 0, 0.2)`
* **Inner Shadows (`--inner-inset`)** (Used for pressed states or segmented control tracks):
  * *Light*: `inset 0 2px 4px rgba(0, 0, 0, 0.06)`
  * *Dark*: `inset 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
* **Backdrop Blur (`--backdrop-blur-md`)**: `blur(24px)` (Used extensively on cards, modals, and headers).
* **Typography**:
  * *Primary System*: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
  * *Tracking (Letter Spacing)*: Headings must use `-0.03em` for a tighter, premium feel.

---

## 2. Component Design & Styling Rules

### 2.1 Buttons & Controls

#### Primary Hero Button (`.btn-primary`)
* **Styling**: `background: var(--accent-hero)`, `color: #ffffff` (Light) or `#ffffff` (Dark), `font-weight: 600`, `letter-spacing: -0.01em`.
* **Shape**: Pill-shaped (`border-radius: 9999px`) for a soft, tactile feel.
* **Elevation**: `box-shadow: 0 8px 16px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2)`. (The inset creates a crisp 3D top-edge).
* **Hover Interaction**: Smooth scale (`transform: scale(1.02) translateY(-1px)`) with expanded shadow spread.

#### Secondary / Icon Buttons
* **Styling**: Translucent background (`rgba(0,0,0,0.03)` / `rgba(255,255,255,0.05)`), `color: var(--text-secondary)`, `border-radius: 50%` or `9999px`.
* **Border**: Explicitly avoid solid 1px borders. Use `border: 1px solid var(--border-subtle)` paired with a soft inner shadow.
* **Hover Interaction**: Background shifts to `var(--text-primary)` with low opacity (e.g., `8%`). Icon color shifts to `var(--text-primary)`.

#### Segmented Controls (Tabs)
* **Track**: Deep inset shadow (`var(--inner-inset)`), rounded pill container (`9999px`).
* **Active Indicator**: Floating pill inside the track. White (Light) or Dark Gray (Dark) background, distinct drop shadow to make it "pop" off the track, `transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)`.

---

### 2.2 Layout Containers & Data Lists

#### Cards & Modals (The Glass Canvas)
* **Background**: `var(--bg-card)` combined with `backdrop-filter: var(--backdrop-blur-md)`.
* **Borders**: Micro-borders to define edges without adding visual weight. `border: 1px solid var(--border-subtle)`.
* **Highlight Edge**: Add a top highlight to simulate glass thickness: `box-shadow: inset 0 1px 0 var(--border-highlight)`.
* **Radii**: Generous rounding. `24px` to `32px` for main modals/containers. `16px` for inner elements.
* **Spatial Contrast (Padding)**: Extreme padding is required. Minimum `24px` for internal card padding, `32px` or `40px` for layout sections. Let the data breathe.

#### Data Lists & Rows
* **Hover Effect**: Entire row shifts background to `var(--bg-card-hover)` with a slight horizontal translate `transform: translateX(4px)`.
* **Separators**: Avoid harsh row borders. Use ultra-faint lines `border-bottom: 1px solid var(--border-subtle)` or rely purely on whitespace.

---

### 2.3 Badges & Micro-Aesthetics

Badges must feel like floating tags, not heavy stickers.

* **Style Formula**: Extremely low opacity background (`8%` to `12%` of the target color) combined with highly saturated text for contrast.
* **Borders**: Zero borders, or a 1px border matching the background opacity.
* **Shape**: Pill-shaped (`border-radius: 9999px`).
* **Typography**: Smaller font size (`0.75rem`), bold weight (`600` or `700`), slight uppercase tracking (`letter-spacing: 0.05em`) for categorical tags.

#### Specific System Badges
* **Success**: `background: rgba(16, 185, 129, 0.1)`, `color: #059669` (Light) / `#34d399` (Dark).
* **Warning**: `background: rgba(245, 158, 11, 0.1)`, `color: #d97706` (Light) / `#fbbf24` (Dark).
* **Error / ID Wrong**: `background: rgba(239, 68, 68, 0.1)`, `color: #dc2626` (Light) / `#f87171` (Dark).

---

## 3. Interactive Modals & Dialogs

* **The Overlay**: True depth requires dimming the background. Use `background: rgba(0, 0, 0, 0.4)` (Light) or `rgba(0, 0, 0, 0.7)` (Dark) paired with `backdrop-filter: blur(8px)`.
* **The Modal Body**: Must feel like a floating pane of glass.
  * `background: var(--bg-card)`
  * `backdrop-filter: var(--backdrop-blur-md)`
  * `border: 1px solid var(--border-subtle)`
  * `box-shadow: var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)`
  * `border-radius: 32px`
* **Entrance Animation**: Elegant scale-in and fade. Spring-like physics.

---

## 4. Animation Keyframes

```css
/* Premium Spring Entrance */
@keyframes premiumScaleIn {
  0% { transform: scale(0.92) translateY(16px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

/* Subtle Floating Pulse for Indicators */
@keyframes softPulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--accent-hero-rgb), 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(var(--accent-hero-rgb), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--accent-hero-rgb), 0); }
}
```

---

## 5. UI/UX Style Checklist (Premium Upgrade)

Before shipping UI changes, verify against the following:
- [ ] **Border Fatigue Check**: Are there heavy solid borders? Replace with `var(--border-subtle)` or remove them entirely using layout spacing.
- [ ] **Glass Reflection**: Do elevated elements (modals, cards) have an inner top shadow simulating a light reflection (`inset 0 1px 0`)?
- [ ] **Spatial Generosity**: Is there at least `24px` to `32px` of padding inside primary containers? Does the typography have room to breathe?
- [ ] **Contrast Hierarchy**: Are secondary text items appropriately dimmed (`var(--text-secondary)`) so the primary data points stand out?
- [ ] **Tactile Interactions**: Do interactive elements (buttons, rows) provide smooth, physics-based feedback on hover (`transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)`)?
