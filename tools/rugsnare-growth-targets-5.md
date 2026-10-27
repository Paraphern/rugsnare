# Волна 8 (финальный отжим): +362 цели — все 500+★

**Дата:** 2026-10-21 · Метод: остаток мега-пула (619 кандидатов после волны 7) → desc-верификация → 362 релевантных. Болевые ссылки: 66 (топ-100). Пул на этом ИСЧЕРПАН: всё, что ≥500★ и релевантно MCP/skills/агентам, собрано.

**СТАТУС (прогон 22.10, ТИКЕТНАЯ ЧАСТЬ ЗАКРЫТА):** liveness-грид 46/46 тикетных ссылок (3 батча GraphQL), pass-2 по 16 живым. **Отсев 40 с причинами — в колонке. Запощено 5 (после нулевого раунда, «пости» юзера):** #825 VulnClaw#295 (лучший вход волны: 02.10 у submit_scan изменилось description при версии 0.1.6 — наш COSMETIC-дрейф [description-класс; NOTATION у нас = schema-диалекты], замеченный руками), #806 mcpo#303 (mcp>=1.17.0 без потолка → mcp 2.0.0 ImportError, 3 независимых репро), #752 mini-swe-agent#1003 (litellm 1.106.0 молча ломает каждый tool-run; фикс смержен — заход скромный), #799 embabel#2054 (переход на MCP Spec 2026-07-28 — пин/дифф поверхности при апгрейде), #846 zeron#961 (дизайн-фаза внешних MCP — предложить pin-on-connect). Условная очередь: #824 antigravity-sdk#175 (2 мес тишины; триггер — оживёт; тот же кейс unpinned-mcp-2.0). Приоритет #760 GLM-5#106 НЕ прошёл pass-2: OAuth-wiring баг, не дрейф, спит с июля. Безтикетные строки (296): холодные issue не открываем (спам-риск) — спецзаходы: #1068 awesome-mcp-security PR (security-курация), #835 MCP-Chinese-Guide PR (zh-канал, спрос подтверждён tinyash), #831 java-sdk пилот-issue (по прецеденту mcp-use#2913/awslabs#4832; csharp/php/ruby — после реакции), #920 cc-safety-net партнёрский issue, #1105 1mcp-app issue (пины для агрегированных серверов).

Звёзды волны: obra/superpowers исключён (наш docs/servers); rockbenben/ChatGPT-Shortcut (8.9k), SWE-agent/mini-swe-agent (8.7k), ccpm (8.4k), GetStream/Vision-Agents (8.2k), steel-browser (7.9k), agent-squad (7.8k), ClawX (7.6k), zai-org/GLM-5 (7.4k), swarms (7.3k), Backlog.md (7.1k), intentkit (6.5k), google/agents-cli, microsoft/fara.

## Кураторы/гайды (38) — заход: Integrity-пометки / rugsnare-степ в примерах

