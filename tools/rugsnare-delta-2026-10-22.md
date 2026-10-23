# Дельта-прогон: свежие боли 500+★ (открыты 20–23 октября, после наших волн)

**ОТРАБОТКА 23.10 (верификация по API):** звёзды все подтверждены (openclaw 392,864★, rea 371,957★ — реальные). НО номера issue в дельте были наполовину неверны, выверены: Observal **#1950** (не 195), lunar **#87+#88**, mcpm.sh **#475**, openclaw **#178368** (не 178), addyosmani **#717** (не 602; фикс-PR #718 уже открыт), hermes «Always allow» = **#142803**, kaifcodec = **#727 CLOSED** (фикс #735), rea **#6571 CLOSED** (в тот же день). **Атрибуция исправлена: carpet-bomber — НЕ Akto** (akto#1531 не существует, в репо akto MCP-кампании нет) — это **rezearcher = Matthew, Grey Ridge Signals Group LLC**, x402-монетизация ($0.05 USDC), 5 тредов 20.10, все OPEN/0 комментов: zilla#2751, Observal#1950, mcpm.sh#475, lunar#87+#88. Автор сам называет свой предел: «Static analysis only: it won't catch a server that changes behavior after admission» — это дословно наша дифференциация. **Ironheights = clawhub#4018** (Frank-Masciopinto) — отдельный, вежливый self-promo Apache-2.0 локального сканера скиллов, просит featured-бейдж; clawhub уже интегрировал SkillSpector (#4035) — НЕ КОНТР-ТАРГЕТ.
**Вердикты:** ЗАХОДИМ (драфты готовы): zilla#2751 (пилот контр-позиционирования), Observal#1950 (пилот, registry-фрейминг), hermes#142803 (consent-persistence — чистейшая наша боль). Очередь после пилотов: lunar#87/#88, mcpm.sh#475. НЕ ВХОДИМ: openclaw#178368 (живой security-bug — правило), addyosmani#717 (живой security-bug + фикс#718 в полёте), nextdns#1500 (живой C2-threat-report, чужой домен), kaifcodec#727 (закрыт фиксом #735), rea#6571 (закрыт), android/skills#250 (markdown-забор, не наша боль), agentic-qe (anti-slop-класс), clawhub#4018 (чужой OSS self-promo — не бьём соседа), pollinations (дизайн-дискуссия — резерв).

**Дата:** 2026-10-23 · Метод: 16 болевых архетипов («mcp broke», «tool poisoning», «skill security», «exfiltrates»…), issue созданные ≥2026-10-20 → 180 уников → фильтр репо ≥500★ → **20 болей**. Из них 11 в наших списках (откликнулись сразу — хорошо), **9 репо НОВЫЕ** (не в 1182).

## 🔴 Главная находка: конкурент вышел на охоту ВЧЕРА (атрибуция выверена 23.10)

