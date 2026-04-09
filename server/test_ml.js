import axios from 'axios';

async function testFix() {
    const url = 'https://samarthrr-revcode-ai-engine.hf.space/fix';
    console.log(`Testing ${url}...`);
    try {
        const res = await axios.post(url, { code: 'def helper():\n  pass' }, { timeout: 10000 });
        console.log('Success:', res.data);
    } catch (e) {
        console.error('Error:', e.response?.status, e.response?.data || e.message);
    }
}

testFix();
