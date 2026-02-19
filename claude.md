# Commands

```bash
npm run build        # MUST pass before declaring work complete
npm run dev          # Start dev server
npm run lint         # ESLint, 0 warnings allowed
npm test             # Vitest with jsdom
```

# Code style

- ES modules (import/export), React 18 with JSX runtime
- No prop-types — disabled in ESLint config
- Comments explain "why", not "what"
- Follow existing patterns in the codebase rather than introducing new approaches

# Project-specific rules

- IMPORTANT: Never remove existing features without explicit authorization
- IMPORTANT: Don't add features or expand scope beyond what was asked
- The user is an experienced composer — use proper music theory terminology (parallel fifths, suspension, tonal answer, stretto, invertibility) without explanation
- Correctness over completeness: broken data (wrong measure numbers, incorrect intervals) is worse than missing data
- Visualizations must adapt to varying subject lengths (2–12+ bars). No hardcoded widths
- Read @PROJECT_INTENT.md for design philosophy and visualization specs before making UI changes
- Read @PENDING_FEEDBACK.md for current known issues and changelog before starting work
- Read @docs/WORKING_WITH_USER.md for communication preferences
