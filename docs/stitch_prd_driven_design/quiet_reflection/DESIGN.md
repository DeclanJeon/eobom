---
name: Quiet Reflection
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1b1c1a'
  on-surface-variant: '#434843'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#737973'
  outline-variant: '#c3c8c1'
  surface-tint: '#4d6453'
  primary: '#061b0e'
  on-primary: '#ffffff'
  primary-container: '#1b3022'
  on-primary-container: '#819986'
  inverse-primary: '#b4cdb8'
  secondary: '#605e5a'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2dc'
  on-secondary-container: '#666460'
  tertiary: '#271013'
  on-tertiary: '#ffffff'
  tertiary-container: '#3f2427'
  on-tertiary-container: '#b0898c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e9d4'
  primary-fixed-dim: '#b4cdb8'
  on-primary-fixed: '#0b2013'
  on-primary-fixed-variant: '#364c3c'
  secondary-fixed: '#e6e2dc'
  secondary-fixed-dim: '#c9c6c0'
  on-secondary-fixed: '#1c1c18'
  on-secondary-fixed-variant: '#484743'
  tertiary-fixed: '#ffd9dc'
  tertiary-fixed-dim: '#e7bcbf'
  on-tertiary-fixed: '#2d1417'
  on-tertiary-fixed-variant: '#5d3f42'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2e0'
  accent-terracotta: '#B36A5E'
  accent-gold: '#C5A059'
  safety-blue: '#4A6FA5'
  surface-shared: '#F0F4F2'
  text-main: '#2D2D2D'
  text-muted: '#6B6B6B'
typography:
  display-lg:
    fontFamily: manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-journal:
    fontFamily: sourceSerif4
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  body-lg:
    fontFamily: sourceSerif4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: sourceSerif4
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
  label-md:
    fontFamily: manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  body-lg-mobile:
    fontFamily: sourceSerif4
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is rooted in the philosophy of "The Mirror Approach"—a UI that serves as a calm, unobtrusive reflection of the user’s inner spiritual journey. The brand personality is **reflective, peaceful, and trustworthy**, purposefully avoiding the gamified "noise" of modern apps (no streaks, no leaderboards, no pressure).

The visual style is a blend of **Minimalism** and **Tactile Modernism**. It prioritizes generous whitespace and a "Quiet Product" philosophy to prevent cognitive overload during meditation. The interface should feel like high-quality stationery: grounded, intentional, and permanent. We use subtle textures and soft depth to create a sense of safety and sanctuary, ensuring the user feels a "Quiet Connection" to both the content and their faith.

## Colors

The palette is inspired by natural elements and traditional journaling materials. 

- **Primary (Deep Forest):** Used for core branding, primary buttons, and active states. It symbolizes stability and spiritual growth.
- **Secondary (Linen Beige):** The primary background color. It provides a warmer, more comfortable reading environment than pure white, mimicking the feel of physical paper.
- **Accents:** **Terracotta** is used for "Heart" or "Empathize" actions, while **Gold** is reserved for highlights, scripture references, or secondary active states.
- **Functional Colors:** A specific **Safety Blue** is used for crisis resources and professional help links, distinguishing them from spiritual content. 
- **Contextual Surfaces:** Use `surface-shared` (a slight cool-tinted variant) to visually distinguish the "Together" anonymous feed from the "Private" personal journal to ensure user privacy awareness.

## Typography

This system employs a dual-font strategy to balance utility with soul.

- **UI & Navigation (Manrope):** A clean, modern sans-serif used for headers, labels, buttons, and AI-generated reports. It conveys professionalism and clarity.
- **Content & Reflection (Source Serif 4):** A refined serif used for Bible verses and user-written reflections. This evokes the "journal" feel and is optimized for long-form reading and editing.

**Hierarchy Rules:**
- Use `display-lg` for landing branding only.
- Use `title-journal` for entry titles.
- All Scripture excerpts must use `body-lg` with increased line height (32px) to encourage slow, meditative reading.
- Labels and metadata (dates, AI disclaimers) use `label-sm` to remain present but non-distracting.

## Layout & Spacing

The layout follows a **fluid grid** with an 8px base rhythm. To support the "Quiet Product" philosophy, padding is intentionally generous to prevent the UI from feeling "crowded."

- **Mobile:** A single-column layout optimized for one-handed use. Bottom navigation provides quick access to the core tabs (Today, History, Together, My Info).
- **Desktop:** A fixed-width central container (max 1024px) for reading/writing. For "AI Reports," a two-column layout is used to allow side-by-side comparison of past commitments and current observations.
- **Margins:** Vertical spacing between sections (stack-lg) is intentionally large to create mental "breathing room" between different thoughts or AI insights.

## Elevation & Depth

To maintain a grounded and "honest" aesthetic, we avoid heavy drop shadows or floating layers. 

- **Tonal Layering:** Depth is primarily communicated through slight color shifts in background surfaces (e.g., a card slightly lighter than the base linen background).
- **Subtle Shadows:** Use "Ambient Shadows"—extremely low-opacity (4-6%), large-radius shadows that make cards feel as though they are resting softly on paper rather than hovering in space.
- **Interaction Depth:** When a user taps an input field or a card, use a subtle inner border (1px) in the primary color rather than a shadow increase to maintain a flat, tactile feel.
- **Modals:** Use a soft backdrop blur (8px) with a semi-transparent linen overlay to keep the user grounded in their current context.

## Shapes

The shape language is soft and organic, avoiding sharp clinical edges.

- **Cards & Inputs:** Use `rounded-lg` (16px) for main journal cards and AI observation containers.
- **Buttons & Chips:** Use `rounded-xl` (24px) or full pill shapes for interactive elements like "Emotions" or "Tags."
- **Focus States:** High-visibility but soft-edged focus rings ensure accessibility without introducing jarring geometric contrast.

## Components

### Cards
Journal entries and AI Observations are housed in cards with `secondary-color` backgrounds and subtle 1px borders (#E0DDD7). AI Observation cards should include integrated "Disclaimer" labels at the bottom in `label-sm`.

### Buttons & Chips
- **Primary Action:** Rounded-xl, Forest Green background, White text.
- **Secondary/Tag:** Pill-shaped, light beige stroke with `label-md` text.
- **Reaction Icons:** Low-contrast icons that only "fill" with color (Terracotta/Gold) once interacted with, providing quiet confirmation.

### Input Fields
Large, borderless writing areas for reflections, distinguished only by a subtle vertical "margin line" on the left (reminiscent of notebook paper) in a muted gold.

### Navigation
- **Mobile Bottom Nav:** High-legibility icons with active states indicated by a simple dot beneath the icon, rather than a color change of the icon itself.
- **Tabs:** Underlined tabs with a soft transition, using `headline-sm` typography.

### Progress & Loading
AI generation states must use a "Clear Progress" indicator—a soft, pulsing ambient glow rather than a mechanical spinning wheel, maintaining the calm atmosphere.