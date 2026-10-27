# llms-install.md - AI 代理安装说明

你是一名 AI 编程代理。用户要求你安装 RugSnare。本文档是你的操作手册：请从上到下执行，验证每一步，并按照文末指定的格式汇报结果。不要自行改用其他命令或方案。

## 要安装的内容

RugSnare 会固定用户已批准的每个 MCP 服务器的工具契约（名称 + 描述 + inputSchema，使用 SHA-256 哈希），并在服务器静默更改这些内容时使 CI 检查失败。它是一个开发依赖，外加一个 CI 步骤。没有运行时依赖，不收集遥测数据，采用 Apache-2.0 许可证。

## 步骤 0 - 前置条件

1. Node.js 版本必须为 18 或更高：运行 `node --version`。如果版本较低，请停止并告知用户。
2. 查找用户的 MCP 配置文件。按以下顺序检查，并报告找到的文件：
   - 仓库根目录中的 `.mcp.json` 或 `mcp.json`（Cursor、VS Code、Windsurf、Cline、ZCode）
   - `.cursor/mcp.json`
   - `.claude.json` / Claude Desktop 配置文件（`~/Library/Application Support/Claude/claude_desktop_config.json` 或 `%APPDATA%\Claude\claude_desktop_config.json`）
   - `.vscode/mcp.json`
3. 如果存在多个配置文件，请询问用户要固定哪一个。如果一个也没有，请询问用户是否要从头创建 `.mcp.json`。绝不能猜测。

## 步骤 1 - 安装

在包含该配置文件的项目中运行：

    npm install --save-dev rugsnare@1.5.0

固定使用确切版本。升级 RugSnare 本身必须是经过明确决定的操作；它遵循自己对 MCP 服务器所执行的同样纪律。

## 步骤 2 - 固定已批准的契约（信任锚点）

    npx rugsnare scan --config <config-file>

此命令会写入 `.rugsnare/pins.json`。提交之前：

- 向用户展示摘要：每个服务器的名称及其已固定的工具数量。
- 取得用户的明确确认。这些哈希值是用户批准的基准；绝不能在未告知用户的情况下固定，也不能固定用户未指定的配置文件。
- 不要手动编辑 `.rugsnare/pins.json`。

## 步骤 3 - 提交固定记录

    git add .rugsnare/pins.json

建议的提交信息：`pin MCP tool contracts (rugsnare baseline)`。如果仓库启用了保护规则，请遵循正常的 PR 流程。

## 步骤 4 - 配置 CI 检查

创建 `.github/workflows/rugsnare.yml`：

    name: rugsnare
    on: [pull_request]
    jobs:
      contract-diff:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: 22 }
          - run: npm ci
          - run: npx rugsnare diff --config <config-file>

当任意工具的契约相对于已提交的固定记录发生变化时，`diff` 会以退出码 1 结束，因此在人工重新批准之前，构建会失败。如果希望在 PR 中收到易读的评论，而不是只看到失败状态，可以使用 PR diff Action：`Paraphern/rugsnare/action/pr-diff/action.yml@main`。

## 步骤 5 - 验证

    npx rugsnare diff --config <config-file>

预期输出：`rugsnare diff: clean`，退出码为 0。如果刚刚固定契约就立即检测到变化，说明服务器具有非确定性或依赖环境；请报告该问题，不要反复重新固定。

## 可选 - 将 RugSnare 作为 MCP 服务提供给自己

RugSnare 可以作为只读 MCP 服务器运行（工具：`drift_feed_status` - 热门 MCP 服务器的公开漂移数据；`pins_report` - 本地固定记录存储）。只有在用户提出要求时，才将其添加到用户的配置中：

    { "mcpServers": { "rugsnare": { "command": "npx", "args": ["rugsnare@1.5.0", "mcp"] } } }

## 向用户汇报

| 项目 | 值 |
| --- | --- |
| 已固定的配置 | 路径 |
| 服务器及工具数量 | 每个服务器分别列出 |
| 已提交固定记录 | 是/否（提交哈希） |
| CI 工作流 | 路径 |
| 验证结果 | clean / drift |

## 禁止事项

- 绝不能在 `scan` 之前运行 `diff`（没有固定记录就没有可比较的内容）。
- 绝不能手动编辑或伪造 `.rugsnare/pins.json`。
- 绝不能提交 API 密钥或令牌；固定记录只包含工具名称、描述和 schema 哈希，可以安全提交。
- 安装过程中绝不能升级 rugsnare 或已固定的 MCP 服务器。升级必须作为单独且经过明确决定的步骤执行。
