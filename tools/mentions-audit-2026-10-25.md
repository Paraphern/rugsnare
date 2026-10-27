# Полный аудит упоминаний RugSnare в интернете (2026-10-25)

Метод: gh CLI (issues/PRs/code/commits API) + npm registry API + 3 веб-агента (открытый веб, соцплатформы, каталоги). Категории: наши площадки / сторонние GitHub / наш исходящий след / сторонние соцсети-медиа / каталоги / проверено-пусто.

## A. Наши официальные площадки

| Что | URL | Статус на 25.10 |
|---|---|---|
| Repo | https://github.com/Paraphern/rugsnare | жив, v1.5.0, активные пуши |
| npm | https://www.npmjs.com/package/rugsnare | v1.5.0 (19.10), **2,107 загрузок/мес**, 13+ версий |
| Сайт | https://rugsnare.com | HTTP 200 |
| Сателлиты | github.com/Paraphern/rugsnare-pr-diff, rugsnare-canary-action, rugsnare-pr-diff-action, rugsnare-internal | |
| Telegram | https://t.me/rugsnare | юзернейм зарезервирован, канала нет |
| HN (наш) | https://news.ycombinator.com/item?id=49945978 | 03.10, 7 points, 0 комм |
| HN (наш) | https://news.ycombinator.com/item?id=50127659 | 17.10, 1 point, 0 комм |

## B. Сторонние упоминания на GitHub

### Curated-списки (нас приняли)
- **punkpeye/awesome-mcp-servers** - PR #15692 «Add rugsnare» СМЕРЖЕН 2026-10-18 (API-подтверждение), Security-секция. Ссылка: https://github.com/punkpeye/awesome-mcp-servers/pull/15692
- **raphabot/awesome-cybersecurity-agentic-ai** - сторонняя запись в README (pin/diff по canonicalized sha-256, corpus 24 серверов): https://github.com/raphabot/awesome-cybersecurity-agentic-ai
- **Arnon-hs/open-source** - карточка mcp/paraphern-rugsnare.md (score 48/100): https://github.com/Arnon-hs/open-source/blob/main/mcp/paraphern-rugsnare.md

### Аналитические разборы (сторонние)
- **IRsoctierDT/IANUA** research/2026-10-09-security-scanner-landscape.md - сравнительная таблица сканеров, rugsnare score 1 «3 stars, no independent validation», конкуренция mcpseal/Trail of Bits: https://github.com/IRsoctierDT/IANUA
- **MatsOSta/stangyode** (JP tech-radar) - RugSnare tracked, стадия PILOT 56/100, frontier 86/fit 88: https://github.com/MatsOSta/stangyode
- **groupthinking/EventRelay** artifacts/security/local-mcp-catalog-approval.md - техразбор нашего коммита 1551e5b (хвалят structural/prose hash split): https://github.com/groupthinking/EventRelay
- **Derekwang2002/ai-intelligence** logs/research-2026-10-04.md - «relevant, but filtered out (3 stars)»: https://github.com/Derekwang2002/ai-intelligence
- **govindarajanv/AgentWire** archive-1.md, archive-3.md - новостные карточки «140 silent changes»: https://github.com/govindarajanv/AgentWire
- **tomzx/blog** agents/logs/2026-10-20.md - отметил панк-мерж: https://github.com/tomzx/blog.tomrochette.com-content

### Авто-агрегаторы/трекеры
- JMartynov/mcp-fingerprints - data/fingerprints/Paraphern_rugsnare.json
- rogerchappel/mcpchangefeed - site/tools/ и site/servers/…paraphern-rugsnare/
- linny006/mcp-servers-live - r/Paraphern/rugsnare/index.html
- crazy54/awesome-agentic-atlas - docs/repo/paraphern/rugsnare/
- прочие хвосты: subev/awesome-stars, Keremozdemirra/agent-vitals, Turi-Labs (HN-crawl), PenguinAlleyApps (competitor-watch), actions-marketplace-validations

### Issues сторонних авторов, где упоминается rugsnare (найдены issues-поиском)
- microsoft/mcp#3674 (conniey) «[CI] Add CI Gate for validating documentation matches MCP tool changes»: https://github.com/microsoft/mcp/issues/3674
- frumu-ai/tandem#1980 (robertoyanguas-ops) «Assay MCP Security Audit: Grade A (90/100)»: https://github.com/frumu-ai/tandem/issues/1980
- netdata/netdata#24296 (sc-si) «Mark function output as untrusted in MCP results»: https://github.com/netdata/netdata/issues/24296
- PrefectHQ/fastmcp#5864 (BlueX888) «Proxy components lose version metadata»: https://github.com/PrefectHQ/fastmcp/issues/5864
- SecretiveShell/MCP-Bridge#126 (anythingoah): https://github.com/SecretiveShell/MCP-Bridge/issues/126
- ComposioHQ/awesome-claude-skills#1981 (chenhz01) «Is a skill safety scanner in scope?»: https://github.com/ComposioHQ/awesome-claude-skills/issues/1981
- maximhq/bifrost#8639 (sofianbll): https://github.com/maximhq/bifrost/issues/8639
- yetone/magpie#3109 (comicchang): https://github.com/yetone/magpie/issues/3109
- zeronsh/zeron#961 (JulioDevEnviagora): https://github.com/zeronsh/zeron/issues/961
- cathrynlavery/diagram-design#189 (mvanhorn): https://github.com/cathrynlavery/diagram-design/issues/189
- Netw0rkNoob/VulnClaw#295 (takeakiyamasaki): https://github.com/Netw0rkNoob/VulnClaw/issues/295
- prest/prest#1064 (arxdsilva): https://github.com/prest/prest/issues/1064
- anthropics/skills#492 - мейнтейнеры/участники цитируют rugsnare (наш трек присутствия): https://github.com/anthropics/skills/issues/492

