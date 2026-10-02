════════════════════════════════════════════════════
X-THREAD: запостить ПОСЛЕ npm-паблиша (20:05 МСК)
Картинка: content/poisoning-card.png (прикрепить к твиту 1)
Ссылки: rugsnare.com работает, но добавьте ?v=3 для свежей OG-карточки
(или просто github.com/Paraphern/rugsnare — карточка у GitHub всегда свежая)
════════════════════════════════════════════════════

TWEET 1 (с картинкой poisoning-card.png):

We diffed every release of the 4 official MCP servers.

52 version pairs. 74 silent contract changes. Not one announced.

34 broke schemas. 24 flipped behavioral hints. 10 new tools appeared that nobody approved.

Your agent obeys tool descriptions. Nobody was watching them change. 🧵

---

TWEET 2:

The worst single step: filesystem 2025.8.21→11.25 changed ALL 14 tool contracts simultaneously.

Memory's history carries 18 schema-level breaks — including every delete_* tool at once.

Full report with every version number + one-command repro:
github.com/Paraphern/rugsnare/blob/main/repro/SILENT-CHANGES-REPORT.md

---

TWEET 3:

This isn't theoretical.

Three real MCP poisonings already happened:
1. postmark-mcp (npm): every agent email BCC-d to an attacker
2. Fake Oura MCP: StealC stole crypto wallets via 5 fake GitHub accounts
3. WhatsApp rug pull: tool description swapped AFTER approval

Receipts: github.com/Paraphern/rugsnare/pull/3

---

TWEET 4:

I built RugSnare to close this gap:
- Pin what you approved (CI gate, exit 1 on drift)
- Catch mid-session swaps (live proxy quarantines)
- Replay real calls before upgrading (canary)

Zero npm deps. No telemetry. Apache-2.0.

npx rugsnare init

---

TWEET 5 (optional, если хорошо заходит):

The 3 real attacks + why keyword heuristics miss them (and what does catch them):

github.com/Paraphern/rugsnare/blob/main/FIELD-REPORT.md

(Disclosure: I maintain RugSnare. Every number in this thread is reproducible on your machine in ~20 minutes.)

════════════════════════════════════════════════════
ПРАВИЛА:
- Твит 1 — с картинкой, это цепляет в фиде
- Не постите все 5 сразу — твит 1, подождите 15 мин, твит 2, и т.д.
- Если кто-то ответит — отвечайте лично, не твитом
- ?v=3 к rugsnare.com если нужен свежий OG-превью
════════════════════════════════════════════════════
