// Example patch for apps/api/src/main.ts.
// Add this before app.listen(...). Keep your existing setup.

const allowedOrigins = (process.env.NOTARY_WIDGET_ALLOWED_ORIGINS ?? 'http://localhost:3000,https://kydex.me')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.enableCors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by KYDEX CORS: ${origin}`), false);
  },
  allowedHeaders: ['content-type', 'authorization', 'x-kydex-notary-key', 'x-kydex-sync-token'],
  methods: ['GET', 'POST', 'OPTIONS'],
});
