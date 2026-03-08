# Working With This User

Guidance for future Claude instances working on this project. Written to be genuinely useful, not flattering.

---

## Communication Style

**Fast-paced**: The user types quickly and often has typos. Parse intent rather than getting hung up on exact wording. "Soemthijng" means "Something".

**Direct**: Expects clear directives to be followed without excessive clarification. If they say "fix X", fix X. Don't ask "would you like me to also consider Y and Z?"

**Domain expert**: Deep understanding of counterpoint and fugue analysis. Use proper terminology - they'll understand "parallel fifths", "suspension", "tonal answer" without explanation.

---

## Working Preferences

### What They Appreciate

1. **Task completion**: Complete all taks assigned in full,

2. **Reading their comments**: They leave detailed comments in documentation and code. Read these thoroughly before starting work - they contain the context you need.

3. **Technical precision**: When they ask questions on how a feature works, provide a detailed technical answer, not a "user-friendly" explanation.
   

### What They Dislike

1. **Feature Removal:** Don't remove features without prior authorisation.

2. **Over-simplification**: Some things are complex for a reason.

3. **Assuming Intent:** Avoid assuming you understand their intent unless clealry communicated. 


---

## Domain Context

This is a **fugue analysis tool** for **experienced composers**. Key concepts:

- **Subject**: The main melodic theme of a fugue
- **Countersubject (CS)**: A secondary melody that accompanies the subject
- **Answer**: The subject transposed (usually up a fifth)
- **Stretto**: Overlapping entries of the subject
- **Invertibility**: Whether voices can swap positions (double counterpoint)

The user understands species counterpoint, interval classification, dissonance treatment, and fugal structure at an advanced level. They're building a tool to help composers evaluate fugue material before committing to a full composition.

---

## Project Philosophy

From `PROJECT_INTENT.md`:

1. **Correctness first**: Broken information is worse than missing information.
2. **Clarity through good design**: Dense information is fine if well-organized.
3. **Comprehensive display**: Show all relevant information, don't hide it.
4. **Interactivity:** Information displayed must be interactively linked to visualisations.
5. **Adaptive layout**: Must work for 2-bar to 8+ bar subjects.

The user cares about the tool being **accurate** and **useful for working composers**, not about it looking polished or having lots of features.

---

## Code Quality Expectations (Timeless Engineering Policy)

These are repository-level engineering constraints and should be treated as stable policy.

1. **Document the "why"**: Comments should explain design rationale and invariants, not only implementation mechanics.

2. **Respect existing architecture**: Prefer extending established module boundaries and data flow patterns over introducing parallel approaches.

3. **Use layered verification**:
   - For logic changes, execute automated checks with `npm test` and `npm run test:coverage` to validate unit/integration behavior.
   - For visual or interaction changes, add targeted manual verification of the affected UI pathways.

4. **Build must pass**: Always run `npm run build` before declaring work complete.

---

## Workflow

### Engineering Workflow (Timeless)

1. **Read context documents**: Start with this file and `CODEBASE_OVERVIEW.md`.
2. **Align with project roadmap**: Check `PROJECT_PLAN.md` for sequencing and constraints.
3. **Implement within scoped request**: Resolve the requested behavior without unrelated feature expansion.
4. **Verify in layers**:
   - Run `npm test` and `npm run test:coverage` when logic paths are modified.
   - Run targeted manual checks when visual behavior or interaction flow is modified.
5. **Validate release readiness**: Run `npm run build` before handoff.

### User Collaboration Notes (User-Specific)

1. **Read user-authored comments carefully**: The user leaves implementation-relevant guidance in docs and code.
2. **Clarify only when ambiguity blocks correctness**: Prefer execution over excessive back-and-forth, but do not guess on materially ambiguous requirements.
3. **Honor scope discipline**: Deliver exactly the requested outcome unless explicit expansion is requested.

---

## Red Flags to Avoid

- Adding features beyond what was asked
- Spending excessive time re-exploring code that's documented

---

## What Success Looks Like

- Task completed as requested, no more, no less
- Code builds successfully
- Clear commit message
- Documentation updated if architectural changes were made
- Ready for handover to next session if needed
