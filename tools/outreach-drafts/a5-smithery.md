# A5: Smithery - runbook

Правила (smithery.ai/docs/build/publish, 2026-10-22): публикация через @smithery/cli, нужен аккаунт Smithery (WorkOS: GitHub или email). Бесплатно; автоматический скан при публикации.

## РАСХОЖДЕНИЕ с handoff
В smithery/ НЕТ готового .mcpb (там manifest.json, package.json, server/, icon.png). Перед публикацией собрать бандл.

## Шаги

1. Собрать .mcpb: `cd smithery && npx mcpb pack` (CLI из спеки MCPB; проверит manifest и запакует server/). Если pack ругается на структуру - сравнить с mcpb init-шаблоном.
2. `npm i -g @smithery/cli`
3. `smithery login` - ТОЧКА ЮЗЕРА: нужен аккаунт smithery.ai (вход через GitHub).
4. `smithery mcp publish ./rugsnare-1.5.0.mcpb -n @paraphern/rugsnare`
5. Smithery просканирует сервер (tools/prompts/resources нашего mcp-режима: read-only статус drift-feed + pin store report). Если скан упадёт - проверит server-card fallback (/.well-known/mcp/server-card.json в манифесте).
6. После публикации: Settings - Verification checklist (official-vendor) - заполнить позже.
7. Обновлять .mcpb на каждый релиз (добавить в релизный чек-лист).

## Заметка
Имя пакета: @paraphern/rugsnare (organization namespace) - согласовать с желаемым отображением в их каталоге.
