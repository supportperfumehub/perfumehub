const fs = require('fs');
const path = 'c:/Users/LENOVO/OneDrive/Documents/perfumehub/server.log';

try {
    const content = fs.readFileSync(path, { encoding: 'utf16le' });
    const lines = content.split('\n');
    console.log(`Log has ${lines.length} lines.`);
    
    // Search for Labbra
    const matches = lines.filter(l => l.includes('Labbra') || l.includes('Honey Bunny'));
    if (matches.length > 0) {
        console.log('--- FOUND MATCHES IN LOG ---');
        console.log(matches.slice(-10).join('\n'));
    } else {
        console.log('No matches for Labbra or Honey Bunny in log.');
    }
} catch (e) {
    console.error('Error reading log:', e.message);
}
