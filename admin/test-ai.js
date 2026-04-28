const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const TEST_PROMPT = "Write a one-sentence greeting for an electronics store.";

async function testGemini() {
    console.log('--- Gemini API Test ---');
    console.log('Testing with Key:', API_KEY ? (API_KEY.substring(0, 5) + '...') : 'MISSING');
    
    if (!API_KEY) {
        console.error('Error: GEMINI_API_KEY is missing in your .env file!');
        return;
    }

    try {
        console.log('\nStep 1: Listing Available Models (v1beta)...');
        const listResponse = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const models = listResponse.data.models || [];
        console.log('Available Models:', models.map(m => m.name.replace('models/', '')).join(', '));

        console.log('\nStep 2: Testing Text Generation (v1beta)...');
        // We'll try gemini-1.5-flash or the first available model that supports generation
        const targetModel = models.find(m => m.name.includes('gemini-1.5-flash'))?.name || models[0]?.name;
        console.log(`Using model: ${targetModel}`);

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${API_KEY}`,
            { contents: [{ parts: [{ text: TEST_PROMPT }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            console.log('\n✅ SUCCESS!');
            console.log('Gemini says:', text.trim());
        }
    } catch (error) {
        console.log('\n❌ ERROR:');
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(errorMsg);
        if (error.response?.data) {
             console.log('Detailed Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGemini();
