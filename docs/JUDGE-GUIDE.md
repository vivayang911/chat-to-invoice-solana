# Reviewer guide

1. Install Node.js 22+ (24 recommended for the Windows proxy launcher).
2. Extract the source archive and run `npm ci`, then `npm test`.
3. Create `work/`. Copy the Groq and Solana environment examples there, removing `.example` from their names. Supply your own model key and public devnet configuration.
4. Run `npm run check:setup`. Missing configuration must be reported; this check makes no model or blockchain request.
5. On Windows run `npm start`; on other platforms use `npm run start:direct`.
6. Open `http://127.0.0.1:4188/?lang=en` in Chrome with Phantom on devnet.

Payment requires a separate buyer and merchant, buyer test SOL, and a legacy SPL test mint with 2–9 decimals and no freeze authority. TEST USD has no real value. Never enter wallet private keys or seed phrases. Do not repeat token initialization or payment simply to show an existing receipt.

Expected flow: synthetic chat → source-linked extraction → integer totals → item review → separate acknowledgements → public Memo review → wallet approval → finalized transaction query → PAID.

Current automated acceptance: the current passing test count printed by `npm test`. Payment tests use injected RPC responses; separate live receipt evidence and narration are in [DEMO-EN.md](DEMO-EN.md).

The server binds to localhost. Confirmation links are for the same computer and do not verify identity. Public Memo is limited to 500 UTF-8 bytes; oversized invoices are rejected without omitting rows. No automatic repayment of uncertain transactions is offered.

The public Solana repository, completed English video and Encode submission remain separate delivery tasks. This guide does not claim they are complete.
