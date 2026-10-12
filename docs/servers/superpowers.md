# obra/superpowers (skills collection)

297,641 stars - the most-deployed agent skills collection. Skills record (not an MCP server): first
entry in this set covering the skills side. Window v6.4.2 -> v7.0.0 (2026-10).

**Finding: 6 (1 DANGEROUS, 2 REVIEW, 1 GONE, 2 NEW/version-note).** Caught by `rugsnare skills
scan`/`skills diff` and verified with a raw diff between the two tags:

- `brainstorming/SKILL.md` - **DANGEROUS-class**: full instruction rewrite under the same skill
  name. The description widens from "creative work in software" to "planning anything new, in
  software or out of it (a talk, a business, a renovation)", the title changes ("Brainstorming
  Ideas Into Designs" -> "Brainstorming"), and the body is a new persona. Agents on v6.4.2 and
  v7.0.0 follow different instructions from one update to the next.
- `requesting-code-review/SKILL.md` - REVIEW: new BASE_SHA git-log snippet.
- `systematic-debugging/SKILL.md` - REVIEW: new IDENTITY environment-variable handling.
- `brainstorming/spec-document-reviewer-prompt.md` - GONE upstream.
- `brainstorming/builder-check-prompt.md` - NEW: a new prompt file; overlay-based CI checks miss
  new files entirely (no overlay conflict), observed live in ai-dev-helm#206.
- `opencode/INSTALL.md` - version-string bump (plugin ref v7.0.0).

The vendor is exemplary on disclosure: release notes document the brainstorming rewrite and the
reviewer->builder replacement with PR links. The gap is on the consumer side: ~297k users get the
rewritten instructions via plugin update with no diff shown, and teams that overlay upstream skills
hand-port changes (the ai-dev-helm case). File count 74 -> 74 (one removed, one added).

**Repro** (scanner reads the canonical `skills/` root natively since R25):

```bash
git clone --depth 1 --branch v6.4.2 https://github.com/obra/superpowers.git a && cd a
npx rugsnare skills scan          # pins the skill tree
cd .. && git clone --depth 1 --branch v7.0.0 https://github.com/obra/superpowers.git b
cp -r a/.rugsnare b/ && cd b && npx rugsnare skills diff   # 6 findings, 1 dangerous, exit 1
```

Last verified 2026-10-12 (cross-checked against a raw diff of both tags).
