async function testPost() {
    console.log('Sending POST to http://localhost:3000/api/auth/register...');
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'test_node_final',
                email: 'node_final_' + Date.now() + '@test.com',
                password: 'password123'
            })
        });
        
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testPost();
