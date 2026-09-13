import app from './app.js';
import config from './config/env.js';

const PORT = config.server.port || 4000;

app.listen(PORT, () => {
    console.log(`PerfumeHub API server running at http://localhost:${PORT}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
});