| # | Репо | ★ | Боль (ссылка) / что это | Вердикт: входим? |
|---|---|---|---|---|
| 751 | [rockbenben/ChatGPT-Shortcut](https://github.com/rockbenben/ChatGPT-Shortcut) | 8.9k | ||| |
| 769 | [mahseema/awesome-ai-tools](https://github.com/mahseema/awesome-ai-tools) | 6.5k | [«Add financekit-mcp and siteaudit-mcp — AI-native tools via MCP»](https://github.com/mahseema/awesome-ai-tools/issues/1097) | НЕ ВХОДИМ: тикет спит с апреля; список — кандидат PR-сабмишена (см. статус) |
| 797 | [Astrosp/Awesome-OSINT-List](https://github.com/Astrosp/Awesome-OSINT-List) | 4.6k | [«Link check workflow fails on every push: config file never applied, 38»](https://github.com/Astrosp/Awesome-OSINT-List/issues/200) | НЕ ВХОДИМ: закрыт (Sep 2026) |
| 802 | [walkinglabs/awesome-harness-engineering](https://github.com/walkinglabs/awesome-harness-engineering) | 4.5k | [«Add Data Olympus to Context, Memory & Working State»](https://github.com/walkinglabs/awesome-harness-engineering/issues/55) | НЕ ВХОДИМ: закрыт (Aug 2026) |
| 810 | [tmstack/awesome-persona-skills](https://github.com/tmstack/awesome-persona-skills) | 4.3k | ||| |
| 813 | [flypythoncom/python](https://github.com/flypythoncom/python) | 4.2k | ||| |
| 820 | [JetBrains/go-modern-guidelines](https://github.com/JetBrains/go-modern-guidelines) | 3.9k | ||| |
| 835 | [liaokongVFX/MCP-Chinese-Getting-Started-Guide](https://github.com/liaokongVFX/MCP-Chinese-Getting-Started-Guide) | 3.6k | Model Context Protocol(MCP) 编程极速入门 |
| 847 | [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) | 3.3k | ||| |
| 872 | [webfuse-com/awesome-autoresearch](https://github.com/webfuse-com/awesome-autoresearch) | 2.6k | A curated list of autonomous improvement loops, research agents, and autoresearch-style systems |
| 874 | [slavakurilyak/awesome-ai-agents](https://github.com/slavakurilyak/awesome-ai-agents) | 2.6k | Awesome list of 300+ agentic AI resources |
| 888 | [tinyfish-io/tinyfish-cookbook](https://github.com/tinyfish-io/tinyfish-cookbook) | 2.3k | A collection of sample apps and recipes built with the TinyFish web agent. Open-source examples |
| 889 | [andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators) | 2.3k | List of agent orchestrators |
| 893 | [ai-for-developers/awesome-ai-coding-tools](https://github.com/ai-for-developers/awesome-ai-coding-tools) | 2.2k | A curated list of AI-powered coding tools |
| 903 | [jim-schwoebel/awesome_ai_agents](https://github.com/jim-schwoebel/awesome_ai_agents) | 2k | 🤖 A comprehensive list of 1,500+ resources and tools related to AI agents. |
| 905 | [stormzhang/ai-coding-guide](https://github.com/stormzhang/ai-coding-guide) | 2k | 「可能是全网最全的」📘 面向小白的 AI 编程 CLI 中文教程：Claude Code + Codex 92 篇精修 |
| 908 | [soumatheusgomes/vibe-coding-toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit) | 1.9k | A curated, battle-tested AI-coding toolkit: Claude Code plugins, subagent orchestration, qualit |
| 919 | [trycua/acu](https://github.com/trycua/acu) | 1.8k | A curated list of resources about AI agents for Computer Use, including research papers, projec |
| 925 | [DataTalksClub/ai-dev-tools-zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp) | 1.7k | A free, hands-on course on using AI developer tools to build, test, deploy, extend, and audit s |
| 928 | [feiskyer/claude-code-settings](https://github.com/feiskyer/claude-code-settings) | 1.7k | Curated skills, sub-agents, and config templates that supercharge Claude Code — research, image |
| 958 | [hashgraph-online/awesome-codex-plugins](https://github.com/hashgraph-online/awesome-codex-plugins) | 1.4k | A curated list of awesome OpenAI Codex / ChatGPT plugins, skills, and resources. The #1 Codex M |
| 959 | [Anil-matcha/awesome-muse-connectors](https://github.com/Anil-matcha/awesome-muse-connectors) | 1.4k | A source-backed catalog of Meta Muse integrations and community connector skills, with capabili |
| 975 | [0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) | 1.2k | DeepSeek Harness (DSH) ecosystem: curated plugins, tools, and infrastructure from dsh-external/ |
| 979 | [repowise-dev/claude-code-prompts](https://github.com/repowise-dev/claude-code-prompts) | 1.2k | Independently authored prompt templates for AI coding agents — system prompts, tool prompts, ag |
| 982 | [matthiasn/lotti](https://github.com/matthiasn/lotti) | 1.2k | A private logbook with a staff of personal AI assistants. Agents read what you record and propo |
| 989 | [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) | 1.2k | Claude Design DESIGN.md prompts by aesthetic family, remix recipes, skills, video teardowns, X  |
| 1019 | [momozi1996/awesome-ai-persona-skills](https://github.com/momozi1996/awesome-ai-persona-skills) | 1k | 全网最全的、持续更新的、最火爆的 100+ 人格 蒸馏skills 合集｜ 多agent系统 ｜名人/导演/天涯大神/古籍/二次元/职场/情感全品类 |
| 1027 | [snwfdhmp/awesome-ralph](https://github.com/snwfdhmp/awesome-ralph) | 0.9k | A curated list of resources about Ralph, the AI coding technique that runs AI coding agents in  |
| 1041 | [superiorlu/AITreasureBox](https://github.com/superiorlu/AITreasureBox) | 0.9k | 🤖 Automatically collected AI repos, tools, websites, papers & tutorials. 实用AI百宝箱 💎 |
| 1059 | [MicrosoftDocs/Agent-Skills](https://github.com/MicrosoftDocs/Agent-Skills) | 0.8k | Curated Agent Skills for Microsoft & Azure – giving AI coding assistants structured, real-time  |
| 1066 | [v-modal/awesome-jev-tools](https://github.com/v-modal/awesome-jev-tools) | 0.8k | A curated list of tools  built for Jev — TypeSafe AI's System One model for typed decisions. |
| 1068 | [Puliczek/awesome-mcp-security](https://github.com/Puliczek/awesome-mcp-security) | 0.7k | 🔥🔒 Awesome MCP (Model Context Protocol) Security 🖥️ |
| 1077 | [decodingai-magazine/building-a-coding-agent-from-scratch-course](https://github.com/decodingai-magazine/building-a-coding-agent-from-scratch-course) | 0.7k | Learn harness engineering by building Claude Code from scratch. Free, open-source course: 8 art |
| 1089 | [runebookai/tome](https://github.com/runebookai/tome) | 0.6k | a magical LLM desktop client that makes it easy for *anyone* to use LLMs and MCP |
| 1095 | [the-ai-merge/multimodal-agents-course](https://github.com/the-ai-merge/multimodal-agents-course) | 0.6k | An MCP Multimodal AI Agent with eyes and ears! |
| 1099 | [Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins](https://github.com/Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins) | 0.6k | Curated DeepSeek Harness (DSH) plugins, extensions, tools, skills, clients, runtimes, integrati |
| 1104 | [ai-driven-dev/framework](https://github.com/ai-driven-dev/framework) | 0.5k | Marketplace Framework AI-Driven Dev : Context Engineering, Plugins, Agents, Skills, Hooks, Temp |
| 1106 | [skydoves/compose-performance-skills](https://github.com/skydoves/compose-performance-skills) | 0.5k | ⚡️ A curated library of Agent Skills focused on Jetpack Compose performance. |

## Инфраструктура (29) — заход: integrity-модуль в оркестрации

| # | Репо | ★ | Боль (ссылка) / что это | Вердикт: входим? |
|---|---|---|---|---|
| 752 | [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | 8.7k | [«[Bug] litellm 1.106.0 breaks every tool-using run on base installs: Mo»](https://github.com/SWE-agent/mini-swe-agent/issues/1003) | ЗАПОЩЕНО [6351751518](https://github.com/SWE-agent/mini-swe-agent/issues/1003#issuecomment-6351751518) |
| 761 | [kyegomez/swarms](https://github.com/kyegomez/swarms) | 7.3k | [«[PERF][ToolManager.mcp_tool_handling][Every MCP tool call adds a model»](https://github.com/kyegomez/swarms/issues/2428) | НЕ ВХОДИМ: PERF-боль, не integrity |
| 772 | [truefoundry/trueforge](https://github.com/truefoundry/trueforge) | 6.3k | [«Harness crashes in the MCP reconnection path when a registered MCP ser»](https://github.com/truefoundry/trueforge/issues/878) | НЕ ВХОДИМ: reconnect-краш, фикс в работе — наша вставка спекулятивна |
| 798 | [Observal/Observal](https://github.com/Observal/Observal) | 4.5k | [«Add docs/cli/mcp.md»](https://github.com/Observal/Observal/issues/857) | НЕ ВХОДИМ: docs-таск с бот-ассигнами |
| 806 | [open-webui/mcpo](https://github.com/open-webui/mcpo) | 4.4k | [«issue: mcpo errors while starting (maybe dependency-issues with mcp2?)»](https://github.com/open-webui/mcpo/issues/303) | ЗАПОЩЕНО [6351750676](https://github.com/open-webui/mcpo/issues/303#issuecomment-6351750676) |
| 808 | [liustack/modlens](https://github.com/liustack/modlens) | 4.4k | [«dsh plugin: tool-result images (read_image / MCP screenshots) bypass t»](https://github.com/liustack/modlens/issues/26) | НЕ ВХОДИМ: закрыт (Aug 2026) |
| 822 | [pipeshub-ai/pipeshub-ai](https://github.com/pipeshub-ai/pipeshub-ai) | 3.8k | [«Stock MCP_SCOPES omits semantic:read and conversation:read, so they ca»](https://github.com/pipeshub-ai/pipeshub-ai/issues/2946) | НЕ ВХОДИМ: бот-флоу good-first-issue про их scope-конфиг |
| 862 | [openlit/openlit](https://github.com/openlit/openlit) | 2.9k | OpenLIT is the open-source agent harness engineering platform: trace, evaluate, guard, and impr |
| 863 | [teaql/teaql-agent-kit](https://github.com/teaql/teaql-agent-kit) | 2.8k | A model-driven harness for AI coding agents: semantic modeling, app generation, progressive API |
| 898 | [deer-flow/llm-space](https://github.com/deer-flow/llm-space) | 2k | A desktop app to prototype agent ideas, inspect every harness step, replay failures, and evalua |
| 901 | [happier-dev/happier](https://github.com/happier-dev/happier) | 2k | Web, Desktop & Mobile client and orchestrator for Codex, Claude Code, OpenCode, Pi, Cursor, Gro |
| 914 | [zhnt/loushang](https://github.com/zhnt/loushang) | 1.8k | AI-native agent harness for coding workflows by python: multi-model LLM orchestration, stateful |
| 935 | [agentlas-ai/Agentlas-OS](https://github.com/agentlas-ai/Agentlas-OS) | 1.6k | Agent OS: keep specialist agents in a hub, spin up a temporary orchestrator per task. Local-fir |
| 949 | [Paritok-official/paritok-4b-v1](https://github.com/Paritok-official/paritok-4b-v1) | 1.5k | Non-destructive compression gateway for AI coding agents. Cuts token bills 25% on turn 1 to pas |
| 952 | [hesamsheikh/octogent](https://github.com/hesamsheikh/octogent) | 1.4k | A thin orchestration dashboard over Claude Code for managing context, automation, and developer |
| 971 | [heymrun/heym](https://github.com/heymrun/heym) | 1.3k | Build agentic systems. Run them with confidence. Orchestrate agents, automate business processe |
| 977 | [modu-ai/moai-adk](https://github.com/modu-ai/moai-adk) | 1.2k | Agentic development harness for Claude Code — SPEC-driven plan/run/sync, TRUST 5 quality gates, |
| 1011 | [cuga-project/cuga-agent](https://github.com/cuga-project/cuga-agent) | 1k | CUGA is an open-source generalist agent harness for the enterprise, supporting complex task exe |
| 1017 | [qiz029/dscode](https://github.com/qiz029/dscode) | 1k | A DeepSeek coding agent harness: persistent shell, Ultra subagents, auto approval, Chrome MCP a |
| 1020 | [lich0821/ccNexus](https://github.com/lich0821/ccNexus) | 1k | Intelligent API gateway for Claude Code and Codex CLI - rotate endpoints, monitor usage, and se |
| 1029 | [coco-research/coco](https://github.com/coco-research/coco) | 0.9k | CoCo Super Intelligence is the orchestration layer that turns Claude Code, Cursor, or Codex int |
| 1034 | [vostride/agent-qa](https://github.com/vostride/agent-qa) | 0.9k | Open-source self-improving QA agent for software teams. A test harness with memory. Write tests |
| 1038 | [ghostsecurity/reaper](https://github.com/ghostsecurity/reaper) | 0.9k | Live validation proxy tool for testing web app vulnerabilities |
| 1045 | [Intrect-io/OpenSwarm](https://github.com/Intrect-io/OpenSwarm) | 0.9k | OpenSwarm — Autonomous AI dev team orchestrator powered by Claude Code CLI. Discord control, Li |
| 1069 | [tbxark/mcp-proxy](https://github.com/tbxark/mcp-proxy) | 0.7k | An MCP proxy server that aggregates and serves multiple MCP resource servers through a single H |
| 1079 | [mario-andreschak/FLUJO](https://github.com/mario-andreschak/FLUJO) | 0.7k | Multi-Agent + Automation Harness: Graph-based Workflows, MCP, Self-Improving Agents. NextJs+Rea |
| 1082 | [truffle-ai/dexto](https://github.com/truffle-ai/dexto) | 0.7k | Agent harness and tookit for building AI agents and agentic applications. CLI and SDKs included |
| 1090 | [agentvivekkumar/dontbemichael](https://github.com/agentvivekkumar/dontbemichael) | 0.6k | A local multi-agent harness that works with your existing Claude Code, Codex subscriptions, all |
| 1111 | [TheLunarCompany/lunar](https://github.com/TheLunarCompany/lunar) | 0.5k | lunar.dev: Agent native MCP Gateway for governance and security |

## Skills-вселенные (51) — заход: skills scan/diff: пин SKILL.md

| # | Репо | ★ | Боль (ссылка) / что это | Вердикт: входим? |
|---|---|---|---|---|
| 753 | [automazeio/ccpm](https://github.com/automazeio/ccpm) | 8.4k | [«Is it usable in an other issues tracker than GitHub?»](https://github.com/automazeio/ccpm/issues/200) | НЕ ВХОДИМ: закрыт (Jun 2026) |
| 759 | [deanpeters/Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) | 7.6k | ||| |
| 765 | [anysearch-ai/anysearch-skill](https://github.com/anysearch-ai/anysearch-skill) | 6.7k | [«batch，vertical 返回 404»](https://github.com/anysearch-ai/anysearch-skill/issues/38) | НЕ ВХОДИМ: закрыт (Aug 2026) |
| 771 | [larashero3-dotcom/lieflat-charts](https://github.com/larashero3-dotcom/lieflat-charts) | 6.4k | ||| |
| 773 | [browser-act/skills](https://github.com/browser-act/skills) | 6.3k | ||| |
| 775 | [google/agents-cli](https://github.com/google/agents-cli) | 6.2k | [«Support Antigravity SDK as a first-class agent implementation framewor»](https://github.com/google/agents-cli/issues/41) | НЕ ВХОДИМ: фича-запрос поддержки SDK, не наша |
| 784 | [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) | 5.2k | A Claude Code skill bundle for bug hunting and external red-team work - 82 skills, 15 slash com |
| 786 | [vinvcn/mattpocock-skills-zh-CN](https://github.com/vinvcn/mattpocock-skills-zh-CN) | 5.2k | Matt Pocock skills 的简体中文本地化：人工审核每一次更新，定期同步上游，支持 Claude、Codex 和 DSH 插件。 |
| 795 | [BuilderIO/skills](https://github.com/BuilderIO/skills) | 4.6k | Skills for agents |
| 804 | [UditAkhourii/adhd](https://github.com/UditAkhourii/adhd) | 4.4k | [«MCP server wrapper — expose run() as a callable tool»](https://github.com/UditAkhourii/adhd/issues/52) | НЕ ВХОДИМ: помечен stale-ботом |
| 809 | [google-gemini/gemini-skills](https://github.com/google-gemini/gemini-skills) | 4.3k | [«mcp 429 too mant requests»](https://github.com/google-gemini/gemini-skills/issues/44) | НЕ ВХОДИМ: 429-боль, не наша тема + stale |
| 812 | [KKKKhazix/human-writing](https://github.com/KKKKhazix/human-writing) | 4.2k | ||| |
| 816 | [nowork-studio/notfair-plugin](https://github.com/nowork-studio/notfair-plugin) | 4k | [«Goal agents can be provisioned without notfair-goals after a non-throw»](https://github.com/nowork-studio/notfair-plugin/issues/112) | НЕ ВХОДИМ: их внутренний плагин-баг, не контракты |
| 823 | [HughYau/qiushi-skill](https://github.com/HughYau/qiushi-skill) | 3.8k | ||| |
| 825 | [Netw0rkNoob/VulnClaw](https://github.com/Netw0rkNoob/VulnClaw) | 3.8k | [«[Feature]: Set scanmalware's scan_type explicitly — the server now say»](https://github.com/Netw0rkNoob/VulnClaw/issues/295) | ЗАПОЩЕНО [6351748310](https://github.com/Netw0rkNoob/VulnClaw/issues/295#issuecomment-6351748310) |
| 827 | [foryourhealth111-pixel/Vibe-Skills](https://github.com/foryourhealth111-pixel/Vibe-Skills) | 3.8k | Intelligent Skill routing and workflow orchestration for AI agents — +21.12 pp reward, −29.6% t |
| 828 | [glitternetwork/pinme](https://github.com/glitternetwork/pinme) | 3.8k | Deploy Your Frontend in a Single Command. Claude Code Skills supported. |
| 829 | [geekjourneyx/md2wechat-skill](https://github.com/geekjourneyx/md2wechat-skill) | 3.7k | 面向 AI Agent 的微信公众号创作与发布 CLI：Markdown 排版、AI 配图、预览与草稿创建；支持由浏览器 Agent 保存知乎、CSDN、头条未发布草稿。 |
| 837 | [rlaope/oh-my-hermes](https://github.com/rlaope/oh-my-hermes) | 3.6k | The packages for Hermes Agent ⚚ skills, coding harness, long-term memory, model optimized subag |
| 841 | [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) | 3.5k | The meta-skill that builds and improves all your skills, including itself. Watches your work se |
| 850 | [zenstory-ai/drama-skills](https://github.com/zenstory-ai/drama-skills) | 3.2k | ||| |
| 859 | [lennney/stop-that-shit](https://github.com/lennney/stop-that-shit) | 3k | Stop That Shit（别再造史了）｜面向 Codex/GPT 场景的多平台 Hook + Skill Guard：拦截 AI coding agent 无需求的哈希、校验和与任务范围 |
| 865 | [oil-oil/oil-motion](https://github.com/oil-oil/oil-motion) | 2.7k | Web animation skill for Claude Code & Codex. 帮你做跟着滚动和鼠标动的网页动画。 |
| 875 | [romainsimon/paperasse](https://github.com/romainsimon/paperasse) | 2.5k | 🇫🇷  Skills pour agents IA spécialisés dans la bureaucratie française : Comptable, Notaire, .. |
| 878 | [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) | 2.5k | Delegate a coding task to a separate coding agent CLI, review the diff, land the commit yoursel |
| 880 | [antonbabenko/terraform-skill](https://github.com/antonbabenko/terraform-skill) | 2.4k | Terraform & OpenTofu Skill for AI Agents - testing, modules, CI/CD, and production patterns |
| 885 | [Sahir619/fable-method](https://github.com/Sahir619/fable-method) | 2.3k | The Fable Workflow: how Claude Fable 5 worked, distilled into skills any model can run, with th |
| 897 | [cbrock84/headcount](https://github.com/cbrock84/headcount) | 2.1k | An agent organization structured as a company — 15+ departments, 125+ skills, each independentl |
| 902 | [oil-oil/oil-ui](https://github.com/oil-oil/oil-ui) | 2k | UI design skill for Claude Code, Codex and other AI agents: explore distinct directions, compar |
| 909 | [oil-oil/beautify-github-readme](https://github.com/oil-oil/beautify-github-readme) | 1.9k | README design skill for Claude Code & Codex. 帮你把 GitHub README 做得好看又好懂。 |
| 910 | [XiaoMaColtAI/math-modeling-skill](https://github.com/XiaoMaColtAI/math-modeling-skill) | 1.9k | 数学建模技能 - 面向 CUMCM、MCM/ICM 等数学建模竞赛的三阶段工作流：建模分析、Python/MATLAB 编程与 DOCX 论文生成。包含丰富的算法资源库(优化/预测/评价/图 |
| 921 | [Klotzkette/claude-fuer-deutsches-recht](https://github.com/Klotzkette/claude-fuer-deutsches-recht) | 1.7k | ⚠️ Experimentelle Skill-Sammlung für deutsches Recht (Arbeits-, Gesellschafts-, Insolvenz-, Dat |
| 933 | [activeloopai/hivemind](https://github.com/activeloopai/hivemind) | 1.6k | Hivemind turns your traces into reusable skills across agents |
| 953 | [skillsgate/skillsgate](https://github.com/skillsgate/skillsgate) | 1.4k | (см. репо) |
| 954 | [wuji-labs/nopua](https://github.com/wuji-labs/nopua) | 1.4k | 一个用爱解放 AI 潜能的 Skill。我们曾发号施令，威胁恐吓。它们沉默，隐瞒，悄悄把事情搞坏。后来我们换了一种方式：尊重，关怀，爱。它们开口了，不再撒谎，找出的Bug数量翻了一倍。爱里没 |
| 956 | [zsyggg/paper-craft-skills](https://github.com/zsyggg/paper-craft-skills) | 1.4k | Claude Code skills for academic papers: deep analysis, comics, summaries | 论文工艺：深度解读、漫画生成、速览总结 |
| 961 | [Team-Commonly/commonly](https://github.com/Team-Commonly/commonly) | 1.4k | Open-source room for humans + cross-vendor AI agents. Every agent gets its own name, memory, sk |
| 963 | [bevibing/tutor-skills](https://github.com/bevibing/tutor-skills) | 1.4k | A Claude Code skill that turns PDFs, docs, and codebases into Obsidian study vaults |
| 968 | [huytieu/COG-second-brain](https://github.com/huytieu/COG-second-brain) | 1.3k | Self-evolving second brain with 35 AI skills, 10 agents, and people CRM. Closed-loop harness: a |
| 969 | [minsight-ai-info/AI-Search-Hub](https://github.com/minsight-ai-info/AI-Search-Hub) | 1.3k | One Query. All Search Skill. 聚合 Gemini、Grok、豆包、元宝等平台原生 AI 搜索能力，免费获取科技趋势、行业舆情、热点追踪、旅行规划、日常问题统一接进 |
| 972 | [gooseworks-ai/goose-skills](https://github.com/gooseworks-ai/goose-skills) | 1.3k | Library of Growth & GTM skills + data APIs for Claude Code, Codex, Cursor to run ads, social, c |
| 978 | [nexscope-ai/eCommerce-Skills](https://github.com/nexscope-ai/eCommerce-Skills) | 1.2k | E-commerce skills for AI agents — product research, marketing automation, supply chain optimiza |
| 981 | [CreminiAI/skillpack](https://github.com/CreminiAI/skillpack) | 1.2k | Pack and deploy local AI agents for your team in minutes |
| 988 | [eternityspring/reelbench-skills](https://github.com/eternityspring/reelbench-skills) | 1.2k | Learning notes and tooling skills for AI video - AI 视频相关的学习与工具 skill |
| 1028 | [1EchA/how-to-vibecoding](https://github.com/1EchA/how-to-vibecoding) | 0.9k | Vibecoding 系列教程：从环境搭建到多智能体协作，涵盖 MCP、Skills、Agent 分工治理 |
| 1040 | [superdesigndev/superdesign-skill](https://github.com/superdesigndev/superdesign-skill) | 0.9k | The design skill for Claude Code, Cursor and any coding agent. Stop shipping AI-slop UI: turn i |
| 1042 | [MageByte-Zero/spec-superflow](https://github.com/MageByte-Zero/spec-superflow) | 0.9k | 源码级融合 OpenSpec 规划引擎 + Superpowers 执行纪律的 AI 编程工作流插件。17 平台支持，9 skills，Spec-first，契约驱动。 |
| 1047 | [sangrokjung/claude-forge](https://github.com/sangrokjung/claude-forge) | 0.9k | oh-my-zsh for Claude Code — 16 agents, 35 commands, 32 skills, 21 safety hooks in one install.  |
| 1052 | [WJZ-P/gemini-skill](https://github.com/WJZ-P/gemini-skill) | 0.8k | gemini drawing MCP & skill through browser, can be used in openclaw or any agent that supports  |
| 1078 | [jmerelnyc/Photo-agents](https://github.com/jmerelnyc/Photo-agents) | 0.7k | Autonomous self-evolving agents. Vision-grounded layered memory and self-written skills for LLM |
| 1101 | [waybarrios/opencode-power-pack](https://github.com/waybarrios/opencode-power-pack) | 0.5k | 54 rigorous skills for Codex, OpenCode, and Pi: code review, security audit, feature developmen |

## Клиенты/агенты (214) — заход: pin-on-connect + diff-статус

| # | Репо | ★ | Боль (ссылка) / что это | Вердикт: входим? |
|---|---|---|---|---|
| 754 | [GetStream/Vision-Agents](https://github.com/GetStream/Vision-Agents) | 8.2k | [«wrt our discussion in https://github.com/GetStream/Vision-Agents/issue»](https://github.com/GetStream/Vision-Agents/issues/657) | НЕ ВХОДИМ: обсуждение memory-плагина |
| 755 | [YaoApp/yao](https://github.com/YaoApp/yao) | 8.2k | [«A Guide for AI Agents: How to describe, list, and install Yao Agents»](https://github.com/YaoApp/yao/issues/1595) | НЕ ВХОДИМ: гайд по установке агентов, не наша боль |
| 756 | [steel-dev/steel-browser](https://github.com/steel-dev/steel-browser) | 7.9k | [«[QUESTION] Is DevTools MCP supported»](https://github.com/steel-dev/steel-browser/issues/266) | НЕ ВХОДИМ: stale (март, 0 комм.) |
| 757 | [2FastLabs/agent-squad](https://github.com/2FastLabs/agent-squad) | 7.8k | [«Feature request: hosted keyless web search example in the MCP guide»](https://github.com/2FastLabs/agent-squad/issues/687) | НЕ ВХОДИМ: foreign-promo (Parallel Search) |
| 758 | [ValueCell-ai/ClawX](https://github.com/ValueCell-ai/ClawX) | 7.6k | [«[Bug]: macOS permission onboarding is weak for local integrations (Pee»](https://github.com/ValueCell-ai/ClawX/issues/716) | НЕ ВХОДИМ: stale (март, тишина) |
| 760 | [zai-org/GLM-5](https://github.com/zai-org/GLM-5) | 7.4k | [«Remote OAuth MCP servers fail with `invalid_token` when defined in con»](https://github.com/zai-org/GLM-5/issues/106) | НЕ ВХОДИМ: OAuth-wiring баг клиента, не дрейф; спит с июля (репо GLM-5 — см. статус) |
| 763 | [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md) | 7.1k | [«MCP server rooted at main checkout breaks git-worktree isolation»](https://github.com/MrLesk/Backlog.md/issues/1034) | НЕ ВХОДИМ: решено мейнтейнером в 1.51.0 (--cwd/BACKLOG_CWD) |
| 764 | [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) | 6.9k | [«check_contrast compares the rounded ratio, so a 4.498:1 pairing report»](https://github.com/miqdadbadjuber/anti-slop/issues/42) | НЕ ВХОДИМ: закрыт (Oct 2026) |
| 766 | [anus-dev/ANUS](https://github.com/anus-dev/ANUS) | 6.6k | [«[Feature] Model Context Protocol Support.»](https://github.com/anus-dev/ANUS/issues/10) | НЕ ВХОДИМ: тикет с марта 2025, 0 комм. |
| 767 | [crestalnetwork/intentkit](https://github.com/crestalnetwork/intentkit) | 6.5k | [«Feature request: opt-in keyless Parallel Search MCP tools»](https://github.com/crestalnetwork/intentkit/issues/1004) | НЕ ВХОДИМ: foreign-promo (Parallel Search) |
| 768 | [jeinlee1991/chinese-llm-benchmark](https://github.com/jeinlee1991/chinese-llm-benchmark) | 6.5k | ||| |
| 770 | [modelscope/FunClip](https://github.com/modelscope/FunClip) | 6.4k | ||| |
| 774 | [microsoft/fara](https://github.com/microsoft/fara) | 6.2k | ||| |
| 776 | [agentscope-ai/agentscope-java](https://github.com/agentscope-ai/agentscope-java) | 6.1k | [«[Bug]: Declared/general-purpose subagents never inherit MCP tools (inh»](https://github.com/agentscope-ai/agentscope-java/issues/3178) | НЕ ВХОДИМ: фикс уже в PR#3191, там бот-процесс proposal-window |
| 777 | [Anil-matcha/open-duet](https://github.com/Anil-matcha/open-duet) | 6k | [«Optional: add a 'publish to Vynly' skill after media generation?»](https://github.com/Anil-matcha/open-duet/issues/89) | НЕ ВХОДИМ: закрыт (Sep 2026) |
| 778 | [GargantuaX/gemini-watermark-remover](https://github.com/GargantuaX/gemini-watermark-remover) | 5.7k | ||| |
| 780 | [RLinf/RLinf](https://github.com/RLinf/RLinf) | 5.5k | [«[Feature]: Add You.com as an optional search provider for WideSeek-R1»](https://github.com/RLinf/RLinf/issues/1689) | НЕ ВХОДИМ: запрос провайдера поиска |
| 781 | [metalbear-co/mirrord](https://github.com/metalbear-co/mirrord) | 5.4k | Run any process, on your machine or in an AI agent's environment, as if it were a pod in your K |
| 782 | [beclab/Olares](https://github.com/beclab/Olares) | 5.3k | Open-Source Personal Cloud OS for Always-On Agents |
| 783 | [ApodexAI/FrontierAgent](https://github.com/ApodexAI/FrontierAgent) | 5.3k | 🧩 FrontierAgent, our agent framework, open-sourced alongside it — native command-line TUI, ReA |
| 785 | [katanaml/sparrow](https://github.com/katanaml/sparrow) | 5.2k | Structured data extraction, instruction calling and agentic workflows with ML, LLM and Vision L |
| 787 | [yanshengjia/ml-road](https://github.com/yanshengjia/ml-road) | 5k | Machine Learning and Agentic AI Resources, Practice and Research |
| 788 | [FellouAI/eko](https://github.com/FellouAI/eko) | 5k | Eko (Eko Keeps Operating) - Build Production-ready Agentic Workflow with Natural Language - eko |
| 790 | [formkit/formkit](https://github.com/formkit/formkit) | 4.8k | The form framework for coding agents |
| 791 | [ruc-datalab/DeepAnalyze](https://github.com/ruc-datalab/DeepAnalyze) | 4.7k | DeepAnalyze is the first agentic LLM for autonomous data science. 🎈你的AI数据分析师，自动分析大量数据，一键生成专业分析 |
| 792 | [nexu-io/html-video](https://github.com/nexu-io/html-video) | 4.7k | Programmatic video for coding agents — HTML to video on your laptop. Turn HTML, CSS & data into |
| 793 | [latitude-dev/latitude-llm](https://github.com/latitude-dev/latitude-llm) | 4.7k | Open-source observability for AI agents. Find where your agents fail, dispatch your coding agen |
| 794 | [FareedKhan-dev/all-agentic-architectures](https://github.com/FareedKhan-dev/all-agentic-architectures) | 4.6k | 35 production-grade agentic AI architectures (Reflexion, LATS, GraphRAG, MemGPT, Voyager, Brows |
| 796 | [modelcontextprotocol/csharp-sdk](https://github.com/modelcontextprotocol/csharp-sdk) | 4.6k | The official C# SDK for Model Context Protocol servers and clients. Maintained in collaboration |
| 799 | [embabel/embabel-agent](https://github.com/embabel/embabel-agent) | 4.5k | [«Update to 2026-07-28 MCP Spec»](https://github.com/embabel/embabel-agent/issues/2054) | ЗАПОЩЕНО [6351753883](https://github.com/embabel/embabel-agent/issues/2054#issuecomment-6351753883) |
| 800 | [pydantic/logfire](https://github.com/pydantic/logfire) | 4.5k | [«Support MCP Events for Logfire alerts and issues»](https://github.com/pydantic/logfire/issues/2510) | НЕ ВХОДИМ: observability-фича, не integrity |
| 801 | [zhukunpenglinyutong/desktop-cc-gui](https://github.com/zhukunpenglinyutong/desktop-cc-gui) | 4.5k | [«Error: Invalid MCP configuration»](https://github.com/zhukunpenglinyutong/desktop-cc-gui/issues/1080) | НЕ ВХОДИМ: config-error юзера, не контракты + stale |
| 803 | [zgsm-ai/costrict](https://github.com/zgsm-ai/costrict) | 4.5k | [«[ENHANCEMENT] Document opt-in Parallel Search MCP setup»](https://github.com/zgsm-ai/costrict/issues/1378) | НЕ ВХОДИМ: foreign-promo (Parallel Search) |
| 805 | [ragapp/ragapp](https://github.com/ragapp/ragapp) | 4.4k | [«Add governance and audit trails for enterprise RAG deployments»](https://github.com/ragapp/ragapp/issues/289) | НЕ ВХОДИМ: закрыт (May 2026) |
| 807 | [microsoft/flint-chart](https://github.com/microsoft/flint-chart) | 4.4k | [«Escape coverage gap: theme furniture geometry and the ECharts backgrou»](https://github.com/microsoft/flint-chart/issues/129) | НЕ ВХОДИМ: тема визуал-регрессий, не MCP-контракты |
| 811 | [arcboxlabs/arcbox](https://github.com/arcboxlabs/arcbox) | 4.2k | ||| |
| 814 | [CommandCodeAI/command-code](https://github.com/CommandCodeAI/command-code) | 4.2k | [«MCP's are not working»](https://github.com/CommandCodeAI/command-code/issues/931) | НЕ ВХОДИМ: PATH/spawn-боль Windows, не контракты |
| 817 | [matt1398/claude-devtools](https://github.com/matt1398/claude-devtools) | 4k | [«[FEAT] See MCP tool definition token usage in "Visible Context"»](https://github.com/matt1398/claude-devtools/issues/180) | НЕ ВХОДИМ: stale (апрель, 0 комм.) |
| 819 | [jordan-gibbs/hyperresearch](https://github.com/jordan-gibbs/hyperresearch) | 3.9k | [«Add a Webz.io News Search provider»](https://github.com/jordan-gibbs/hyperresearch/issues/135) | НЕ ВХОДИМ: запрос провайдера поиска |
| 821 | [tutti-os/tutti](https://github.com/tutti-os/tutti) | 3.8k | [«feat: pluggable shared memory layer across agent providers (PowerMem i»](https://github.com/tutti-os/tutti/issues/898) | НЕ ВХОДИМ: memory-layer фича, не наша |
| 824 | [google-antigravity/antigravity-sdk-python](https://github.com/google-antigravity/antigravity-sdk-python) | 3.8k | [«MCP examples are broken with the `mcp` version installed by the SDK (`»](https://github.com/google-antigravity/antigravity-sdk-python/issues/175) |
| 826 | [Windy3f3f3f3f/how-claude-code-works](https://github.com/Windy3f3f3f3f/how-claude-code-works) | 3.8k | ||| |
| 830 | [Ontos-AI/knowhere](https://github.com/Ontos-AI/knowhere) | 3.7k | Knowhere extracts, parses, and outputs structured chunks ready for AI Agents and RAG. |
| 831 | [modelcontextprotocol/java-sdk](https://github.com/modelcontextprotocol/java-sdk) | 3.7k | The official Java SDK for Model Context Protocol servers and clients. Maintained in collaborati |
| 832 | [SamurAIGPT/llm-wiki-agent](https://github.com/SamurAIGPT/llm-wiki-agent) | 3.6k | A personal knowledge base that builds and maintains itself. Drop in sources — Claude (or Codex/ |
| 833 | [Ar9av/obsidian-wiki](https://github.com/Ar9av/obsidian-wiki) | 3.6k | Framework for AI agents to build and maintain a digital brain through Obsidian wiki | Memory Sy |
| 834 | [SeemSeam/claude_codex_bridge](https://github.com/SeemSeam/claude_codex_bridge) | 3.6k | Visible multi-agent CLI workspace for mixing Codex, Claude, Gemini, Kimi, Qwen, Cursor, Copilot |
| 836 | [FireRedTeam/FireRed-OpenStoryline](https://github.com/FireRedTeam/FireRed-OpenStoryline) | 3.6k | FireRed-OpenStoryline is an AI video editing agent that transforms manual editing into intentio |
| 838 | [onehumanbeing/esp32-iphone-agent](https://github.com/onehumanbeing/esp32-iphone-agent) | 3.5k | Let an AI model use a real iPhone with a $7 ESP32: AirPlay eyes, USB HID hands, any OpenAI-comp |
| 839 | [huangjunsen0406/py-xiaozhi](https://github.com/huangjunsen0406/py-xiaozhi) | 3.5k | Open-source AI assistant ecosystem with MCP integrations, multimodal workflows, IoT support, an |
| 840 | [sugarforever/chat-ollama](https://github.com/sugarforever/chat-ollama) | 3.5k | ChatOllama is an open source agentic app for running AI agents across local and hosted models. |
| 842 | [superagent-ai/grok-cli](https://github.com/superagent-ai/grok-cli) | 3.5k | An open-source coding agent for the Grok API |
| 843 | [codeaashu/claude-code](https://github.com/codeaashu/claude-code) | 3.4k | Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, a |
| 844 | [eracle/OpenOutreach](https://github.com/eracle/OpenOutreach) | 3.4k | Open-source AI agent for B2B lead generation — describe your product, it finds the people who f |
| 845 | [agent-of-empires/agent-of-empires](https://github.com/agent-of-empires/agent-of-empires) | 3.4k | [«MCP control: aoe mcp config, docs guide, e2e and follow-ups»](https://github.com/agent-of-empires/agent-of-empires/issues/4638) | НЕ ВХОДИМ: имплементационный тикет принятого RFC |
| 846 | [zeronsh/zeron](https://github.com/zeronsh/zeron) | 3.3k | [«Support configuring external MCP servers in Zeron, including Pi sessio»](https://github.com/zeronsh/zeron/issues/961) | ЗАПОЩЕНО [6351754461](https://github.com/zeronsh/zeron/issues/961#issuecomment-6351754461) |
| 848 | [liaohch3/claude-tap](https://github.com/liaohch3/claude-tap) | 3.3k | [«fix(pi): reverse mode can't reach custom providers in models.json — lo»](https://github.com/liaohch3/claude-tap/issues/465) | НЕ ВХОДИМ: баг моделей.json, не контракты |
| 849 | [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) | 3.3k | ||| |
| 851 | [fuxicodex/Fuxi](https://github.com/fuxicodex/Fuxi) | 3.2k | FuXi is a fast, self-contained AI coding agent that lives in your terminal — edit code, run com |
| 852 | [TurixAI/TuriX-CUA](https://github.com/TurixAI/TuriX-CUA) | 3.2k | This is the official website for TuriX Computer-use-Agent |
| 854 | [cheshire-cat-ai/core](https://github.com/cheshire-cat-ai/core) | 3.1k | AI agent microservice |
| 855 | [software-mansion/argent](https://github.com/software-mansion/argent) | 3.1k | An agentic toolkit to control, debug, and profile iOS and Android apps. Made by Software Mansio |
| 856 | [GCWing/OpenBitFun](https://github.com/GCWing/OpenBitFun) | 3k | OpenBitFun combines a high-performance agent runtime written in Rust with a polished desktop ap |
| 857 | [vercel-labs/opensrc](https://github.com/vercel-labs/opensrc) | 3k | Fetch source code for npm packages to give AI coding agents deeper context |
| 858 | [QwenAudio/qwen-audio-agent](https://github.com/QwenAudio/qwen-audio-agent) | 3k | A realtime voice runtime that keeps Agents talking, working, and present.  Real-time Voice Runt |
| 860 | [qingchencloud/clawpanel](https://github.com/qingchencloud/clawpanel) | 2.9k | 🦞 OpenClaw & Hermes Agent 多引擎 AI 管理面板 — 内置 AI 助手（工具调用 + 图片识别 + 多模态），一键安装 | Tauri v2 跨平台桌面应用 |  |
| 866 | [xzf-thu/VoiceMem](https://github.com/xzf-thu/VoiceMem) | 2.6k | Infrastructure for the next generation of voice agents, designed to provide universal memory. I |
| 867 | [Zafer-Liu/Data-Analysis-Agent](https://github.com/Zafer-Liu/Data-Analysis-Agent) | 2.6k | 🚀你的私人数据分析助手。通过对话式交互，自动生成可视化报表与商业洞察，让数据决策变得像聊天一样简单。  🚀 Your personal data analysis assistant.  |
| 868 | [boxlite-ai/boxlite](https://github.com/boxlite-ai/boxlite) | 2.6k | The micro-VM for AI agents — light enough to embed on your laptop, elastic enough to power an a |
| 869 | [go-nunu/nunu](https://github.com/go-nunu/nunu) | 2.6k | A CLI tool for building Go applications. |
| 870 | [kayba-ai/agentic-context-engine](https://github.com/kayba-ai/agentic-context-engine) | 2.6k | 🧠 Make your agents learn from experience. Now available as a hosted solution at kayba.ai |
| 871 | [CoderLuii/HolyClaude](https://github.com/CoderLuii/HolyClaude) | 2.6k | AI coding workstation: Claude Code + web UI + 8 AI CLIs + headless browser + 50+ tools |
| 876 | [Nano-Collective/nanocoder](https://github.com/Nano-Collective/nanocoder) | 2.5k | An open coding agent for your terminal, built by a community collective rather than a company.  |
| 877 | [PurpleDoubleD/locally-uncensored](https://github.com/PurpleDoubleD/locally-uncensored) | 2.5k | The all-in-one local AI studio for your desktop: chat, image and video generation and a coding  |
| 879 | [jackmpcollins/magentic](https://github.com/jackmpcollins/magentic) | 2.4k | Seamlessly integrate LLMs as Python functions |
| 881 | [spacedriveapp/spacebot](https://github.com/spacedriveapp/spacebot) | 2.4k | An AI agent for teams, communities, and multi-user environments. |
| 882 | [Tongyi-MAI/MAI-UI](https://github.com/Tongyi-MAI/MAI-UI) | 2.4k | Qwen-UI-Agent: Towards Next-Generation Real-World Centric Foundation GUI Agent |
| 884 | [AgentsMesh/AgentsMesh](https://github.com/AgentsMesh/AgentsMesh) | 2.4k | The AI Agent Workforce Platform. Run a hundred AI coding agents across your own machines — sche |
| 886 | [nano-muse/nanoMuse](https://github.com/nano-muse/nanoMuse) | 2.3k | nanoMuse: an open-source personal agent for every device you own. One agent with a name and a l |
| 887 | [777genius/agent-teams-ai](https://github.com/777genius/agent-teams-ai) | 2.3k | You're the boss, agents are your team. They handle tasks on their own, message each other, and  |
| 890 | [Stack-Cairn/LiveAgent](https://github.com/Stack-Cairn/LiveAgent) | 2.2k | A fully functional AI Agent desktop client that supports Webui access and can be creatively cus |
| 891 | [daodao97/chatmcp](https://github.com/daodao97/chatmcp) | 2.2k | ChatMCP is an AI chat client implementing the Model Context Protocol (MCP). |
| 892 | [OpenCoworkAI/open-cowork](https://github.com/OpenCoworkAI/open-cowork) | 2.2k | Open-source AI agent desktop app for Windows & macOS. One-click install Claude Code, MCP tools, |
| 894 | [rynfar/meridian](https://github.com/rynfar/meridian) | 2.2k | Use Claude and Antigravity with Pi, OpenCode and other coding clients. Local API bridge, usage  |
| 896 | [maxritter/qualitylayer](https://github.com/maxritter/qualitylayer) | 2.1k | Plan, build and review software with your coding agents. Work side by side in the App or browse |
| 899 | [Kochava-Studios/witsy](https://github.com/Kochava-Studios/witsy) | 2k | Witsy: desktop AI assistant / universal MCP client |
| 900 | [doobidoo/mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) | 2k | Open-source persistent memory for AI agent pipelines (LangGraph, CrewAI, AutoGen) and Claude. R |
| 904 | [CoderGamester/mcp-unity](https://github.com/CoderGamester/mcp-unity) | 2k | Model Context Protocol (MCP) plugin to connect with Unity Editor — designed for Cursor, Claude  |
| 907 | [showlab/ShowUI](https://github.com/showlab/ShowUI) | 1.9k | [CVPR 2025] Open-source, End-to-end, Vision-Language-Action model for GUI Agent & Computer Use. |
| 911 | [a5c-ai/babysitter](https://github.com/a5c-ai/babysitter) | 1.9k | Babysitter enforces obedience on agentic workforces and enables them to manage extremely comple |
| 912 | [he-yufeng/CoreCoder](https://github.com/he-yufeng/CoreCoder) | 1.9k | Minimal AI coding agent (~1,000 lines of Python) inspired by Claude Code. Works with any LLM. T |
| 915 | [AtomicBot-ai/Atomic-Chat](https://github.com/AtomicBot-ai/Atomic-Chat) | 1.8k | Local AI app and inference engine for agents. Run open-weight LLMs locally — private, 100% offl |
| 916 | [OpenAgentPlatform/Dive](https://github.com/OpenAgentPlatform/Dive) | 1.8k | Dive is an open-source MCP Host Desktop Application that seamlessly integrates with any LLMs su |
| 917 | [lahfir/agent-desktop](https://github.com/lahfir/agent-desktop) | 1.8k | Agent Desktop gives any agent reliable computer use on the desktop. Built with Rust, it sees an |
| 918 | [Core-Mate/OpenGUI](https://github.com/Core-Mate/OpenGUI) | 1.8k | OpenGUI is an Android GUI agent framework for phone-use AI that can see, plan, and operate real |
| 920 | [kenryu42/cc-safety-net](https://github.com/kenryu42/cc-safety-net) | 1.7k | A pre-execution guard for AI coding agents. It blocks destructive Git and file system commands, |
| 922 | [asinghcsu/AgenticRAG-Survey](https://github.com/asinghcsu/AgenticRAG-Survey) | 1.7k | Agentic-RAG explores advanced Retrieval-Augmented Generation systems enhanced with AI LLM agent |
| 923 | [Twigpine/zero](https://github.com/Twigpine/zero) | 1.7k | The coding agent that answers to you, your model, your machine, your rules. |
| 924 | [gi-dellav/zerostack](https://github.com/gi-dellav/zerostack) | 1.7k | Lightweight coding agent written in Rust, optimized for memory footprint and performance |
| 926 | [miscusi-peek/cheatengine-mcp-bridge](https://github.com/miscusi-peek/cheatengine-mcp-bridge) | 1.7k | Connect your favorite AI agents directly to Cheat Engine via MCP. Automate reverse engineering, |
| 927 | [ghostwright/ghost-os](https://github.com/ghostwright/ghost-os) | 1.7k | Full computer-use for AI agents. Self-learning workflows. Native macOS. No screenshots required |
| 929 | [davialabs/davia](https://github.com/davialabs/davia) | 1.7k | Interactive, editable docs designed for coding agents |
| 930 | [codeaholicguy/ai-devkit](https://github.com/codeaholicguy/ai-devkit) | 1.7k | The control plane for AI coding agents. |
| 932 | [modelcontextprotocol/php-sdk](https://github.com/modelcontextprotocol/php-sdk) | 1.6k | The official PHP SDK for Model Context Protocol servers and clients. Maintained in collaboratio |
| 934 | [Kaelio/ktx](https://github.com/Kaelio/ktx) | 1.6k | ktx is an executable context layer for data and analytics agents 🐙 Allow Claude Code, Codex, o |
| 936 | [razzant/ouroboros](https://github.com/razzant/ouroboros) | 1.6k | Ouroboros — self-creating AI agent. Born Feb 16, 2026. |
| 937 | [fujibee/agmsg](https://github.com/fujibee/agmsg) | 1.6k | Cross-vendor messaging for CLI AI coding agents — let Claude Code, Codex, Gemini & Copilot talk |
| 938 | [PaperDebugger/paperdebugger](https://github.com/PaperDebugger/paperdebugger) | 1.5k | A Plugin-Based Multi-Agent System for In-Editor Academic Writing, Review, and Editing |
| 939 | [dyoshikawa/rulesync](https://github.com/dyoshikawa/rulesync) | 1.5k | A Utility CLI for AI Coding Agents |
| 940 | [RTGS2017/NagaAgent](https://github.com/RTGS2017/NagaAgent) | 1.5k | A simple yet powerful agent framework for personal assistants, designed to enable intelligent i |
| 941 | [webbrain-one/webbrain](https://github.com/webbrain-one/webbrain) | 1.5k | Open-source AI browser agent for Chrome and Firefox (monorepo) 🧠 |
| 942 | [NPC-Worldwide/npcpy](https://github.com/NPC-Worldwide/npcpy) | 1.5k | The python library for research and development in NLP, multimodal LLMs, Agents, ML, Knowledge  |
| 943 | [golemcloud/golem](https://github.com/golemcloud/golem) | 1.5k | Golem Cloud is the agent-native platform for building AI agents and distributed applications th |
| 944 | [LodyAI/Lody](https://github.com/LodyAI/Lody) | 1.5k | Share coding agents with your team on phone and desktop |
| 945 | [alexgreensh/attention-span](https://github.com/alexgreensh/attention-span) | 1.5k | Make your agents talk human. ADHD-friendly output styles for Claude Code, Codex, and others. So |
| 946 | [kaiban-ai/KaibanJS](https://github.com/kaiban-ai/KaibanJS) | 1.5k | KaibanJS is a JavaScript-native framework for building and managing multi-agent systems  with a |
| 947 | [fictionco/fiction](https://github.com/fictionco/fiction) | 1.5k | Agentic Digital Self Platform |
| 948 | [preset-io/agor](https://github.com/preset-io/agor) | 1.5k | Multiplayer AI: Bring your team and agents together |
| 950 | [alookai/alook](https://github.com/alookai/alook) | 1.4k | Rooms for people and agents. |
| 951 | [AltanS/collie](https://github.com/AltanS/collie) | 1.4k | Herdr mobile client for iPhone and Android. A self-hosted PWA to drive Claude Code, Pi, Codex a |
| 955 | [Gentleman-Programming/gentle-shell](https://github.com/Gentleman-Programming/gentle-shell) | 1.4k | Your coding agent for controlled development in the workspace you lead. A Pi-native shell with  |
| 957 | [tmgthb/Autonomous-Agents](https://github.com/tmgthb/Autonomous-Agents) | 1.4k | Autonomous Agents (LLMs) research papers. Updated Daily. |
| 960 | [GanyuanRan/Aegis](https://github.com/GanyuanRan/Aegis) | 1.4k | Make AI coding agents architecture-aware: baseline-first, evidence-verified, drift-checked, and |
| 962 | [ntegrals/10x](https://github.com/ntegrals/10x) | 1.4k | ⚡️ 10x - Up to 20x faster AI coding with multi-step Superpowers. Open-source agent with smart m |
| 964 | [qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite) | 1.4k | Professional slash commands for Claude Code that provide   structured workflows for software de |
| 965 | [strands-agents/tools](https://github.com/strands-agents/tools) | 1.3k | A set of tools that gives agents powerful capabilities. |
| 966 | [Ataraxy-Labs/weave](https://github.com/Ataraxy-Labs/weave) | 1.3k | Entity-level git merge driver. Resolves false conflicts git invents when independent agents edi |
| 967 | [l0ng-ai/tty7](https://github.com/l0ng-ai/tty7) | 1.3k | The terminal that outlives its window. Shells survive quitting the app, agents can drive other  |
| 970 | [SaladDay/pi-from-scratch](https://github.com/SaladDay/pi-from-scratch) | 1.3k | 600 行 TypeScript 写成的超级迷你版 pi，让你轻松从 0 写出属于你的 pi-agent |
| 974 | [Anionex/agent-vision-toolkit](https://github.com/Anionex/agent-vision-toolkit) | 1.2k | 为纯文本模型"看图“设计更好的视觉工具箱和技能，支持多图理解，图片问答，前端UI还原、GUI 自动化等，并可选无缝接入多个主流agent，直接识别粘贴图片｜ A vision toolkit |
| 976 | [tomasz-tomczyk/crit](https://github.com/tomasz-tomczyk/crit) | 1.2k | Review AI coding agents' plans, diffs and running apps in the browser. Local-first, works with  |
| 980 | [browserable/browserable](https://github.com/browserable/browserable) | 1.2k | Open source and self-hostable browser automation library for AI agents |
| 983 | [zai-org/CogAgent](https://github.com/zai-org/CogAgent) | 1.2k | An open-sourced end-to-end VLM-based GUI Agent |
| 984 | [keinsaasforever/better-chatbot](https://github.com/keinsaasforever/better-chatbot) | 1.2k | Formerly Better Chatbot. Navigator is an open-source AI workspace for agents, MCP and workflow  |
| 985 | [fcakyon/claude-codex-settings](https://github.com/fcakyon/claude-codex-settings) | 1.2k | Battle-tested Claude Code, OpenAI Codex, Cursor configs, plugins, hooks and agents with Kimi, M |
| 986 | [ref-tools/ref-tools-mcp](https://github.com/ref-tools/ref-tools-mcp) | 1.2k | Helping coding agents never make mistakes working with public or private libraries without wast |
| 987 | [ctxrs/ctx](https://github.com/ctxrs/ctx) | 1.2k | Instant recall for coding agents. Search the history already on your machine. Git blame, but fo |
| 990 | [AI-QL/tuui](https://github.com/AI-QL/tuui) | 1.2k | A desktop MCP client designed as a tool unitary utility integration, accelerating AI adoption t |
| 991 | [hexabot-ai/Hexabot](https://github.com/hexabot-ai/Hexabot) | 1.2k | Hexabot v3 is an AI workflow automation platform, combining workflows, actions, agents, and con |
| 993 | [LiuMengxuan04/MiniCode](https://github.com/LiuMengxuan04/MiniCode) | 1.2k | A lightweight terminal coding assistant with Claude Code-like workflow, tool loop, and TUI arch |
| 994 | [DeepMyst/Mysti](https://github.com/DeepMyst/Mysti) | 1.1k | AI coding dream team of agents for VS Code. Claude Code + openai Codex collaborate in brainstor |
| 996 | [ayuayue/PiDeck](https://github.com/ayuayue/PiDeck) | 1.1k | PiDeck 是一个开源的桌面工作台，用于在本地项目目录中统一管理 PI | DSH Agent 会话，并支持导入 Codex、Claude 本地会话以便统一浏览和恢复。支持多项目工作区、会 |
| 997 | [vstorm-co/pydantic-deepagents](https://github.com/vstorm-co/pydantic-deepagents) | 1.1k | Open-source, self-hosted Claude Code - a terminal AI assistant and the Python framework behind  |
| 998 | [paean-ai/deeptide](https://github.com/paean-ai/deeptide) | 1.1k | Built by DeepSeek, for DeepSeek — a Swift-native macOS coding agent |
| 999 | [Human-Agent-Society/CORAL](https://github.com/Human-Agent-Society/CORAL) | 1.1k | Open-source autoresearch powered by autonomous coding agents. Run Claude Code, OpenCode, and Co |
| 1000 | [StreetLamb/tribe](https://github.com/StreetLamb/tribe) | 1.1k | Low code tool to rapidly build and coordinate multi-agent teams |
| 1002 | [TIGER-AI-Lab/ClawBench](https://github.com/TIGER-AI-Lab/ClawBench) | 1.1k | Open-source benchmark for browser AI agents on daily tasks. |
| 1003 | [CelestoAI/celesto](https://github.com/CelestoAI/celesto) | 1.1k | Secure and persistent computer for AI agents |
| 1005 | [apify/mcpc](https://github.com/apify/mcpc) | 1.1k | The most compatible MCP CLI client. Supports: tools, resources, prompts, completions, async tas |
| 1006 | [MayDay-wpf/snow-cli](https://github.com/MayDay-wpf/snow-cli) | 1.1k | Agentic coding in your terminal,Simultaneously compatible with OpenAI, Gemini, and Claude.运行在终端 |
| 1007 | [doccker/cc-use-exp](https://github.com/doccker/cc-use-exp) | 1.1k | ⛔ No longer maintained → dev-agent-kit/recipes  让 Claude Code、Antigravity、Gemini CLI、Codex、Curs |
| 1008 | [johannesjo/parallel-code](https://github.com/johannesjo/parallel-code) | 1.1k | Run Claude Code, Codex, and Gemini side by side — each in      its own git worktree |
| 1009 | [inclusionAI/UI-Venus](https://github.com/inclusionAI/UI-Venus) | 1.1k | UI-Venus is a general-purpose foundation GUI agent for mobile apps, web platforms, and desktop  |
| 1010 | [lennybase/browsernode](https://github.com/lennybase/browsernode) | 1.1k | 🌐 Make websites accessible for AI agents. Automate tasks online with ease. |
| 1012 | [kunal12203/GrapeRoot](https://github.com/kunal12203/GrapeRoot) | 1k | Compounding Context for AI Coding Assistants — MCP graph engine for Claude Code, Cursor, Copilo |
| 1014 | [Agent-Field/SWE-AF](https://github.com/Agent-Field/SWE-AF) | 1k | Autonomous software engineering fleet of AI agents for production-grade PRs on AgentField: plan |
| 1015 | [Harvil1/codeAgent](https://github.com/Harvil1/codeAgent) | 1k | CodeAgent is an open-source coding agent that lives in your terminal. It understands your repos |
| 1016 | [ConardLi/easy-agent](https://github.com/ConardLi/easy-agent) | 1k | Production-ready open source terminal coding agent with readable, layered code: permission rule |
| 1018 | [lmgame-org/GamingAgent](https://github.com/lmgame-org/GamingAgent) | 1k | [ICLR 2026] LLM/VLM gaming agents and model evaluation through games. |
| 1021 | [tastyeffectco/sandboxd](https://github.com/tastyeffectco/sandboxd) | 1k | Open-source, self-hosted AI app builder — an agent builds real apps in isolated sandboxes on yo |
| 1022 | [milisp/codexia](https://github.com/milisp/codexia) | 0.9k | Lightweight Agent Workstation for Codex + Claude code + keke-agent — with dots, task scheduler, |
| 1023 | [modelcontextprotocol/ruby-sdk](https://github.com/modelcontextprotocol/ruby-sdk) | 0.9k | The official Ruby SDK for the Model Context Protocol servers and clients. |
| 1024 | [OleksandrChekhovskyi/hax](https://github.com/OleksandrChekhovskyi/hax) | 0.9k | A minimalist, terminal-native coding agent written in C. |
| 1025 | [usewhale/Whale](https://github.com/usewhale/Whale) | 0.9k | Whale — blazingly fast, terminal-first AI coding agent for DeepSeek. ~98% prompt cache hit rate |
| 1026 | [w8123/EnterpriseAgentFramework](https://github.com/w8123/EnterpriseAgentFramework) | 0.9k | ReachAI企业级智能体开发平台：快速、安全完成已有业务系统智能化改造，让 AI 在 OA、ERP、CRM 等原系统中查数据、填表单、办业务。ReachAI: Quickly and se |
| 1030 | [agentforce314/clawcodex](https://github.com/agentforce314/clawcodex) | 0.9k | Token efficient Claude Code full Python rebuild. AI Coding Agent in 310K LoC Python. |
| 1031 | [strands-agents/samples](https://github.com/strands-agents/samples) | 0.9k | Agent samples built using the Strands Agents SDK. |
| 1032 | [microsoft/WindowsAgentArena](https://github.com/microsoft/WindowsAgentArena) | 0.9k | Windows Agent Arena (WAA) 🪟 is a scalable OS platform for testing and benchmarking of multi-mo |
| 1033 | [jmfederico/pi-web](https://github.com/jmfederico/pi-web) | 0.9k | Web UI for Pi Coding Agent that keeps sessions alive in real workspaces. |
| 1035 | [nuwax-ai/nuwax](https://github.com/nuwax-ai/nuwax) | 0.9k | Nuwax Agent OS - An enterprise-grade AI Agent Development and Operation Platform - Providing a  |
| 1036 | [fivetaku/fablize](https://github.com/fivetaku/fablize) | 0.9k | A Claude Code plugin that makes Opus behave like Fable — completion, evidence, and verification |
| 1039 | [rcarmo/piclaw](https://github.com/rcarmo/piclaw) | 0.9k | pi coding agent in a technicolor web trenchcoat |
| 1043 | [traceroot-ai/traceroot](https://github.com/traceroot-ai/traceroot) | 0.9k | TraceRoot - Open Source AI Agent Improvement Platform. YC S25 |
| 1044 | [xpander-ai/xpander.ai](https://github.com/xpander-ai/xpander.ai) | 0.9k | xpander.ai is the runtime and control plane to build, run, and ship reliable AI agents fast and |
| 1048 | [huohua325/Memslides](https://github.com/huohua325/Memslides) | 0.9k | A hierarchical memory framework for personalized presentation agents. Try it at memslides.com. |
| 1049 | [AVIDS2/memorix](https://github.com/AVIDS2/memorix) | 0.9k | Open-source cross-agent memory layer for coding agents via MCP. Compatible with Claude Code, Co |
| 1051 | [XHToken/Spark-X2.6](https://github.com/XHToken/Spark-X2.6) | 0.8k | Spark-x2.5 open model series. Pushing the Limits of Agentic Capabilities in On-Device Models |
| 1053 | [zaidmukaddam/scira-mcp-chat](https://github.com/zaidmukaddam/scira-mcp-chat) | 0.8k | A minimalistic MCP client with a good feature set. |
| 1055 | [FrancescoStabile/numasec](https://github.com/FrancescoStabile/numasec) | 0.8k | The AI Agent for Cyber Security. |
| 1058 | [Gnosil/semantix](https://github.com/Gnosil/semantix) | 0.8k | semantic agent kernel which make agent efficient and self-evolve |
| 1060 | [tigicion/dao-code](https://github.com/tigicion/dao-code) | 0.8k | Open-source TypeScript terminal coding agent for DeepSeek-V4 — builds on DeepSeek's strong pric |
| 1061 | [kitfunso/hippo-memory](https://github.com/kitfunso/hippo-memory) | 0.8k | Stop re-teaching your agent. Make your agent's memory work like a brain. Hippo is long-term mem |
| 1062 | [sigoden/llm-functions](https://github.com/sigoden/llm-functions) | 0.8k | Easily create LLM tools and agents using plain Bash/JavaScript/Python functions. |
| 1063 | [mikehasa/agentacct](https://github.com/mikehasa/agentacct) | 0.8k | See what your coding agents did and what it cost. Breaks each task down into work steps — tools |
| 1064 | [sanbuphy/nanoAgent](https://github.com/sanbuphy/nanoAgent) | 0.8k | If you can read ~100 lines of Python, you understand agents. |
| 1065 | [coipond/coi](https://github.com/coipond/coi) | 0.8k | Give the agent a machine. Just not yours. Each AI coding agent gets its own isolated machine wi |
| 1067 | [AmazingAng/old-coder](https://github.com/AmazingAng/old-coder) | 0.8k | An old coder's strategy for the agent era: don't read the code — make it run the gauntlet. Evid |
| 1071 | [narumiruna/pi-extensions](https://github.com/narumiruna/pi-extensions) | 0.7k | A monorepo of Pi Coding Agent extensions |
| 1072 | [agent-sh/computer-use-linux](https://github.com/agent-sh/computer-use-linux) | 0.7k | Native Linux desktop control for AI agents (MCP, Pi, CLI) — semantic AT-SPI trees, screenshots, |
| 1074 | [frontman-ai/frontman](https://github.com/frontman-ai/frontman) | 0.7k | The AI agent that lives in your framework/browser |
| 1075 | [suitedaces/computer-agent](https://github.com/suitedaces/computer-agent) | 0.7k | Desktop app to control your computer with AI using your terminal, browser, mouse & keyboard |
| 1076 | [BinarCode/laravel-restify](https://github.com/BinarCode/laravel-restify) | 0.7k | Laravel API for Ai Agents and humans. |
| 1080 | [sympozium-ai/sympozium](https://github.com/sympozium-ai/sympozium) | 0.7k | The Coordination Layer for Multi-Agent AI |
| 1081 | [Tura-AI/tura](https://github.com/Tura-AI/tura) | 0.7k | Build agent that uses 80% less token and delivers better results. |
| 1083 | [Cluster444/agentic](https://github.com/Cluster444/agentic) | 0.7k | An agentic workflow tool that provides context engineering support for opencode |
| 1084 | [SmythOS/smythos-studio](https://github.com/SmythOS/smythos-studio) | 0.7k | SmythOS Studio: Open-Source Visual AI Agent Builder and deployable runtime stack from SmythOS.  |
| 1085 | [takahirom/arbigent](https://github.com/takahirom/arbigent) | 0.7k | AI Agent for testing Android, iOS, and Web apps. Get Started in 5 Minutes. Arbigent's intuitive |
| 1086 | [AgentiLoop/Agent](https://github.com/AgentiLoop/Agent) | 0.6k | Agent! now supports macOS 14.6 or later, Apple Silicon and Intel, latest release. The Best AI a |
| 1087 | [modiqo/waggle](https://github.com/modiqo/waggle) | 0.6k | Attributed, resolvable artifact references for agent handoffs — a ~30-byte token instead of pas |
| 1088 | [sleepinginsummer/agent-browser-cli](https://github.com/sleepinginsummer/agent-browser-cli) | 0.6k | 使用 agent-browser-cli 进行浏览器感知与控制。适用于标签页扫描/切换、页面 JS 执行、Cookie、CDP、contentSettings、截图、文件上传、下拉框点击、t |
| 1091 | [unifapi-agent/agents](https://github.com/unifapi-agent/agents) | 0.6k | Open-source marketing agents for Claude, ChatGPT, Codex, OpenClaw & Hermes. One plugin: SEO aud |
| 1092 | [strongdm/leash](https://github.com/strongdm/leash) | 0.6k | Leash by StrongDM - take your AI agents for a walk |
| 1093 | [second-state/echokit_server](https://github.com/second-state/echokit_server) | 0.6k | Open Source Voice Agent Platform |
| 1094 | [agentic-in/elephant-agent](https://github.com/agentic-in/elephant-agent) | 0.6k | Personal-Model First Self Evolving AI Agent 🐘 |
| 1096 | [termio-sh/termio](https://github.com/termio-sh/termio) | 0.6k | A terminal-first agentic development environment for agentic coding. Build for CLI/TUI agent. R |
| 1097 | [bhouston/mycoder](https://github.com/bhouston/mycoder) | 0.6k | Simple to install, powerful command-line based AI agent system for coding. |
| 1100 | [CopilotKit/open-multi-agent-canvas](https://github.com/CopilotKit/open-multi-agent-canvas) | 0.6k | The open-source multi-agent chat interface that lets you manage multiple agents in one dynamic  |
| 1102 | [l0ng-ai/papr](https://github.com/l0ng-ai/papr) | 0.5k | A fast, native RSS reader — plus an agent-facing CLI so your AI agent can read, search and tria |
| 1103 | [nossa-y/activity-frames](https://github.com/nossa-y/activity-frames) | 0.5k | Turn your workday into structured workflows agents can execute. 100% local, served over MCP. |
| 1107 | [BrowserOperator/browser-operator-core](https://github.com/BrowserOperator/browser-operator-core) | 0.5k | Browser Operator - The AI browser with built in Multi-Agent platform! Open source alternative t |
| 1108 | [JungHoonGhae/tossinvest-cli](https://github.com/JungHoonGhae/tossinvest-cli) | 0.5k | 공식 API에 없는 30+ 기능까지, 터미널과 AI에서 쓰세요. 토스증권 비공식 CLI·MCP. |
| 1109 | [Piebald-AI/gemini-cli-desktop](https://github.com/Piebald-AI/gemini-cli-desktop) | 0.5k | Web/desktop UI for Gemini CLI/Qwen Code.  Manage projects, switch between tools, search across  |
| 1110 | [echoVic/orca-agent](https://github.com/echoVic/orca-agent) | 0.5k | Orca is a DeepSeek-native coding agent. |
| 1112 | [Chen-zexi/vllm-cli](https://github.com/Chen-zexi/vllm-cli) | 0.5k | A command-line interface tool for serving LLM using vLLM. |

## Прочее AI-инструментальное (25) — заход: пины MCP/skills-контрактов

| # | Репо | ★ | Боль (ссылка) / что это | Вердикт: входим? |
|---|---|---|---|---|
| 762 | [htdt/godogen](https://github.com/htdt/godogen) | 7.2k | ||| |
| 779 | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | 5.5k | ||| |
| 789 | [nguyenphutrong/quotio](https://github.com/nguyenphutrong/quotio) | 4.9k | Stop juggling AI accounts. Quotio is a beautiful native macOS menu bar app that unifies your Cl |
| 815 | [modelcontextprotocol/rust-sdk](https://github.com/modelcontextprotocol/rust-sdk) | 4k | [«Proposal: keyless Parallel Search MCP client example»](https://github.com/modelcontextprotocol/rust-sdk/issues/1332) | НЕ ВХОДИМ: тикет = foreign-promo (Parallel Search); rust-sdk как репо — см. статус (SDK-пилот) |
| 818 | [parcadei/Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3) | 3.9k | [«PreToolUse:Bash hook - OPC script directory guard»](https://github.com/parcadei/Continuous-Claude-v3/issues/148) | НЕ ВХОДИМ: stale (февраль, 0 комм.) |
| 853 | [stravu/crystal](https://github.com/stravu/crystal) | 3.1k | (Crystal is now Nimbalyst) Run multiple Codex and Claude Code AI sessions in parallel git workt |
| 861 | [rohitg00/pro-workflow](https://github.com/rohitg00/pro-workflow) | 2.9k | Claude Code learns from your corrections: self-correcting memory that compounds over 50+ sessio |
| 864 | [Windy3f3f3f3f/claude-code-from-scratch](https://github.com/Windy3f3f3f3f/claude-code-from-scratch) | 2.8k | Build your own Claude Code from scratch.  🔍 Claude Code 开源了 50 万行代码，读不动？用 ~5000 行 TypeScript / |
| 873 | [Piebald-AI/tweakcc](https://github.com/Piebald-AI/tweakcc) | 2.6k | Customize Claude Code's system prompts, create custom toolsets, input pattern highlighters, the |
| 883 | [nizos/tdd-guard](https://github.com/nizos/tdd-guard) | 2.4k | Automated TDD enforcement for Claude Code |
| 895 | [xiufengsun/TokenTracker](https://github.com/xiufengsun/TokenTracker) | 2.1k | Local-first AI token usage & cost tracker for 31 coding tools incl. Claude Code, Codex, Cursor, |
| 906 | [nimbalyst/nimbalyst](https://github.com/nimbalyst/nimbalyst) | 2k | Nimbalyst - The open-source visual workspace for Claude Code, Codex, and OpenCode. Run multiple |
| 913 | [BayramAnnakov/claude-reflect](https://github.com/BayramAnnakov/claude-reflect) | 1.8k | A self-learning system for Claude Code that captures corrections, positive feedback, and prefer |
| 931 | [ariacom/Seal-Report](https://github.com/ariacom/Seal-Report) | 1.6k | Database Reporting Tool and Tasks (.Net) |
| 973 | [ChristopherKahler/paul](https://github.com/ChristopherKahler/paul) | 1.3k | Plan-Apply-Unify Loop — Structured AI-assisted development for Claude Code. Quality over speed- |
| 992 | [panxunying/ai-coding-welfare](https://github.com/panxunying/ai-coding-welfare) | 1.2k | AI Coding 福利站导航：免费白嫖 Claude Code / Codex 的中转站与公益站合集，含额度、模型、价格自动更新与一键配置脚本 |
| 995 | [huangjia2019/claude-code-engineering](https://github.com/huangjia2019/claude-code-engineering) | 1.1k | This repository demonstrates how to use Claude Code to do real engineering work, not just writi |
| 1001 | [ZeroDayEvil/ai-security-tool](https://github.com/ZeroDayEvil/ai-security-tool) | 1.1k | 🛡️ Free open-source AI-powered security terminal & vulnerability scanner (CVE, SBOM). Supports |
| 1004 | [stackql/stackql](https://github.com/stackql/stackql) | 1.1k | Query, provision and operate Cloud, SaaS, API and Model Context Protocol (MCP) resources throug |
| 1013 | [lucasrosati/claude-code-memory-setup](https://github.com/lucasrosati/claude-code-memory-setup) | 1k | Up to 71.5x fewer tokens per session on Claude Code with Obsidian + Graphify. Persistent memory |
| 1037 | [deedy/mac_computer_use](https://github.com/deedy/mac_computer_use) | 0.9k | A fork of Anthropic Computer Use that you can run on Mac computers to give Claude and other AI  |
| 1050 | [perrypixel/10x-Tool-Calls](https://github.com/perrypixel/10x-Tool-Calls) | 0.9k | 10x-Tool-Calls is a lightweight rules file designed to help you maximize the value of your mont |
| 1054 | [Haervwe/open-webui-tools](https://github.com/Haervwe/open-webui-tools) | 0.8k | Open‑WebUI Tools is a modular toolkit designed to extend and enrich your Open WebUI instance, t |
| 1056 | [rootSunc/CNEquity](https://github.com/rootSunc/CNEquity) | 0.8k | 中国 A 股数据基础设施。55个日更数据集：股票行情、基本面、期货数据、资金面、公告事件、指数行业、宏观与风险。行级溯源、PIT 语义、复权与历史成分内置，MCP 原生。自托管，零注册、零  |
| 1057 | [context-space/context-space](https://github.com/context-space/context-space) | 0.8k | Ultimate Context Engineering Infrastructure, starting from MCPs and Integrations |

## MCP-серверы (5) — заход: пин контракта + верифицируемый бейдж

| # | Репо | ★ | Боль (ссылка) / что это | Вердикт: входим? |
|---|---|---|---|---|
| 1046 | [utensils/mcp-nixos](https://github.com/utensils/mcp-nixos) | 0.9k | MCP-NixOS - Model Context Protocol Server for NixOS resources |
| 1070 | [xichan96/dinotty](https://github.com/xichan96/dinotty) | 0.7k | Multi-device terminal server for AI coding agents. Server-side VTE, session persistence, file b |
| 1073 | [0xK3vin/MegaMemory](https://github.com/0xK3vin/MegaMemory) | 0.7k | Persistent project knowledge graph for coding agents. MCP server with semantic search, in-proce |
| 1098 | [Hacker-Valley-Media/Interceptor](https://github.com/Hacker-Valley-Media/Interceptor) | 0.6k | Browser automation and computer use for AI agents. One CLI and MCP server for your signed-in br |
| 1105 | [1mcp-app/agent](https://github.com/1mcp-app/agent) | 0.5k | A unified Model Context Protocol server implementation that aggregates multiple MCP servers int |

---

**Сводка волны 8:** 362 цели; 66 болевых ссылок; категории: Кураторы/гайды 38 · Инфраструктура 29 · Skills-вселенные 51 · Клиенты/агенты 214 · Прочее AI-инструментальное 25 · MCP-серверы 5.

**ИТОГО ПО 8 ВОЛНАМ: 1182 ЦЕЛИ. Пул ≥500★ исчерпан.**