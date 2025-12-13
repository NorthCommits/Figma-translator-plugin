const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

// Automatically use Windows certificate store (fixes corporate SSL issues)
try {
  require('win-ca');
  console.log('✓ Windows Certificate Store loaded');
} catch (err) {
  console.warn('⚠ win-ca not available (not Windows or not installed)');
}

const app = express();
app.use(cors());
app.use(express.json());

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error('❌ Error: DEEPL_API_KEY not found in .env file');
  console.error('Please create a .env file with your DeepL API key');
  process.exit(1);
}

app.post('/translate', async (req, res) => {
  try {
    const { text, target_lang } = req.body;
    
    if (!text || !target_lang) {
      return res.status(400).json({ error: 'Missing text or target_lang parameter' });
    }

    const formData = new URLSearchParams();
    formData.append('auth_key', DEEPL_API_KEY);
    formData.append('text', text);
    formData.append('target_lang', target_lang);

    console.log(`Translating to ${target_lang}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API Error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log(`✓ Translation successful`);
    res.json(data);
  } catch (error) {
    console.error('Translation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DeepL Proxy Server is running',
    hasApiKey: !!DEEPL_API_KEY
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  DeepL Translation Proxy Server');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Server running on: http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  Translation endpoint: POST /translate`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});