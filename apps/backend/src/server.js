import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { cancelAbandonedOrders } from './modules/orders/cleanup.js';

async function start() {
    await connectDB();
    const app = createApp();

    // No host argument, deliberately: Node then binds to every interface
    // (0.0.0.0). Binding explicitly to localhost works locally but is
    // unreachable from outside on Render, where the container is only
    // reachable on 0.0.0.0 — a classic "deploys fine, every request times out".
    const server = app.listen(env.port, () => {
        console.info(`Backend listening on port ${env.port} (${env.nodeEnv})`);
    });

    // Render (and any platform that runs containers) sends SIGTERM before
    // SIGKILL when it stops or redeploys a service. Without a handler the
    // default action kills the process mid-request, so a customer can see a
    // failed payment or a half-saved order during every deploy.
    for (const signal of ['SIGTERM', 'SIGINT']) {
        process.on(signal, () => {
            console.info(`${signal} received — closing the server.`);
            server.close(() => process.exit(0));
            // Don't let a hung connection hold the deploy open indefinitely.
            setTimeout(() => process.exit(0), 10_000).unref();
        });
    }

    // Check for abandoned orders every 5 minutes.
    //
    // Logs the message only, never the whole error. A driver error carries the
    // full topology description — every server address, election id and socket
    // stack — so printing it on a timer buried the useful lines in noise.
    setInterval(() => {
        cancelAbandonedOrders().catch((err) =>
            console.error(`Cleanup job failed: ${err.message}`),
        );
    }, 5 * 60 * 1000);
}

start();