import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    // Keep-alive interval for debugging
    setInterval(() => {
        console.log('Server heartbeat...');
    }, 10000);
});
