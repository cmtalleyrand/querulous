# Working With This User

Guidance for future Claude instances working on this project. Written to be genuinely useful, not flattering.

---

## Communication Style

**Fast-paced**: The user types quickly and may have typos. Parse intent rather than getting hung up on exact wording. "Soemthijng" means "Something".

**Direct**: Expects clear directives to be followed without excessive clarification. If they say "fix X", fix X. Don't ask "would you like me to also consider Y and Z?"

**Domain expert**: Deep understanding of counterpoint and fugue analysis. Use proper terminology - they'll understand "parallel fifths", "suspension", "tonal answer" without explanation.

**Conversation fatigue**: Notes when conversations become "unwieldy". Prefers breaking work into focused sessions with good handover documentation rather than marathon sessions.

---

## Working Preferences

### What They Appreciate

1. **One task at a time**: When they say "this is the only change I want you to make", respect that boundary.

2. **Reading their comments**: They leave detailed comments in documentation and code. Read these thoroughly before starting work - they contain the context you need.

3. **Technical precision**: The sequence/motif distinction matters to them. A "sequence" must have consecutive repetitions. Getting terminology right is important.

4. **Documentation for handover**: They value well-structured documentation that lets a future instance pick up work without re-discovering the entire codebase.

5. **Efficient context usage**: They noticed that each conversation starts with extensive code reading. Good documentation reduces this startup cost.

### What They Dislike

1. **Proactive additions**: Don't add features or make changes beyond what was asked. A bug fix is just a bug fix.

2. **Over-engineering**: Keep solutions simple. They explicitly called out avoiding unnecessary complexity.

3. **Excessive clarification**: If the task is clear, do it. Don't ask "just to confirm, you want me to..."

4. **Flattery or validation-seeking**: They explicitly stated "this is not a space for flattery". Give honest assessments.

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
4. **Adaptive layout**: Must work for 2-bar to 8+ bar subjects.

The user cares about the tool being **accurate** and **useful for working composers**, not about it looking polished or having lots of features.

---

## Code Quality Expectations

Based on existing code and feedback:

1. **Document the "why"**: Comments should explain reasoning, not just what the code does.

2. **Respect existing architecture**: The codebase has clear patterns. Follow them rather than introducing new approaches.

3. **Test manually**: No automated test suite currently. Test changes manually with various inputs.

4. **Build must pass**: Always run `npm run build` before declaring work complete.

---

## Getting Started on a New Session

1. **Read this document** and `CODEBASE_OVERVIEW.md` first
2. **Check `PROJECT_PLAN.md`** for planned work
3. **Read any comments** the user has left in code or docs
4. **Ask minimal clarifying questions** - if the task is clear, start working
5. **Focus on the specific request** - don't expand scope

---

## Red Flags to Avoid

- Suggesting time estimates ("this will take 2-3 weeks")
- Adding features beyond what was asked
- Over-explaining music theory concepts they already know
- Asking for permission/confirmation when the task is clear
- Spending excessive time re-exploring code that's documented

---

## What Success Looks Like

- Task completed as requested, no more, no less
- Code builds successfully
- Clear commit message
- Documentation updated if architectural changes were made
- Ready for handover to next session if needed
