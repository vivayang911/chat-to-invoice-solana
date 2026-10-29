# Chat to Invoice — Solana

A consumer prototype for negotiated custom orders: chat to itemized statement, separate acknowledgements, and verified Solana devnet payment with a readable invoice Memo.

## Demo video

https://www.youtube.com/watch?v=1vBvWRrbUAI

English edited walkthrough, approximately 2 minutes 53 seconds. Demonstration uses valueless devnet TEST USD; no real funds.

## Start

Node.js 22+ (24 recommended). Run `npm ci`, create `work/`, and copy `groq-model.env.example` and `solana.env.example` there without the `.example` suffix. Supply your own model key and public devnet addresses. Never enter wallet private keys or seed phrases.

Run `npm run check:setup`, then `npm start` on Windows or `npm run start:direct` elsewhere. Open http://127.0.0.1:4188/?lang=en in Chrome with Phantom configured for devnet. Chinese trial: `?lang=zh`.

The buyer needs test SOL and the configured legacy SPL test token. Merchant and buyer must differ. Mint decimals must be 2–9, with no freeze authority. `/setup` provisions a new independent test mint with user wallet approval; do not repeat setup or payment to display an existing receipt.

## Price versus payment

USD is the agreed product quotation. The demo maps each quoted USD to one valueless custom TEST USD token; this is not USD or USDC settlement or an exchange rate. Test SOL pays transaction fees. No mainnet funds are involved.

## Verification

`npm test` runs source validation, arithmetic, acknowledgement, devnet transaction and recovery tests. `npm run build:wallet` rebuilds the locally served bundle. `python scripts/package-solana.py` builds an allowlisted source archive without local keys or runtime state.

An actual four-row English cup invoice totaling 190 TEST USD has completed devnet payment with a readable Memo. Tests also inject RPC results for failure, timeout, restart and duplicate submission paths. See docs/JUDGE-GUIDE.md and docs/DEMO-EN.md. The English MP4 in local releases is an edited screenshot walkthrough, not continuous wallet footage.

## Constraints

Localhost only; do not expose this server publicly. Acknowledgement links do not verify identity. Item names and amounts in a Memo become public. The 500 UTF-8 byte Memo and 1232 byte transaction limits are enforced without dropping items. Unknown submissions must be queried, not automatically repaid. No escrow, refunds or delivery verification. The independent public source repository is https://github.com/vivayang911/chat-to-invoice-solana . The demo video link is provided above. Encode submission remains pending confirmation.

## License and provenance

MIT license retained. Shared chat-analysis and acknowledgement components derive from the author's prior PayPal project: https://github.com/vivayang911/chat-to-invoice . This build removes its payment APIs, invoice-sending UI, email-recipient rules and provider-specific scripts. New work includes Solana setup, wallet signing, transfer reconciliation and public invoice Memos. Disclose code reuse in the competition entry.