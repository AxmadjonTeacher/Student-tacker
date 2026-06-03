# Student Progress Tracker - UI/UX Design Specification
This document serves as the comprehensive design system and visual style guide for the **Al-Xorazmiy School Student Progress Tracker** application. It details the theme variables, color tokens, typography, component styling, animations, and layouts to ensure all future UI updates match the existing aesthetics.

---

## 1. Design Tokens & CSS Variables

The application uses custom CSS variables to support dynamic themes (Light and Dark Mode). 

### 1.1 Color Tokens

| Variable | Light Theme | Dark Theme | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| `--bg-main` | `#f9f8f3` (Creamy beige) | `#0c0c0e` (Deep charcoal) | Main application background |
| `--bg-sidebar` | `#f8fafc` (Off-white) | `#121214` (Dark charcoal) | Left sidebar menu container |
| `--bg-card` | `#ffffff` | `#151518` (Elevation level 1) | Cards, tables, modals background |
| `--bg-card-hover` | `#f8fafc` | `#1f1f23` (Elevation level 2) | Row and card interactive hover background |
| `--border-color` | `#e5e7eb` | `#1e1e22` | Component borders, separators, cell borders |
| `--text-primary` | `#1a1a1a` | `#ffffff` | Primary text and headings |
| `--text-secondary` | `#6b7280` | `#8f8f98` | Secondary/metadata text and labels |
| `--accent-primary` | `#0d9488` (Teal) | `#8b5cf6` (Purple) | Primary action items, active states |
| `--accent-hover` | `#0f766e` | `#a78bfa` | Hover state for primary items |
| `--accent-gradient`| `linear-gradient(135deg, #0d9488, #0f766e)` | `linear-gradient(135deg, #7c3aed, #4f46e5)` (Purple/Indigo) | Primary buttons, headers active states |
| `--marquee-bg` | `linear-gradient(160deg, #edfafa, #f0fdfa)` | `linear-gradient(160deg, #1e1b4b, #0c0c0e)` | Custom banner/infobox backgrounds |

### 1.2 Layout & Shadow Tokens

* **Shadow (`--glass-shadow`)**:
  * *Light*: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`
  * *Dark*: `0 4px 10px rgba(0, 0, 0, 0.4)`
* **Backdrop Blur (`--backdrop-blur`)**: `blur(12px)` (or `blur(16px)` on sticky headers)
* **Fonts**:
  * *Primary System*: `'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif`
  * *Handwritten*: `'Caveat', cursive, sans-serif` (utilized for signatures and hand-drawn accents)

---

## 2. Component Design & Styling Rules

### 2.1 Buttons

#### Primary Action Button (`.btn-primary`)
* **Styling**: `background: var(--accent-gradient)`, `color: #ffffff`, `font-weight: 800`, `border-radius: 8px` (modals) or `9999px` (dialogs).
* **Hover Interaction**: Triggers subtle scale/translate effect (`transform: translateY(-1px)`) and glows with shadow (`box-shadow: 0 4px 12px rgba(accent-color, 0.2)`).
* **Code Sample**:
```tsx
<button style={{
  background: 'var(--accent-gradient)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '0.9rem',
  fontWeight: 800,
  boxShadow: isDarkMode ? '0 4px 12px rgba(139, 92, 246, 0.2)' : '0 4px 12px rgba(13, 148, 136, 0.2)',
  transition: 'all 0.2s ease',
  cursor: 'pointer'
}}>
  BUTTON TEXT
</button>
```

#### Secondary Cancel/Neutral Button
* **Styling**: Transparent or subtle grey background, explicit border `1.5px solid var(--border-color)`, `color: var(--text-secondary)`, `border-radius: 9999px`.
* **Hover Interaction**: Backed by `var(--bg-card-hover)`, changes text to `var(--text-primary)`.

#### Round Icon Buttons (e.g. Edit, Delete, Assign)
* **Design**: Standardized circular shape (`width: 36px`, `height: 36px`, `border-radius: 50%`).
* **Edit Button**: Blue color scheme (`background: #eff6ff`, `color: #2563eb`, `border: 1px solid #bfdbfe`).
* **Users Assign Button**: Green color scheme (`background: #f0fdf4`, `color: #16a34a`, `border: 1px solid #bbf7d0`).
* **Delete Button**: Red color scheme (`background: #fee2e2`, `color: #b91c1c`, `border: 1px solid #fca5a5`).
* **Interaction**: Scale up to `1.1` on hover and deepen background color.

---

### 2.2 Badges & Status Indicators

The app maps student outcomes using specific badges:

