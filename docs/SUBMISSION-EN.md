# Encode submission — ready-to-paste English text

## Project name

Chat to Invoice — Solana

## Short description

Turn negotiated chat agreements into source-linked itemized statements, confirm the final terms together, and verify Solana devnet payment against a readable on-chain invoice.

## Challenge

Best Consumer App on Solana

## Project description

Custom-order sellers and customers often negotiate quantities, design changes and extra charges across several messages. A final transfer amount alone does not explain which terms were accepted. Chat to Invoice helps turn those accepted terms into a clear itemized statement before payment.

AI extracts the agreed items and links its conclusions to original messages. Deterministic integer arithmetic calculates quantities, unit prices and totals. Unresolved financial changes block the payable statement. The seller reviews the result, and separate demo role links acknowledge the same fixed version. These links do not verify customer identity.

Solana powers the payment and receipt. The customer approves an exact prepared transaction in Phantom on devnet. The transaction transfers the configured SPL test token and includes a human-readable Memo with item names, quantities, unit prices, subtotals, the total and the full confirmed-statement hash. The server verifies finalized execution, buyer signature, mint, amount, recipient balance increase and exact Memo before reporting PAID. Unknown submissions retain their original signature and cannot automatically be paid again.

The demonstrated custom-cup order contains 50 small cups at 1 USD, 20 medium cups at 2 USD, 30 large cups at 3 USD, and logo printing for 100 cups at 0.10 USD, totaling a quoted price of 190 USD. The actual devnet transfer is 190 valueless custom TEST USD tokens; it is not USD or USDC settlement. Fees use test SOL. The accepted payment is real devnet evidence, not a simulated success state.

This is a localhost prototype for negotiated custom orders, not a full marketplace. There is no mainnet settlement, escrow, refund service, identity verification or delivery verification. Public Memo contents require explicit review. Oversized invoices are blocked rather than silently shortened. The source contains 114 passing automated tests; RPC failure tests use injected responses and are distinct from the live devnet receipt.

Code provenance: shared chat analysis and acknowledgement components are reused from the author's MIT-licensed earlier PayPal Chat to Invoice project. This entry removes the old payment integration and adds Solana token setup, wallet signing, exact transfer reconciliation, readable on-chain invoices and recovery safeguards.

## Source repository

https://github.com/vivayang911/chat-to-invoice-solana

## Reproducible demo / test build

https://github.com/vivayang911/chat-to-invoice-solana/blob/main/docs/JUDGE-GUIDE.md

This is a setup guide for a runnable local build, not a publicly hosted application URL. If the form explicitly requires a hosted app, do not label this link as one.

## Live devnet receipt

https://explorer.solana.com/tx/3TEpxsMjbVq5GB9MkPbxUns4om8RRJ9LmLdyi1xC4BKpLjVQXqicC3VQtY6mXXySMozzYT7MnEYzpejPvv8eQWXT?cluster=devnet

## Demo video

https://www.youtube.com/watch?v=1vBvWRrbUAI

Final English demo link supplied by the project owner.

## YouTube title

Chat to Invoice — Solana | Negotiated Orders to On-Chain Receipts

## YouTube description

Chat to Invoice turns accepted chat terms into source-linked itemized statements and verifies their payment on Solana devnet.

This edited walkthrough uses real application screenshots and English synthesized narration. It shows a previously completed 190 TEST USD cup-order payment. No new payment or wallet approval is staged. TEST USD is a custom valueless devnet token, not USD or USDC. Transaction fees use test SOL.

Source and setup: https://github.com/vivayang911/chat-to-invoice-solana

Verified devnet transaction: https://explorer.solana.com/tx/3TEpxsMjbVq5GB9MkPbxUns4om8RRJ9LmLdyi1xC4BKpLjVQXqicC3VQtY6mXXySMozzYT7MnEYzpejPvv8eQWXT?cluster=devnet

Built for the Encode Solana Hackathon 2026, Best Consumer App on Solana challenge. MIT-licensed chat and acknowledgement components are reused from the author's previous project; the Solana payment and receipt work is described in the repository. This is a localhost prototype, not a production payment service.