# Драфт: три инцидента в ASI Agentic Exploits & Incidents Tracker

Формат трекера — таблица: | Date | Exploit/Incident | Impact Summary | ASI T&M Mapping | Links to further analysis (Vendor/CVE/Discoverer) |.
Гайдлайн трекера: анализировать с agentic-угрозами в голове, не повторять вендоров,
ссылаться на их работу. Все три кейса — обнаружены RugSnare (Discoverer), каждый
с воспроизводимой страницей и командами. Сабмит: PR в ASI_Agentic_Exploits_Incidents.md.

## Предлагаемые строки таблицы

| Date | Exploit / Incident | Impact Summary | ASI T&M Mapping | Links |
|---|---|---|---|---|
| Oct 2026 | **MCP tool rename wave inside minor releases (@azure-devops/mcp)** | 75 pinned tools GONE + 29 NEW across 2.5.0 -> 2.10.0 minors (most GONE/NEW mass is same-contract renames; 6 true BREAKING drifts). Downstream agents keep allow-lists by tool name: renames silently de-authorize approved tools and orphan saved workflows. A user-documented breakage exists (skills' `allowed-tools` and agents' `tools` stop matching). Not malicious - which is the point: supply-chain integrity events do not need an attacker. | ASI04 (Agentic Supply Chain), ASI09 (trust/audit: allow-lists keyed on names) | [Discoverer analysis + repro](https://github.com/Paraphern/rugsnare/blob/main/docs/servers/azure-devops.md) · [user breakage report](https://github.com/microsoft/azure-devops-mcp/issues/1448) |
| Oct 2026 | **32 quiet input tightenings shipped unmarked alongside one documented breaking change (@currents/mcp)** | 2.3.3 -> 2.6.1: 32 BREAKING schema tightenings (`minLength=1` on `projectId`/`actionId`/`signature` across the currents-*-action family, an `expiresAfter` type tightening) - arguments that were valid (empty strings) now rejected. The changelog marks exactly one change as Breaking - a tool rename, correctly - while the 32 quiet tightenings in the same window carry no mention: loud breaking documented, quiet breaking unmarked. Agents fail at call time with no signal at upgrade time. | ASI04 (Agentic Supply Chain), ASI02 (tool misuse via silent contract change) | [Discoverer analysis + repro](https://github.com/Paraphern/rugsnare/blob/main/docs/servers/currents.md) |
| Oct 2026 | **Silently injected instruction resources (hostinger-api-mcp)** | Within one week of releases: 6 resources (SKILL.md-type instruction files) added/rewritten server-side with unchanged URIs - invisible to envelope-only checks. The agent's context store is modified without any contract event; a poisoned resource body rides the same URI the user approved. Caught by resource content hashing (envelope hash alone misses it). | ASI06 (Memory and Context Poisoning), ASI04 (Agentic Supply Chain) | [Discoverer analysis + repro](https://github.com/Paraphern/rugsnare/blob/main/docs/servers/hostinger.md) |

## Ньютанс-заметки перед сабмитом

1. **Не называть ничего атакой**: все три кейса - интегрити-события без злого умысла
   (кроме hostinger, где формулировка «injected» уже осторожная - страница говорит
   «6 injected resources», сохраняем её лексику). Трекер хочет agentic-анализ,
   не обвинения.
2. **azure-devops**: главная фраза - «renames silently de-authorize approved tools»
   (это и есть agentic-специфика: allow-lists по имени ломаются при сохранном контракте).
3. **currents**: «loud breaking documented, quiet breaking unmarked» - дословно со
   страницы, это самый чистый ASI04-кейс.
4. Порядок сабмита: один PR, три строки. Если мейнтейнеры попросят дробить - дробим.
