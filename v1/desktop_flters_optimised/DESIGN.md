# Design System Specification: The Elevated Voyager

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Concierge**. 

This system moves beyond the transactional nature of travel booking to create an atmosphere of serene authority. Inspired by the precision of high-end horology and the airy expansiveness of a private terminal, the interface rejects the "clutter-core" of traditional booking engines. We achieve a premium feel not through more decoration, but through **Intentional Omission**. 

We break the "template" look by utilizing:
*   **Asymmetric Breathing Room:** Strategic use of the 16 (5.5rem) and 20 (7rem) spacing tokens to create focal points.
*   **Tonal Architecture:** Defining boundaries through light and shadow rather than rigid lines.
*   **Editorial Scale:** Drastic contrast between `display-lg` (56px) for emotional headers and `label-sm` (11px) for technical flight data.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "Deep Sky" philosophy—utilizing high-performance blues and soft atmospheric grays to evoke trust and calm.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts. To separate a flight search result from the main background, use `surface-container-low` (#f2f4f7) sitting on a `surface` (#f7f9fc) background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper.
*   **Base:** `surface` (#f7f9fc)
*   **Sectioning:** `surface-container` (#eceef1)
*   **Floating Elements:** `surface-container-lowest` (#ffffff) for maximum "lift."

### Glass & Gradient Rules
To avoid a flat "out-of-the-box" feel, use **Glassmorphism** for sticky elements like the "Flight Summary Panel."
*   **Token:** `surface-container-lowest` at 80% opacity + 20px Backdrop Blur.
*   **Signature Texture:** Use a subtle linear gradient on primary CTAs: `primary` (#005bbf) to `primary-container` (#1a73e8). This provides a "liquid" depth that feels high-end and interactive.

---

## 3. Typography
We use a dual-font pairing to balance technical precision with editorial elegance.

*   **Display & Headlines (Manrope):** Chosen for its geometric warmth. Use `display-lg` for destination names and `headline-sm` for card titles. These should feel authoritative and spacious.
*   **Body & Labels (Inter):** The workhorse for flight data. Use `body-md` for general descriptions and `label-sm` (Uppercase, +5% tracking) for technical metadata like IATA codes (e.g., LHR → JFK).

**Hierarchy Principle:** Typography should "float" within the generous white space provided by the spacing scale. Never crowd a headline; allow it to command its own 8 (2.75rem) block of vertical space.

---

## 4. Elevation & Depth
We convey hierarchy through **Tonal Layering** rather than structural boxes.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural lift.
*   **Ambient Shadows:** For floating modals, use an extra-diffused shadow: `0px 24px 48px rgba(25, 28, 30, 0.06)`. The tint is derived from `on-surface` (#191c1e) to feel integrated with the environment.
*   **The Ghost Border:** If accessibility requires a stroke (e.g., in high-contrast modes), use `outline-variant` (#c1c6d6) at 20% opacity. **Never use 100% opaque borders.**

---

## 5. Components

### Flight Cards & Lists
*   **Constraint:** Forbid the use of divider lines.
*   **Styling:** Group flight segments using vertical whitespace (`spacing-4`). Use a `surface-container-highest` background for the "Selected" state instead of a blue border.
*   **Interaction:** On hover, the card should transition from `surface-container-low` to `surface-container-lowest` with a subtle `2.5` (0.85rem) scale lift.

### Seat Selection (2D Grid)
*   **Unoccupied:** `surface-container-high` with `rounded-sm`.
*   **Occupied:** `outline-variant` at 40% opacity.
*   **Selected:** `secondary` (#006a62) with a `primary-fixed` glow.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `rounded-full`, `body-md` Semibold.
*   **Secondary:** `surface-container-highest` background, `on-surface` text. No border.
*   **Tertiary:** Ghost style using `primary` text. Use for "View Details" or "Refund Policy."

### Input Fields
*   **State:** Use `surface-container-low` as the default fill.
*   **Focus:** Transition background to `surface-container-lowest` and add a 2pt "Ghost Border" of `primary`.
*   **Supportive Error:** Errors use `error` (#ba1a1a) text but the background of the field should shift to a subtle `error-container` (#ffdad6) to provide a soft, non-alarming warning.

### Sticky Summary Panel
*   **Styling:** Use the **Glassmorphism** rule. Anchor to the bottom of the viewport. Use `title-md` for the total price to ensure it is the most legible element on the screen.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `spacing-12` or `spacing-16` between major sections to let the layout breathe.
*   **Do** use `secondary` (Teal) sparingly—only for "Success" states, price drops, or confirmed bookings.
*   **Do** ensure all interactive elements have a minimum tap target of 44px, even if the visual element is smaller.

### Don’t
*   **Don't** use black (#000000). Always use `on-surface` (#191c1e) for text to maintain the "Calm" tone.
*   **Don't** use 90-degree corners. Even the "sharpest" elements should use `rounded-sm` (2px) to feel premium and approachable.
*   **Don't** use standard "Drop Shadows" from software defaults. Always use the Ambient Shadow formula defined in Section 4.