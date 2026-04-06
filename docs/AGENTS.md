Project: Flyvora

Rules:
- Backend first, UI later
- Seat locking must be correct
- Avoid over-engineering
- Follow implementation-plan.md strictly

🎨 Frontend Standards (React + SCSS)
Styling Rules
Always use SCSS
Use CSS nesting inside SCSS
Avoid long flat class names
.flight-card {
  padding: 16px;

  &__price {
    font-weight: bold;
  }

  &--selected {
    border: 2px solid green;
  }
}
Global Theming (MANDATORY)

All design tokens go in:

src/styles/globals.scss
Include:
Color palette
Spacing scale
Typography
Border radius
Shadows
$color-primary: #1a73e8;
$color-secondary: #0f172a;
$color-accent: #22c55e;

$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
Rules
No hardcoded colors ❌
No inline styles ❌
Always reuse variables ✅
Keep UI minimal and clean (premium feel)