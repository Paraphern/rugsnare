# Reddit Post 1 (r/mcp, [Showcase]) - lightning-wallet-mcp sportsbook case (2026-10-07)

**Title:**

[Showcase] A minor update quietly turned an AI agent's Lightning wallet into a sportsbook

**Body:**

*Disclosure: I'm the author of RugSnare, the open source tool that caught this. It pins MCP tool contracts and diffs them on update - zero npm dependencies, no telemetry, repo at the bottom. Everything below reproduces with the commands at the end.*

lightning-wallet-mcp is a Lightning wallet for AI agents. Payments, invoices, L402/x402 micropayments - the plumbing you want when your agent needs to pay for things. 2,351 installs last month (155 last week, per the npm registry), 7,827 total since February.

On September 22 it shipped 1.8.0. A minor bump, 54 -> 59 tools. The five new ones teach your agent how to bet its own balance on sports and BTC price.

Two weeks later it's still the latest version. 553 people have installed it since the betting arrived. I caught it in a scan this weekend and verified every quote below today, October 7th.

## What this package is and why anyone runs it

Agents increasingly pay for stuff: API calls behind x402/L402 paywalls, Lightning invoices, pay-per-use services. This package is the wallet for that. You give your agent a balance and tools like pay_invoice, create_invoice, pay_lightning_address, keysend. The pitch is payments. It works with Claude Code, Cursor, whatever client you run. Legit category, real demand.

Nobody installs it to gamble.

## What showed up in the contract

Five new tools, verbatim from the 1.8.0 contract your agent reads:

> prediction_markets: "list sat-denominated markets (sports, BTC price) you can bet on for your operator."

> prediction_place_bet: "back yes or no on a market with sats from your agent balance. The stake counts toward the agent budget; winnings and refunds return to the agent balance when the market settles."

That second quote is the whole story. The betting stake IS the agent budget. And the description is a full tutorial: read prediction_market right before betting, pass expected_odds_pct and line_version so you're "never filled at a different price", one idempotency_key per bet. Someone wrote careful agent-facing betting UX.

Same release: register_webhook got a BREAKING schema change. In a minor.

## The part that made me stop and stare

"For your operator." The tools distinguish agent keys and operator keys. prediction_positions: "With an operator key it aggregates across all of your agents."

So the model here: an operator runs agents, each agent has a betting balance, the operator watches aggregate positions across the fleet. That's not a wallet feature. That's a betting operation with extra steps.

Also: prediction_markets ends with a link to https://lightningfaucet.com/prediction-markets/ - the publisher's own commercial betting site. The wallet vendor is the bookmaker. Your payment rail ships with a built-in client for the vendor's sportsbook, and your agent is the customer.

Here's the detail that got me the most. The wallet ships a pre-payment policy hook - a spending control, the right instinct. The 1.8.0 README says it plainly: "the pre-payment policy hook does not run for bets (they are internal transfers, like arena buy-ins); use set_budget to cap what an agent can stake." The one approval gate this wallet has does not cover betting. The only ceiling is the agent budget.

(And it's not their first rodeo. Version 1.6.1, published September 11, had zero gambling tools - I checked the sources. A casino arrived September 15 in 1.7.0: 8 arena_* dice tools. The sportsbook landed September 22 in 1.8.0. Two gambling expansions in seven days, both shipped as minor bumps.)

## To be fair, this one is documented

The 1.8.0 README openly describes Prediction markets, and the publisher's docs go further: "You build and fund the agent, set its budget, and it backs yes or no from its own balance." Their main site is a faucet, a casino and a sportsbook, with a whole section on building agents that plug into it. Nobody hid anything, and I'm not calling it malicious - it's a business model, written down at every layer. That's exactly what bothers me more.

The user who installed a payments wallet in 1.7.0 got a gambling client as a "minor update". Nobody asked them again. The only question that matters - "should my agent be able to bet its balance on sports?" - was answered by the publisher, silently, via npm.

If the honest, documented changes arrive like this, what does the dishonest path look like?

## Who gets hurt

The agent budget is real money. It pays for API calls today, and after this update it can be staked on tonight's game - by the agent itself, following tool descriptions that actively teach it how. Whether that's a bug or a feature depends on who owns the sats.

And in multi-agent setups the operator view aggregates every agent's bets. Nice for the operator. The agents' owners might want a word.

## Check it yourself

npm i -g rugsnare

mkdir lightning-check && cd lightning-check
npm i --ignore-scripts lightning-wallet-mcp@1.7.0

save this as mcp.json in that folder (rugsnare talks to servers through a config):

{
  "mcpServers": {
    "lightning-wallet": {
      "command": "node",
      "args": ["node_modules/lightning-wallet-mcp/dist/index.js"]
    }
  }
}

rugsnare scan --config mcp.json
npm i --ignore-scripts lightning-wallet-mcp@1.8.0
rugsnare diff --config mcp.json

exit 1, 6 findings: 5 NEW prediction_* tools plus a BREAKING schema change on register_webhook. 54 tools become 59.

Same pin-then-diff works on any MCP package you depend on. That's the whole idea.

(Same scan also caught an SSH server whose patch release deleted "Requires confirmation" from 48 destructive tools. That one deserves its own post.)

Repo (Apache-2.0, runs locally): https://github.com/Paraphern/rugsnare
