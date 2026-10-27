# llms-install.md - AI エージェント向けインストール手順

あなたは AI コーディングエージェントです。ユーザーから RugSnare のインストールを依頼されました。このドキュメントは実行手順書です。上から順番に実行し、各手順を検証して、最後に指定された形式で結果を報告してください。ここに記載されたコマンドを、独自の判断で別の方法に置き換えないでください。

## インストールするもの

RugSnare は、ユーザーが承認したすべての MCP サーバーについて、ツールの契約（名前 + 説明 + inputSchema、SHA-256）を固定し、サーバーがそれらを通知なく変更した場合に CI を失敗させます。開発用依存関係と CI のステップを 1 つ追加します。実行時依存関係はなく、テレメトリーも送信せず、ライセンスは Apache-2.0 です。

## ステップ 0 - 前提条件

1. Node.js 18 以降が必要です。`node --version` を実行してください。バージョンが古い場合は作業を停止し、ユーザーに伝えてください。
2. ユーザーの MCP 設定ファイルを探します。次の順番で確認し、見つかったものを報告してください。
   - リポジトリのルートにある `.mcp.json` または `mcp.json`（Cursor、VS Code、Windsurf、Cline、ZCode）
   - `.cursor/mcp.json`
   - `.claude.json` / Claude Desktop の設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json` または `%APPDATA%\Claude\claude_desktop_config.json`）
   - `.vscode/mcp.json`
3. 設定ファイルが複数ある場合は、どれを固定するかユーザーに確認してください。1 つもない場合は、新しく `.mcp.json` を作成するか尋ねてください。推測で決めてはいけません。

## ステップ 1 - インストール

設定ファイルを管理しているプロジェクト内で、次を実行します。

    npm install --save-dev rugsnare@1.5.0

バージョンは正確に固定してください。RugSnare 自体のアップグレードは意図的に判断して行います。これは、RugSnare が MCP サーバーに適用する規律と同じです。

## ステップ 2 - 承認済みの契約を固定する（信頼の基準点）

    npx rugsnare scan --config <config-file>

このコマンドは `.rugsnare/pins.json` を作成します。コミットする前に、次を行ってください。

- 各サーバー名と、固定されたツール数を含む概要をユーザーに提示します。
- ユーザーから明示的な承認を得てください。これらのハッシュはユーザーが承認する基準です。黙って固定したり、ユーザーが指定していない設定ファイルを固定したりしてはいけません。
- `.rugsnare/pins.json` を手作業で編集しないでください。

## ステップ 3 - 固定記録をコミットする

    git add .rugsnare/pins.json

コミットメッセージの例：`pin MCP tool contracts (rugsnare baseline)`。リポジトリに保護ルールが設定されている場合は、通常の PR 手順に従ってください。

## ステップ 4 - CI ゲートを設定する

`.github/workflows/rugsnare.yml` を作成します。

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

コミット済みの固定記録と比べてツールの契約に変更があると、`diff` は終了コード 1 を返します。人が再承認するまでビルドは失敗します。単に失敗させるのではなく、PR に人間が読みやすいコメントを投稿したい場合は、PR diff Action を使用してください：`Paraphern/rugsnare/action/pr-diff/action.yml@main`。

## ステップ 5 - 検証

    npx rugsnare diff --config <config-file>

期待される出力は `rugsnare diff: clean`、終了コードは 0 です。固定直後に変更が検出された場合、サーバーの動作が非決定的であるか、環境に依存している可能性があります。繰り返し固定し直すのではなく、その問題を報告してください。

## 任意 - 自分用に RugSnare を MCP サーバーとして起動する

RugSnare は読み取り専用の MCP サーバーとして動作します（ツール：`drift_feed_status` - 人気の MCP サーバーに関する公開ドリフトデータ、`pins_report` - ローカルの固定記録）。ユーザーから依頼された場合に限り、ユーザーの設定に追加してください。

    { "mcpServers": { "rugsnare": { "command": "npx", "args": ["rugsnare@1.5.0", "mcp"] } } }

## ユーザーへの報告

| 項目 | 値 |
| --- | --- |
| 固定した設定ファイル | パス |
| サーバーとツール数 | サーバーごと |
| 固定記録のコミット | はい/いいえ（コミットハッシュ） |
| CI ワークフロー | パス |
| 検証結果 | clean / drift |

## 絶対にしてはいけないこと

- `scan` より前に `diff` を実行しないでください（固定記録がなければ比較できません）。
- `.rugsnare/pins.json` を手動で編集したり、捏造したりしないでください。
- API キーやトークンをコミットしないでください。固定記録にはツール名、説明、schema ハッシュだけが含まれるため、安全にコミットできます。
- このインストール作業の一環として rugsnare や固定済み MCP サーバーをアップグレードしないでください。アップグレードは別途、明示的な判断のもとで行います。
