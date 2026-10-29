process.env.PAYMENT_MODE='solana';
process.env.PORT ||= '4188';
process.env.MODEL_PROVIDER ||= 'groq';
const {createApp}=await import('../src/server.mjs');
const port=Number(process.env.PORT);
createApp({port,paymentMode:'solana'}).listen(port,'127.0.0.1',()=>console.log(`Chat to Invoice — Solana DEVNET: http://127.0.0.1:${port}/?lang=zh (test assets only)`));
