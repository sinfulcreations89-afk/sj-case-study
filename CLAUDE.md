# Project Design Rules

Screens should feel intentional, branded, mobile-friendly, and content-first.

When matching screenshots:
1. Analyze the screenshot before coding.
2. Extract the design system:
   - layout
   - spacing
   - typography
   - color
   - card style
   - border radius
   - icon/image style
   - hierarchy
   - mobile behavior
3. Inspect the current app files.
4. Identify the exact components that control the screen.
5. Propose the smallest safe design update.
6. Wait for confirmation before editing.

Do not:
- redesign unrelated screens
- create a generic SaaS dashboard
- add random visual ideas
- change layout, colors, icons, and copy all at once
- introduce new dependencies unless required
- overwrite the existing brand style

Prefer:
- existing components
- existing Tailwind classes
- existing design tokens
- isolated screen-level changes
- bigger readable mobile layouts
- clear hierarchy
- collapsible/nested mobile sections
