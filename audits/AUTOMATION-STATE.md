# Audit automation coordination

This branch is operational state only. Product changes belong in separate audit branches and Draft PRs. Do not merge this branch into main.

`audits/AUTOMATION-STATE.json` serializes repository writes across audit runs. To acquire, read the branch head and state; if idle, create a child commit with state busy, a unique owner, generation+1 and acquiredAt, then update this branch with the previously read expected_sha and force=false. A rejected compare-and-swap means no ownership: stop all repository writes. Verify ownership before each mutation. Preserve state history; never force-push or delete the coordination branch.

On completion, append a child commit with state idle, owner null and safe lastResult, again using expected_sha. Release in a finally path. If busy belongs to another run, do only read-only or isolated local work and report the blocker privately. Do not steal a lock based on its age; crashed-run recovery requires an explicit owner decision. Store no secrets, vulnerability details or reproduction payloads in this public state.
