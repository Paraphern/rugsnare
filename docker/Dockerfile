# RugSnare MCP server — image for the Docker MCP Catalog.
# Read-only agent tool: public drift-feed status + local pin store report.
# Zero npm dependencies; runs on plain Node.
FROM node:22-alpine

WORKDIR /app
COPY product/src ./src

# no install step: the whole point of rugsnare is zero dependencies
ENTRYPOINT ["node", "src/mcp-server.js"]