## C. Наш исходящий GitHub-след (issues от Paraphern, для полноты)
bh-rat/awesome-mcp-enterprise#159, cline/mcp-marketplace#2729, notion#367 (verified: zero drift), phuryn#74, netlify#75, cc-switch#8673, CherryHQ#22381, hesreallyhim#3211, modelcontextprotocol/servers#5218, mintlify/docs#7566, Agent-Threat-Rule#653/654, mukul975#162, 1mcp-app#694, kky42#12, petekp#2, disler#13, orcasecurity#24 + более ранние (azure-devops#1448, chrome#2917, claude-mem#4788, janhq#8777, codex#19155, zed#59354).

## D. Сторонние соцсети/медиа

| Что | URL | Дата |
|---|---|---|
| X-твит @so_sthbryan (репо-цитата) | https://x.com/so_sthbryan/status/2112959348511228273 | 21.10 |
| LinkedIn ZAYSA (autopilot, rugsnare в стеке) | linkedin.com/posts/zaysahq_ai-proposes-zaysa-decides-zaysa-autopilot-activity-7510224379029393409 | ~окт |
| LinkedIn Julian Peña Reyes (ES) ×3 | es.linkedin.com/posts/julian-peña-reyes…activity-7517434322883231744; …7517071941267013632; …7518159110618513408 | ~окт |
| Moltbook - пересказ аудита 218 (проверить авторство) | https://www.moltbook.com/post/dc18d939-4226-476a-b6d2-40f74be2c5ec | ~окт |
| vibecoding.app - статья разбирает lockfile/hash-diff подход | https://vibecoding.app/blog/mcp-servers-change-under-you | ~окт |
| islandirie/my-rss-feed + CN-дайджест Show HN | github.com/islandirie/my-rss-feed и др. | 17.10 |

## E. Каталоги/реестры

| Площадка | URL | Статус |
|---|---|---|
| Glama | https://glama.ai/mcp/servers/Paraphern/rugsnare | есть, TDQS 3.4/5, drift_feed_status (B), pins_report (A) |
| libraries.io | https://libraries.io/npm/rugsnare | есть (auto), SourceRank 9 |
| Snyk Advisor | https://security.snyk.io/package/npm/rugsnare | есть (auto), 0 уязвимостей |
| Smithery | https://smithery.ai/server/paraphernal/rugsnare | ЕСТЬ, НО под опечаткой owner «paraphernal», 0 deployments, пустые метаданные - ИСПРАВИТЬ |
| mcpnav.dev | mcpnav.dev/server/rugsnare | 404, не подтверждено |

## F. Проверено - пусто (отрицательное пространство)
Reddit (все сабы), HN-комментарии третьих лиц, Product Hunt, Lobsters, Bluesky, Mastodon, YouTube, dev.to, Medium, Substack, Hashnode, Indie Hackers, Habr/Qiita/Zenn/juejin/v2ex/oschina (нулевое неангл. присутствие), daily.dev, AlternativeTo, mcp.so, MCPMarket, PulseMCP (карточки нет; 403 бот-щиту), cursor.directory, socket.dev (403, вероятно есть auto-карточка).
**Отраслевые подборки MCP-security 2026 без rugsnare** (главное белое пятно): Aembit Top-9, TrueFoundry, Akto, Integrate.io, MCP Manager, Tech Insider, CSA research note, Microsoft State of MCP Security 2026, SecureW2.

## Выводы (3 строки)
1. Стороннее признание «холодное, но реальное»: 2 curated-списка (96.7k★ punkpeye + raphabot), 5 аналитических разборов (включая критические - IANUA/ai-intelligence фильтруют за «3 stars»), ~13 чужих issues, 1 твит + 4-5 LinkedIn, 4 каталога (все auto, кроме Glama).
2. Нулевое: соцсети-дискуссии, неанглоязычное пространство, все отраслевые подборки-2026 - туда не попали ни разу.
3. Действия: (а) чинить Smithery-опечатку; (б) подборки MCP-security - главные цели аутрича (у нас 1.5k+ звёзд - порог прохождения достигнут); (в) звёздный фильтр «3 stars» в чужих разборах устарел - возможно, напомнить авторам актуализировать (аккуратно, вклад-first).
