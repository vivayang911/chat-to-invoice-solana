# English demo recording guide

Target: 2–4 minutes. This is a recording script, not a completed video.

## 0:00–0:25 — The problem

Custom orders change during a conversation. Quantities, printing and extra charges become difficult to track. Chat to Invoice turns accepted terms into an itemized statement for both parties to review.

Show the English conversation in Chrome. Identify participants as synthetic demo roles.

## 0:25–1:05 — Extract and calculate

The seller quotes three cup sizes and logo printing. The customer accepts 50 small cups, 20 medium cups, 30 large cups, and printing on all 100 cups. AI extracts the agreed items and links them to original messages. The program calculates 50 + 40 + 90 + 10 = 190 using integer arithmetic. Source matching does not guarantee correct interpretation; review remains necessary.

Show quantities, unit prices, subtotals and acceptance evidence.

## 1:05–1:40 — Confirm together

The seller and customer acknowledge the same fixed statement. Changes require review again. These local links do not verify identity. Both sides can inspect the exact public invoice Memo.

Hide address-bar fragments and confirmation-link fields in footage: they contain bearer access tokens.

## 1:40–2:15 — Wallet payment

The customer approves a payment in Phantom on Solana devnet. The application holds no wallet private key. This demo uses 190 valueless TEST USD tokens, not real dollars or USDC. The signed message must match the prepared transaction exactly.

Use genuine wallet footage only. If showing the existing receipt, say the payment was completed earlier; do not imply a new live payment.

## 2:15–2:50 — Verify the receipt

The server verifies finalized execution, buyer signature, token mint, amount, recipient balance increase and exact invoice Memo. The payment and four English invoice rows are in the same transaction. This proves the recorded payment, not delivery or product quality.

Existing verified transaction:
https://explorer.solana.com/tx/3TEpxsMjbVq5GB9MkPbxUns4om8RRJ9LmLdyi1xC4BKpLjVQXqicC3VQtY6mXXySMozzYT7MnEYzpejPvv8eQWXT?cluster=devnet

```text
CTI Invoice v2
Small cups: 50 x 1.00 = 50.00
Medium cups: 20 x 2.00 = 40.00
Large cups: 30 x 3.00 = 90.00
Logo print: 100 x 0.10 = 10.00
Total: 190.00 TEST USD
Hash: 2487a2ec31ae129d905e83c7f2f8c141fca1c21942830a30c8d5c71dd9770dce
```

## Provenance and boundaries

Built on the prior MIT-licensed PayPal Chat to Invoice project. Disclose reused chat analysis and confirmation components. New Solana work covers token setup, wallet signing, exact transfer reconciliation and public invoice Memos. Current build is a localhost prototype. Mainnet, identity verification, escrow, refunds and fulfilment verification are not implemented.
