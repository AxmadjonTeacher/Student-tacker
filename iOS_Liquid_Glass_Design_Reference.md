◈

**iOS Liquid Glass**

Design System & Engineering Reference

*Complete implementation guide for premium iOS UI/UX*

**1. What Is Liquid Glass?**

Liquid Glass is Apple\'s signature visual material introduced at WWDC
2025, forming the foundation of iOS 26, iPadOS 26, and visionOS 3. It
replaces the older frosted translucency system with a physically
accurate, real-time optical simulation that combines refraction,
reflection, depth blur, and light scattering --- making UI elements
behave like polished, curved glass objects floating in three-dimensional
space.

Unlike simple blur effects, Liquid Glass performs full optical ray
simulation:

- Refraction --- content beneath warps and bends as if passing through a
  curved lens

- Specular reflection --- directional highlights shift with device tilt
  and ambient light

- Subsurface scattering --- edges glow and scatter light like frosted
  glass edges

- Adaptive tinting --- the glass tints to the dominant hue of underlying
  content

- Depth compositing --- multiple glass layers stack with physically
  correct occlusion

> ℹ️ Liquid Glass is not a CSS blur or a SwiftUI .ultraThinMaterial. It
> is a distinct rendering path in RealityKit/CoreAnimation available
> from iOS 26+ only.

**2. Core Visual Properties**

**2.1 The Six Optical Layers**

Every Liquid Glass element is composited from six stacked rendering
layers:

  ------------------------- ---------------------------------------------
  **Layer 1 ---             Live, continuously updated snapshot of
  Background**              content below the glass layer

  **Layer 2 --- Blur Pass** Variable-radius Gaussian blur (4 pt -- 32 pt
                            depending on variant)

  **Layer 3 --- Refraction  Per-pixel normal map drives lens distortion
  Map**                     (0.0 -- 0.18 intensity)

  **Layer 4 --- Specular    Single directional gradient at 12% -- 22%
  Highlight**               white opacity simulating light

  **Layer 5 --- Tint        Extracted dominant color from background at
  Overlay**                 4% -- 14% opacity

  **Layer 6 --- Border      Thin 0.5 pt -- 1.0 pt stroke with inner white
  Ring**                    gradient for edge glow
  ------------------------- ---------------------------------------------

**2.2 Material Variants**

Apple provides four named Liquid Glass material variants, each with
predefined blur, opacity, and refraction values:

  ------------------------------------------------------------------------------
  **Variant**     **Blur       **Opacity**   **Refraction**   **Best Use**
                  Radius**                                    
  --------------- ------------ ------------- ---------------- ------------------
  ultraThin       4 pt         35%           0.04             Tooltips, popovers
                                                              over light BG

  thin            8 pt         50%           0.08             Secondary cards,
                                                              input fields

  regular         16 pt        65%           0.12             Tab bars,
                                                              navigation bars,
                                                              sheets

  thick           28 pt        80%           0.16             Modal dialogs,
                                                              prominent
                                                              containers
  ------------------------------------------------------------------------------

**2.3 Tint Modes**

The tint overlay layer can operate in three modes, switchable via the
tintMode property:

- automatic --- iOS samples the dominant background color every 16 ms
  and blends it

- fixed(color:) --- developer provides a UIColor; no live sampling

- none --- no tint; purely neutral glass (use for accessibility)

**2.4 Light & Shadow Properties**

  ------------------------- ---------------------------------------------
  **shadowRadius**          Outer shadow blur, 0 pt to 40 pt (default: 12
                            pt for regular)

  **shadowOpacity**         0.0 -- 0.35; keep below 0.25 for premium feel

  **shadowOffset**          Typically (0, 4) to (0, 8); avoid
                            horizontal-only shadows

  **innerHighlight**        Top-edge white gradient height, 20% -- 35% of
                            element height

  **reflectionIntensity**   0.0 -- 1.0; default 0.6; reduce for dark
                            environments
  ------------------------- ---------------------------------------------

**3. SwiftUI Implementation**

**3.1 The .glassEffect() Modifier**

The primary entry point in SwiftUI is the .glassEffect() view modifier,
available from iOS 26+:

