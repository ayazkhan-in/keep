import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cron from 'node-cron';
import app, {
  getReceiptFallback,
  serverReceiptRegistry,
  clearServerReceiptRegistry,
} from './src/server/api';

const PORT = 3000;

// Daily Automated Background Cron Job (Runs every day at 09:00 AM)
cron.schedule('0 9 * * *', () => {
  console.log('[Keepr Warranty Intelligence] Running daily automated warranty expiry scan...');
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Keepr server listening on http://localhost:${PORT}`);
  });
}

startServer();

export { app, getReceiptFallback, serverReceiptRegistry, clearServerReceiptRegistry };
export default app;
