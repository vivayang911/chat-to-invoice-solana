# Render Devnet demo

In the Render Dashboard, create a Blueprint from this repository and select the
`render-demo` branch. The Blueprint requests one Free Node web service and one
Free PostgreSQL database in Oregon. Review the plan selection before applying it.

Enter `GROQ_API_KEY` in Render's secret field. Use the public Devnet merchant
address and legacy SPL test mint for `SOLANA_MERCHANT` and `SOLANA_TEST_MINT`.
The Blueprint links the database URL. Render supplies the public origin and
HTTP port. Use a separate database for the demo.

The server uses Postgres for statements, acknowledgements and payment records.
An advisory lock limits the demo to one active process per database. A deploy
that overlaps with the previous process may need to be retried after it stops.
The setup endpoints are disabled for the hosted demo. Analysis uses the
configured Groq key and is limited to one start per 15 seconds across visitors.

Open the assigned HTTPS URL with `/?lang=en`. In a fresh browser session, load
the example, analyze it, create a statement and confirm both roles. Check that
the buyer link uses the hosted origin. Test payment with a separate Phantom
Devnet buyer holding Devnet SOL and the configured test token. After finalization,
restart the service and query the same payment to verify persistence. The local
development instance and its stored statements are separate from the online demo.

The free web service can cold start after inactivity. Free Postgres expires
after 30 days. Confirm the demo is reachable before submitting its URL.