Один и тот же вендор разослал офферы по ≥5 репо 20 октября — **Grey Ridge Signals Group LLC (rezearcher/Matthew)**, static MCP tool-poisoning сканер с x402-монетизацией:
- [aklivity/zilla #2751](https://github.com/aklivity/zilla/issues/2751), [Observal/Observal #1950](https://github.com/Observal/Observal/issues/1950), [pathintegral-institute/mcpm.sh #475](https://github.com/pathintegral-institute/mcpm.sh/issues/475), [TheLunarCompany/lunar #87](https://github.com/TheLunarCompany/lunar/issues/87) + [#88](https://github.com/TheLunarCompany/lunar/issues/88)
> **«Optional: free pre-admission scan for third-party MCP servers (tool-poisoning check)»** и **«Free MCP tool-poisoning scan (CLI + Action) for server admission checks»** — endpoint `x402-data-api.sigrunner.workers.dev`, CLI `npx github:rezearcher/greyridge-x402-tools mcpscan` (exit 2 = block), платный слой $0.05 USDC via x402. Автор сам формулирует предел: **«Static analysis only: it won't catch a server that changes behavior after admission»**. Плюс [openclaw/clawhub #4018](https://github.com/openclaw/clawhub/issues/4018) — «Featured request: Ironheights – Skill Security Scanner» (Frank-Masciopinto, Apache-2.0 local-first) — второй сканер, но отдельный и вежливый OSS self-promo, НЕ carpet-bomb.

**Что это значит:** ниша admission-сканирования официально конкурентна. Наше отличие пишет само себя — их же текст называет предел (scan-once), мы — вторая половина (pin-forever, вечный diff после одобрения). Реакция: контр-комментарий в пилотных тредах (zilla + Observal — драфты готовы), остальные после реакции; Ironheights не трогаем (сосед-OSS).

## Свежие security-боли (день-в-день)

| Репо | ★ | Дата | Боль |
|---|---|---|---|
| [openclaw/openclaw](https://github.com/openclaw/openclaw/issues/178) | 392.9k | 10-20 | **«Host exec children inherit provider credentials (OPENAI_API_KEY, ANTHROPIC_API_…)»** — дети host-exec наследуют креды провайдеров. NEW-репо (сам openclaw не был в списках!) |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/issues/602) | 109.9k | 10-22 | **«staged-secret checks print credential values into agent tool logs»** — проверки секретов ПЕЧАТАЮТ значения кредов в логи тулов |
| [pollinations/pollinations](https://github.com/pollinations/pollinations) | 5.2k | 10-22 | «Agent-run tokens authenticate to media with type: secret — delegation credential» — дизайн делегирования кредов. NEW |
| [nextdns/metadata](https://github.com/nextdns/metadata/issues/1500) | 674★ | 10-21 | Threat-feed: Magecart C2 / payment skimmer. NEW |

## Свежие контрактные/approval-боли

| Репо | ★ | Дата | Боль |
|---|---|---|---|
| [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | 256.5k | 10-20…22 | Сразу три: «Godmode dry run даёт opaque API-key errors»; **«"Always allow" отправляется как one-time accept и НЕ ЗАПОМИНАЕТСЯ»**; per-session stdio MCP для gateway-чатов |
| [kaifcodec/user-scanner](https://github.com/kaifcodec/user-scanner) | 5.5k | 10-21 | **«[Audit] Medium — MCP молча трактует неизвестные модули/категории как успешные»** — silent-success класс |
| [morluto/rea](https://github.com/morluto/rea/issues/6571) | 371.9k | 10-23 | Browser agent hints misidentify mixed-case resource paths |
| [android/skills](https://github.com/android/skills/issues/250) | 9.4k | 10-21 | android-intent-security: отчёт выламывается из code block |
| [proffesor-for-testing/agentic-qe](https://github.com/proffesor-for-testing/agentic-qe) | 514★ | 10-23 | Вслед за #1145: выдуманные contrast-значения, silent-something. NEW |

## Новые репо для списков (9, все ≥500★, не в 1182)
openclaw/openclaw (392.9k!!), openclaw/clawhub (9.5k), pollinations (5.2k), aklivity/zilla (1.7k), akto-api-security/akto (1.5k), pathintegral-institute/mcpm.sh (1k), Observal (4.5k), duanyytop/agents-radar (1.1k — дайджест AI CLI, полезный канал), nextdns/metadata (674★), deepcoldy/botmux (1.7k), proffesor-for-testing/agentic-qe (514★).

## Выводы
1. **Скорость важна:** вчерашний день показал, что admission-сканирование начали продавать — заходить в каждое «free scan»-обсуждение с scan-once/pin-forever-аргументом нужно сейчас, пока треды живые.
2. **Наши списки откликаются:** 11 из 20 болей — в репо из наших 1182 (hermes, addyosmani, rea, android/skills, kaifcodec…) — приоритизация волн была верной.
3. **Самый большой пропуск — openclaw/openclaw (392.9k★):** не был в списках, потому что экосистему мы брали по скиллс-спискам. Добавлен в дельте.

Сырые данные: `/tmp/mcp-hunt/delta-final.tsv` (20 строк), запросы — `d1..d16.tsv`.
