import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { cancelAbandonedOrders } from './modules/orders/cleanup.js';

async function start() {
    await connectDB();
    const app = createApp();

    app.listen(env.port, () => {
        console.info(`Backend running on http://localhost:${env.port} (${env.nodeEnv})`);
    });

    // Check for abandoned orders every 5 minutes.
    setInterval(() => {
        cancelAbandonedOrders().catch((err) => console.error('Cleanup job failed:', err));
    }, 5 * 60 * 1000);
}

start();