#### 1. General Alert Badges
* **Success**: `background: rgba(18, 159, 135, 0.1)`, `color: #0f766e`, border-color `rgba(18, 159, 135, 0.2)`.
* **Warning**: `background: rgba(245, 158, 11, 0.1)`, `color: #b45309`, border-color `rgba(245, 158, 11, 0.2)`.
* **Info**: `background: rgba(14, 165, 233, 0.1)`, `color: #0369a1`, border-color `rgba(14, 165, 233, 0.2)`.

#### 2. Progress Improvement Badge
* Displays positive level gains (e.g. `+1` or `+2` levels).
* **Style**: Light teal background (`rgba(13, 148, 136, 0.12)`), text color `var(--accent-hover)`, pill layout (`border-radius: 9999px`), inline icon `ArrowRight` rotated `-45deg`.

#### 3. ID Wrong Badge (`ID Xato`)
* Indicates database sync exceptions.
* **Style**: `background: rgba(239, 68, 68, 0.15)`, `color: #ef4444`, `border: 1px solid rgba(239, 68, 68, 0.3)`, `border-radius: 6px`. Contains a small red pulsing circular dot.

#### 4. Summer Plan Badge (`☀️ Yozgi Reja`)
* Highlights summer projection paths.
* **Style**: Orange gradient (`background: linear-gradient(135deg, #fff7ed, #ffedd5)`), `color: #ea580c`, `border: 1px dashed #fdba74`, `border-radius: 12px`, strong font weight (`850`).

---

### 2.3 Interactive Modals & Dialogs

* **Overlay**: Fixed screen fill, `background: rgba(15, 23, 42, 0.4)` (with a dark overlay style in dark mode `rgba(0, 0, 0, 0.8)`), backdrop blur `blur(8px)`.
* **Content Container**: Rounded boundaries (`border-radius: 24px`), bordered `1.5px solid var(--border-color)`, drop shadow `var(--glass-shadow)`, scale in animation.
* **Inputs/Selects**: Rounded corners (`border-radius: 12px`), background `var(--bg-card-hover)`, border `1.5px solid var(--border-color)`.
* **Focus State**: border changes to `1.5px solid var(--accent-primary)`, background to `var(--bg-card)`, and is surrounded by a drop outline.

---

### 2.4 Floating Banners

#### Unsaved Changes Banner
* Used when changes are staged inline in a data cell.
* **Style**: Fixed at the bottom center (`bottom: 80px`), glassmorphic backdrop (`backdrop-filter: blur(16px)`), distinct pink theme border (`border: 1.5px solid #db2777`), `border-radius: 24px`.
* **Pulsing Indicator**: A pink circle dot animations in a infinite loop:
```css
@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(219, 39, 119, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(219, 39, 119, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(219, 39, 119, 0); }
}
```

---

## 3. Layout Grid & Structure

### 3.1 App Layout
* **Desktop Structure**:
  * Responsive layout maximum width: `1200px`.
  * Desktop sidebar features vertical navigation icons, while dashboard utilizes responsive charts.
  * Standard student tables are grouped visually by teacher name (using custom panels with `border-radius: 16px`, spacing margin `2rem`).

### 3.2 Responsive Adaptations (Mobile Screen <= 768px)
* **Padding**: Standard container padding falls back to `0.75rem`.
* **Headers**: Left and right side splits collapse into stacked grids or toggle drawers.
* **Search Bar**: Transitions into a full-width search input nested in a sticky header container.
* **Tab Selectors**: Sidebar tabs hide, giving priority to a horizontal sliding class selector pill row with a smooth right-hand fade mask (`mask-image: linear-gradient(to right, black 85%, transparent 100%)`).

---

## 4. Animation Keyframes

```css
/* Modals / Overlays Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modals Slide Up */
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Popups / Dialog Scale In */
@keyframes scaleIn {
  from { transform: scale(0.95) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

/* Loader Spins */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 5. UI/UX Style Checklist for Code Modifications

When adding/modifying UI features, cross-reference this list:
- [ ] **Dynamic Accents**: Ensure colors adapt correctly when theme changes (`#0d9488` teal on Light Mode vs `#8b5cf6` purple on Dark Mode).
- [ ] **Typography**: Headings must be clean with negative letter spacing (`letter-spacing: -0.02em` or `-0.03em`).
- [ ] **Animations**: All modals must utilize `fadeIn` on the overlay and `scaleIn` or `slideUp` on the content wrapper.
- [ ] **Tappable Regions**: For touch devices, ensure elements have `-webkit-tap-highlight-color: transparent` and adequate spacing.
- [ ] **Inputs & Controls**: Do not use hard borders; use `var(--border-color)` (1.5px thick) with subtle border radius (`12px` or `9999px`).
- [ ] **Interactive Hover States**: All buttons, cards, and list rows must have hover definitions (`transform` shifts or background shifts) with `transition: all 0.2s ease` or similar.