> import SwiftUI
>
> struct GlassCard: View {
>
> var body: some View {
>
> VStack(spacing: 16) {
>
> Text(\"Title\")
>
> .font(.title2.weight(.semibold))
>
> Text(\"Supporting body text\")
>
> .font(.body)
>
> .foregroundStyle(.secondary)
>
> }
>
> .padding(20)
>
> .glassEffect() // ← Applies default \"regular\" variant
>
> }
>
> }

**3.2 Full Modifier Signature**

> .glassEffect(
>
> \_ effect: GlassEffectConfiguration = .default,
>
> in shape: some InsettableShape = RoundedRectangle(cornerRadius: 16),
>
> isEnabled: Bool = true
>
> )

**3.3 GlassEffectConfiguration**

Construct a custom configuration to fine-tune the material:

> let config = GlassEffectConfiguration(
>
> material: .thin, // ultraThin \| thin \| regular \| thick
>
> tintMode: .automatic, // .automatic \| .fixed(color:) \| .none
>
> refractionIntensity: 0.10, // 0.0 -- 0.18
>
> reflectionIntensity: 0.55, // 0.0 -- 1.0
>
> shadowRadius: 10, // pt
>
> shadowOpacity: 0.18, // 0.0 -- 0.35
>
> shadowOffset: CGSize(width: 0, height: 4)
>
> )
>
> myView.glassEffect(config)

**3.4 GlassEffectContainer for Batched Rendering**

When multiple glass elements share the same Z-plane (e.g., tab bar
buttons), wrap them in GlassEffectContainer to merge their backdrop
snapshots into a single GPU pass --- critical for 60/120 fps
performance:

> GlassEffectContainer {
>
> HStack(spacing: 0) {
>
> TabButton(icon: \"house.fill\", label: \"Home\")
>
> TabButton(icon: \"magnifyingglass\", label: \"Search\")
>
> TabButton(icon: \"bell.fill\", label: \"Alerts\")
>
> TabButton(icon: \"person.fill\", label: \"Profile\")
>
> }
>
> .padding(.horizontal, 16)
>
> .padding(.vertical, 12)
>
> .glassEffect(.default, in: Capsule())
>
> }
>
> ⚠️ Always use GlassEffectContainer when you have 3 or more glass
> elements in the same view hierarchy layer. Without it, each element
> snapshots the backdrop independently --- this multiplies GPU cost
> linearly.

**3.5 Interactive / Animated Glass**

Liquid Glass responds to gesture and animation state through the
.glassEffectID() and matchedGlassEffect() modifiers --- the equivalent
of matchedGeometryEffect but with live material interpolation:

> \@State private var isExpanded = false
>
> RoundedRectangle(cornerRadius: isExpanded ? 24 : 44)
>
> .glassEffect()
>
> .frame(
>
> width: isExpanded ? 340 : 60,
>
> height: isExpanded ? 220 : 60
>
> )
>
> .matchedGlassEffect(id: \"card\", in: namespace)
>
> .animation(.spring(response: 0.45, dampingFraction: 0.72), value:
> isExpanded)
>
> .onTapGesture { isExpanded.toggle() }

**3.6 Dark Mode Adaptation**

Glass materials adapt automatically to light/dark environments. You can
also override:

> .glassEffect()
>
> .environment(\\.colorScheme, .dark) // Force dark glass context
>
> // Or conditionally boost opacity in dark mode:
>
> \@Environment(\\.colorScheme) var scheme
>
> let opacity = scheme == .dark ? 0.75 : 0.60

**4. UIKit Implementation**

**4.1 UIGlassView**

In UIKit, Liquid Glass is exposed through the UIGlassView class, a
direct subclass of UIView:

> import UIKit
>
> class MyViewController: UIViewController {
>
> private let glassPanel = UIGlassView()
>
> override func viewDidLoad() {
>
> super.viewDidLoad()
>
> // Configure material
>
> glassPanel.material = .regular
>
> glassPanel.tintMode = .automatic
>
> glassPanel.refractionIntensity = 0.12
>
> glassPanel.cornerRadius = 20
>
> glassPanel.shadowRadius = 12
>
> glassPanel.shadowOpacity = 0.18
>
> glassPanel.shadowOffset = CGSize(width: 0, height: 6)
>
> // Layout
>
> glassPanel.translatesAutoresizingMaskIntoConstraints = false
>
> view.addSubview(glassPanel)
>
> NSLayoutConstraint.activate(\[
>
> glassPanel.leadingAnchor.constraint(equalTo: view.leadingAnchor,
> constant: 20),
>
> glassPanel.trailingAnchor.constraint(equalTo: view.trailingAnchor,
> constant: -20),
>
> glassPanel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
>
> glassPanel.heightAnchor.constraint(equalToConstant: 200)
>
> \])
>
> }
>
> }

**4.2 UIGlassView Properties Reference**

  ------------------------- ---------------------------------------------
  **material**              UIGlassMaterial (.ultraThin \| .thin \|
                            .regular \| .thick)

  **tintMode**              UIGlassTintMode (.automatic \|
                            .fixed(UIColor) \| .none)

  **refractionIntensity**   CGFloat --- lens distortion strength (0.0 --
                            0.18)

  **reflectionIntensity**   CGFloat --- specular highlight strength (0.0
                            -- 1.0)

  **cornerRadius**          CGFloat --- applied to glass shape and
                            clipping mask

  **shadowRadius**          CGFloat --- drop shadow blur radius in points

  **shadowOpacity**         Float --- drop shadow alpha (0.0 -- 0.35
                            recommended)

  **shadowOffset**          CGSize --- drop shadow offset; prefer (0,
                            4)--(0, 10)

  **isEnabled**             Bool --- graceful fallback to vibrancy when
                            false

  **updateInterval**        TimeInterval --- backdrop refresh rate;
                            default 1/60
  ------------------------- ---------------------------------------------

**4.3 Performance-Optimized Backdrop Batching**

> let container = UIGlassBackdropGroup()
>
> // Attach multiple UIGlassViews to the same backdrop group
>
> // to share a single compositor snapshot
>
> button1.backdropGroup = container
>
> button2.backdropGroup = container
>
> button3.backdropGroup = container

**5. Web & React Native (CSS Approximation)**

**5.1 CSS Liquid Glass Recipe**

For web apps targeting Safari on iOS, you can approximate Liquid Glass
using backdrop-filter with layered pseudo-elements:

> .liquid-glass {
>
> position: relative;
>
> background: rgba(255, 255, 255, 0.08);
>
> -webkit-backdrop-filter:
>
> blur(16px)
>
> saturate(1.8)
>
> brightness(1.05);
>
> backdrop-filter:
>
> blur(16px)
>
> saturate(1.8)
>
> brightness(1.05);
>
> border-radius: 20px;
>
> border: 0.5px solid rgba(255, 255, 255, 0.22);
>
> box-shadow:
>
> 0 4px 24px rgba(0, 0, 0, 0.14),
>
> inset 0 1px 0 rgba(255,255,255,0.28),
>
> inset 0 -1px 0 rgba(0,0,0,0.06);
>
> }
>
> /\* Specular highlight layer \*/
>
> .liquid-glass::before {
>
> content: \"\";
>
> position: absolute;
>
> inset: 0;
>
> border-radius: inherit;
>
> background: linear-gradient(
>
> 160deg,
>
> rgba(255,255,255,0.18) 0%,
>
> rgba(255,255,255,0.04) 35%,
>
> rgba(255,255,255,0.00) 60%
>
> );
>
> pointer-events: none;
>
> }
>
> /\* Refraction distortion overlay \*/
>
> .liquid-glass::after {
>
> content: \"\";
>
> position: absolute;
>
> inset: 0;
>
> border-radius: inherit;
>
> background:
>
> radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.10),
> transparent 60%);
>
> pointer-events: none;
>
> }

**5.2 Tailwind CSS Utility Class**

> /\* tailwind.config.js --- add to theme.extend \*/
>
> glassPanel: {
>
> \"backdrop-blur\": \"16px\",
>
> \"backdrop-saturate\": \"180%\",
>
> \"bg-opacity\": \"8%\",
>
> \"border-opacity\": \"20%\",
>
> }
>
> /\* Usage \*/
>
> \<div className=\"
>
> backdrop-blur-xl backdrop-saturate-150 bg-white/8
>
> border border-white/20 rounded-\[20px\]
>
> shadow-\[0_4px_24px_rgba(0,0,0,0.14)\]
>
> relative overflow-hidden
>
> \"\>
>
> ℹ️ CSS backdrop-filter cannot replicate true lens refraction or
> adaptive tinting. The result is a frosted approximation (iOS \< 26
> style). For full fidelity, native SwiftUI or UIKit is required.

**6. Design Rules & Best Practices**

**6.1 When to Use Liquid Glass**

Liquid Glass should be applied to UI chrome --- elements that float
above or frame content --- not to the content itself:

  -----------------------------------------------------------------------
  **✅ USE Glass For**                **❌ AVOID Glass On**
  ----------------------------------- -----------------------------------
  Navigation bars & toolbars          Body text blocks

  Tab bars                            Long form content containers

  Modal sheets & alerts               Image cards (occludes artwork)

  Floating action buttons             Full-screen backgrounds

  Search bars & input fields          Thin icon-only buttons \< 28 pt

  Context menus & popovers            Nested glass within glass (\> 2
                                      levels)

  Sidebars & inspector panels         Loading / skeleton states
  -----------------------------------------------------------------------

**6.2 Depth Hierarchy Rules**

Liquid Glass encodes depth through progressive opacity and blur. Always
follow this layering model:

- Layer 0 --- Background wallpaper / page content: no glass

- Layer 1 --- Persistent chrome (tab bar, nav bar): regular material,
  65% opacity

- Layer 2 --- Floating panels / sheets: thick material, 80% opacity,
  larger shadow

- Layer 3 --- Popovers / tooltips: thin or ultraThin material, subtle
  shadow

- Layer 4 --- Top-most overlays (alerts, modals): thick material + scrim
  behind

> ⚠️ Never place two glass elements at the same optical depth if they
> overlap. Use depth difference of at least one layer level to preserve
> the hierarchy read.

**6.3 Contrast & Legibility**

Glass is a background material --- text and icons placed on glass MUST
meet WCAG 2.2 AA minimum contrast (4.5:1 for normal text, 3:1 for
large/bold text):

- Use .primary label color over glass --- iOS automatically adjusts for
  vibrancy

- Never use rgba(0,0,0,0.4) grey text directly on glass --- it may fail
  on dark BG

- For custom colors, check contrast against both the lightest and
  darkest likely backdrop

- Enable Increase Contrast in Accessibility settings to test adaptive
  rendering

> 💡 Apple\'s vibrancy effect (.foregroundStyle(.secondary))
> automatically adjusts text luminance to remain legible on any glass
> surface. Prefer it over hardcoded colors.

**7. Spacing System**

**7.1 The 8-Point Grid**

iOS uses an 8-point base grid. All spacing values should be multiples of
4 pt, with preference for multiples of 8 pt:

  -----------------------------------------------------------------------
  **Token**     **Value**     **Usage**
  ------------- ------------- -------------------------------------------
  space-1       4 pt          Micro --- icon to label gap, inline chip
                              padding

  space-2       8 pt          Tight --- between related items in a row

  space-3       12 pt         Snug --- internal padding of small
                              components

  space-4       16 pt         Base --- standard internal cell padding

  space-5       20 pt         Comfortable --- card internal padding

  space-6       24 pt         Relaxed --- section spacing, glass card
                              padding

  space-8       32 pt         Spacious --- major section breaks

  space-10      40 pt         Open --- full-page top margins

  space-12      48 pt         Airy --- hero section spacing
  -----------------------------------------------------------------------

**7.2 Screen Margins**

iOS has defined safe-area and content margins that vary by device
family:

  ------------------------- ---------------------------------------------
  **iPhone 16 / 16 Pro ---  59 pt (Dynamic Island)
  safe area top**           

  **iPhone 16 / 16 Pro ---  34 pt (home indicator)
  safe area bottom**        

  **Content horizontal      20 pt (standard) / 16 pt (compact)
  margin**                  

  **Navigation bar height** 44 pt (standard) + safe area top

  **Tab bar height**        49 pt (standard) + safe area bottom

  **Glass card corner       20 pt (standard) / 28 pt (large) / 12 pt
  radius**                  (small)

  **Minimum tappable        44 × 44 pt (Apple HIG requirement)
  target**                  
  ------------------------- ---------------------------------------------

**7.3 Glass Component Internal Padding**

For Liquid Glass containers specifically, use these padding rules to
ensure the blur material has enough space to show through and the
content does not crowd the glass border:

  ------------------------- ---------------------------------------------
  **Small pill / chip**     Horizontal: 12 pt, Vertical: 6 pt

  **Button (compact)**      Horizontal: 16 pt, Vertical: 10 pt

  **Button (standard)**     Horizontal: 20 pt, Vertical: 12 pt

  **Card / panel (small)**  All sides: 16 pt

  **Card / panel            All sides: 20 pt
  (standard)**              

  **Card / panel (large)**  All sides: 24 pt

  **Modal sheet header**    Horizontal: 20 pt, Vertical: 16 pt

  **Alert dialog**          All sides: 20 pt, Between buttons: 8 pt
  ------------------------- ---------------------------------------------

**7.4 Corner Radius by Size**

Corner radius should scale with element size --- larger elements get
larger corners:

  -----------------------------------------------------------------------
  **Component      **Radius**       **Example**
  Size**                            
  ---------------- ---------------- -------------------------------------
  \< 32 pt height  8 pt             Tags, badges

  32 -- 44 pt      12 pt            Compact buttons, chips

  44 -- 60 pt      14 pt            Standard buttons, text fields

  60 -- 120 pt     18 pt            Small cards, alert rows

  120 -- 240 pt    24 pt            Standard cards, panels

  \> 240 pt        32 pt            Large sheets, modal containers

  Full-screen      20 pt (top only) Sheets presented over tab bar
  sheet                             

  Pill / capsule   height / 2       Floating action buttons, pills
  -----------------------------------------------------------------------

**8. Typography System**

**8.1 SF Pro --- Apple\'s System Font**

All iOS apps should use the system font stack (SF Pro Display for
headings, SF Pro Text for body) to benefit from Dynamic Type,
accessibility scaling, and optical sizing:

> // SwiftUI --- always use .font() with semantic styles
>
> Text(\"Large Title\") .font(.largeTitle)
>
> Text(\"Title 1\") .font(.title)
>
> Text(\"Title 2\") .font(.title2)
>
> Text(\"Title 3\") .font(.title3)
>
> Text(\"Headline\") .font(.headline)
>
> Text(\"Body\") .font(.body)
>
> Text(\"Callout\") .font(.callout)
>
> Text(\"Subheadline\") .font(.subheadline)
>
> Text(\"Footnote\") .font(.footnote)
>
> Text(\"Caption 1\") .font(.caption)
>
> Text(\"Caption 2\") .font(.caption2)

**8.2 Type Scale Reference**

  --------------------------------------------------------------------------------
  **Style**           **Default**   **Weight**   **Leading**   **Notes**
  ------------------- ------------- ------------ ------------- -------------------
  Large Title         34 pt         Regular      41 pt         App title screens
                                                               only

  Title 1             28 pt         Regular      34 pt         Primary section
                                                               headings

  Title 2             22 pt         Regular      28 pt         Sheet titles, panel
                                                               headers

  Title 3             20 pt         Regular      25 pt         Sub-section
                                                               headings

  Headline            17 pt         Semibold     22 pt         List row labels,
                                                               card titles

  Body                17 pt         Regular      22 pt         Primary reading
                                                               text

  Callout             16 pt         Regular      21 pt         Buttons, prominent
                                                               UI labels

  Subheadline         15 pt         Regular      20 pt         Secondary labels

  Footnote            13 pt         Regular      18 pt         Captions, metadata,
                                                               timestamps

  Caption 1           12 pt         Regular      16 pt         Image captions,
                                                               detail chips

  Caption 2           11 pt         Regular      13 pt         Legal text,
                                                               ultra-fine detail
  --------------------------------------------------------------------------------

**8.3 Typography on Glass --- Special Rules**

- Use .fontWeight(.medium) or .semibold for labels directly on glass,
  not .bold --- heavy weight creates visual noise against the dynamic
  background

- Keep title lines to 1--2 max when centered on glass; left-align for 3+
  lines

- Minimum font size on glass: 13 pt (Caption 1). Never use Caption 2 on
  glass

- Pair vibrancy (.foregroundStyle(.primary/.secondary)) with glass ---
  avoid hardcoded grays

- Line length on glass cards: 45--65 characters for optimal readability

**8.4 Letter Spacing (Tracking)**

  ------------------------- ---------------------------------------------
  **Large Title (34 pt+)**  −0.5 pt to 0 pt (tight --- default)

  **Title styles (20--28    −0.3 pt to 0 pt
  pt)**                     

  **Headline / Callout      0 pt (neutral)
  (16--17 pt)**             

  **Body / Subheadline (\<  0 pt to +0.2 pt (slightly open)
  17 pt)**                  

  **All Caps labels**       +1.0 pt minimum (all caps always needs
                            tracking)

  **Tab bar labels**        0 pt (use system defaults)
  ------------------------- ---------------------------------------------

**9. Color System**

**9.1 Semantic Color Tokens**

Always use semantic system colors --- they adapt to light/dark mode,
increased contrast, and accessibility automatically:

  -----------------------------------------------------------------------------------------
  **Token**                   **UIKit / SwiftUI**          **Usage**
  --------------------------- ---------------------------- --------------------------------
  label                       .label                       Primary text

  secondaryLabel              .secondaryLabel              Supporting text

  tertiaryLabel               .tertiaryLabel               Placeholder text

  quaternaryLabel             .quaternaryLabel             Disabled text

  systemBackground            .systemBackground            Primary view background

  secondarySystemBackground   .secondarySystemBackground   Grouped table bg

  tertiarySystemBackground    .tertiarySystemBackground    Inner grouped cell

  systemFill                  .systemFill                  Control fills (switch tracks
                                                           etc.)

  separator                   .separator                   Full-width dividers

  opaqueSeparator             .opaqueSeparator             Separators requiring opacity

  tintColor / accentColor     .accentColor                 Brand-driven interactive color
  -----------------------------------------------------------------------------------------

**9.2 iOS System Accent Colors (Hex Reference)**

  ------------------------- ---------------------------------------------
  **Blue (default)**        #007AFF

  **Green**                 #34C759

  **Indigo**                #5856D6

  **Orange**                #FF9500

  **Pink**                  #FF2D55

  **Purple**                #AF52DE

  **Red**                   #FF3B30

  **Teal**                  #5AC8FA

  **Yellow**                #FFCC00

  **Mint**                  #00C7BE

  **Cyan**                  #32ADE6

  **Brown**                 #A2845E
  ------------------------- ---------------------------------------------

**9.3 Color on Glass --- Rules**

- Avoid high-saturation solid fills behind glass --- they over-tint the
  adaptive tint layer

- Prefer gradients or subtle textures as page backgrounds for richer
  glass refraction

- Use .ultraThinMaterial over dark imagery; use .thin material over
  light imagery for best legibility

- Destructive actions (delete) on glass: use .systemRed with .bold
  weight, never on ultraThin glass

- For brand color glass tinting, use tintMode:
  .fixed(brandColor.withAlphaComponent(0.12))

**10. Animation & Motion**

**10.1 Spring Animation Presets**

Apple\'s Liquid Glass transitions use spring physics, not linear/eased
curves. Use these presets for authentic feel:

  ------------------------- ---------------------------------------------
  **Default interactive**   .spring(response: 0.45, dampingFraction:
                            0.72)

  **Snappy (button press)** .spring(response: 0.28, dampingFraction:
                            0.80)

  **Bouncy expand**         .spring(response: 0.55, dampingFraction:
                            0.62)

  **Smooth settle**         .spring(response: 0.60, dampingFraction:
                            0.88)

  **Sheet present**         .spring(response: 0.50, dampingFraction:
                            0.78, blendDuration: 0.1)

  **Sheet dismiss**         .spring(response: 0.35, dampingFraction:
                            0.90)
  ------------------------- ---------------------------------------------

**10.2 Glass Morphing --- matchedGlassEffect**

Use matchedGlassEffect to animate glass elements transforming between
shapes or sizes. The material itself morphs --- not just the frame:

> \@Namespace var glassNS
>
> // Source element (e.g., compact tab bar icon)
>
> Image(systemName: \"house.fill\")
>
> .padding(14)
>
> .glassEffect()
>
> .matchedGlassEffect(id: \"homeBtn\", in: glassNS)
>
> // Destination element (e.g., expanded panel)
>
> VStack { \... }
>
> .glassEffect()
>
> .matchedGlassEffect(id: \"homeBtn\", in: glassNS)
>
> // iOS handles blur radius, corner radius, and refraction
> interpolation

**10.3 Haptic Feedback Pairing**

Glass interactions feel premium when paired with appropriate haptic
feedback:

  -----------------------------------------------------------------------------
  **Interaction**           **Haptic**
  ------------------------- ---------------------------------------------------
  Button tap (standard)     UIImpactFeedbackGenerator(.light)

  Button tap (destructive)  UIImpactFeedbackGenerator(.medium)

  Sheet present / dismiss   UIImpactFeedbackGenerator(.soft)

  Toggle on                 UIImpactFeedbackGenerator(.rigid)

  Toggle off                UIImpactFeedbackGenerator(.light)

  Error / validation fail   UINotificationFeedbackGenerator(.error)

  Success confirm           UINotificationFeedbackGenerator(.success)

  Selection change          UISelectionFeedbackGenerator().selectionChanged()
  -----------------------------------------------------------------------------

**11. Accessibility**

**11.1 Required Accessibility Support**

- Always implement isEnabled: false for glass when reduceTransparency is
  enabled --- fall back to a solid fill with equivalent visual hierarchy

- Test with Increase Contrast mode: glass borders should become more
  opaque, tint should remain legible

- Smart Invert and Classic Invert should not invert glass --- use
  .accessibilityIgnoresInvertColors(true) on UIGlassView

- VoiceOver: glass panels are containers, not interactive by default ---
  mark children with appropriate accessibilityLabel and
  accessibilityRole

- Differentiate Without Color: never rely solely on glass tint color to
  convey state --- also use shape, label, or icon changes

**11.2 Reduce Transparency Fallback**

> // SwiftUI
>
> \@Environment(\\.accessibilityReduceTransparency) var
> reduceTransparency
>
> myCard
>
> .background {
>
> if reduceTransparency {
>
> RoundedRectangle(cornerRadius: 20)
>
> .fill(Color(.secondarySystemBackground))
>
> } else {
>
> RoundedRectangle(cornerRadius: 20)
>
> .glassEffect()
>
> }
>
> }
>
> // UIKit
>
> func updateForAccessibility() {
>
> let reduce = UIAccessibility.isReduceTransparencyEnabled
>
> glassView.isEnabled = !reduce
>
> if reduce {
>
> glassView.backgroundColor = .secondarySystemBackground
>
> }
>
> }

**12. Performance Guidelines**

**12.1 GPU Cost Model**

Liquid Glass rendering cost scales with backdrop area (total px²),
number of independent glass layers, and update frequency. Use these
guidelines to stay within budget:

  ------------------------- ---------------------------------------------
  **Max glass layers per    6 independent layers (use containers to
  screen**                  merge)

  **Max total glass area**  \< 65% of screen area on iPhone, \< 55% on
                            iPad

  **Preferred update        1/120 s on ProMotion, 1/60 s on standard
  interval**                displays

  **Background update       Set updateInterval = 1/30 when app is in
  throttle**                background

  **Offscreen glass**       Set isEnabled = false for glass outside
                            viewport + 100 pt

  **Scrolling lists with    Use GlassEffectContainer per visible batch,
  glass cells**             not per cell
  ------------------------- ---------------------------------------------

**12.2 Profiling with Instruments**

- Use Metal System Trace → GPU Compositing track to identify backdrop
  overdraw

- Enable \"Core Animation\" instrument: watch for \"Offscreen Rendered\"
  warnings on glass layers

- Target: glass compositing \< 3 ms per frame on iPhone 14 Pro and later

- Xcode 17 Simulator includes Liquid Glass compositing simulation ---
  use it before device testing

> 💡 If a glass element is not visible to the user (e.g., behind a
> full-screen image), call glassView.isEnabled = false to immediately
> stop the backdrop snapshot loop.

**13. Standard Component Patterns**

**13.1 Floating Tab Bar**

The iOS 26 default tab bar uses a Liquid Glass capsule floating above
the content. To replicate:

> GlassEffectContainer {
>
> HStack(spacing: 0) {
>
> ForEach(tabs) { tab in
>
> TabItem(tab: tab, isSelected: selectedTab == tab)
>
> .frame(maxWidth: .infinity)
>
> }
>
> }
>
> .padding(.horizontal, 20)
>
> .padding(.vertical, 12)
>
> }
>
> .glassEffect(.default, in: Capsule())
>
> .shadow(color: .black.opacity(0.18), radius: 16, y: 6)
>
> .padding(.horizontal, 20)
>
> .padding(.bottom, 8)

**13.2 Navigation Bar**

Navigation bars in iOS 26 use glass with continuous corner radius when
scrolled content reaches the bar:

> .navigationBarMaterial(.glass) // iOS 26+
>
> .navigationBarGlassStyle(.automatic) // .automatic \| .always \|
> .never

**13.3 Glass Card Component**

> struct GlassCard\<Content: View\>: View {
>
> let content: Content
>
> var padding: CGFloat = 20
>
> var radius: CGFloat = 24
>
> init(padding: CGFloat = 20, radius: CGFloat = 24,
>
> \@ViewBuilder content: () -\> Content) {
>
> self.content = content()
>
> self.padding = padding
>
> self.radius = radius
>
> }
>
> var body: some View {
>
> content
>
> .padding(padding)
>
> .glassEffect(.default, in: RoundedRectangle(cornerRadius: radius))
>
> .shadow(color: .black.opacity(0.14), radius: 12, y: 4)
>
> }
>
> }

**13.4 Glass Alert Dialog**

> struct GlassAlert: View {
>
> let title: String
>
> let message: String
>
> let onCancel: () -\> Void
>
> let onConfirm: () -\> Void
>
> var body: some View {
>
> VStack(spacing: 0) {
>
> VStack(spacing: 8) {
>
> Text(title)
>
> .font(.headline)
>
> Text(message)
>
> .font(.subheadline)
>
> .foregroundStyle(.secondary)
>
> .multilineTextAlignment(.center)
>
> }
>
> .padding(20)
>
> Divider().overlay(.white.opacity(0.2))
>
> HStack(spacing: 0) {
>
> Button(\"Cancel\", action: onCancel)
>
> .frame(maxWidth: .infinity)
>
> .padding(.vertical, 14)
>
> Divider().frame(height: 48).overlay(.white.opacity(0.2))
>
> Button(\"Confirm\", action: onConfirm)
>
> .foregroundStyle(.red)
>
> .frame(maxWidth: .infinity)
>
> .padding(.vertical, 14)
>
> }
>
> }
>
> .frame(width: 280)
>
> .glassEffect(.thick, in: RoundedRectangle(cornerRadius: 20))
>
> }
>
> }

**14. Pre-Release Design Checklist**

Before submitting, verify every glass screen against this checklist:

**Visual Quality**

- Glass material variant matches element depth level

- Corner radius follows size-proportional rules

- Shadow opacity does not exceed 0.25

- Specular highlight visible but not over-exposed

- Tint mode set appropriately (automatic for most, fixed for branded
  elements)

- No nested glass deeper than 2 levels

**Typography & Color**

- All text uses semantic font styles (no hardcoded point sizes)

- Minimum 13 pt font size on any glass surface

- Contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large/bold text

- Interactive elements use .accentColor / tintColor

- Destructive actions use .systemRed

**Spacing**

- All spacing values are multiples of 4 pt

- Minimum touch target size: 44 × 44 pt

- Content does not touch glass border --- minimum 16 pt padding

- Safe areas respected on all device sizes

**Accessibility**

- Reduce Transparency fallback tested and visually equivalent

- Increase Contrast mode tested --- glass borders legible

- VoiceOver labels and roles set on all interactive glass elements

- accessibilityIgnoresInvertColors set on glass views

**Performance**

- GlassEffectContainer used for 3+ coplanar glass elements

- Glass disabled for offscreen / occluded elements

- Total glass area \< 65% of screen on iPhone

- Profiled with Metal System Trace --- no GPU overdraw warnings

- 60 fps maintained during all glass transitions (Instruments validated)

*--- End of iOS Liquid Glass Design Reference ---*
