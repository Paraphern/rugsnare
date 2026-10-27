# B4: topics на репо Paraphern/rugsnare

Одна команда (дисциплина: topics - разрешённое исключение в «не менять продукт»):

```
gh repo edit Paraphern/rugsnare --add-topic mcp --add-topic mcp-server --add-topic security --add-topic supply-chain --add-topic ai-agents --add-topic mcp-security --add-topic agent-security
```

GitHub-лимит: до 20 topics. Текущие topics проверить перед добавлением:
`gh repo view Paraphern/rugsnare --json repositoryTopics --jq '.repositoryTopics[].name'`

Дискавери-эффект: github/topics/mcp-security и /agent-security - страницы, куда мы сейчас не попадаем.
