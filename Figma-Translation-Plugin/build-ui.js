const fs = require('fs');
require('dotenv').config();

// Check if API key exists
if (!process.env.DEEPL_API_KEY) {
  console.error('❌ Error: DEEPL_API_KEY not found in .env file');
  console.error('Please create a .env file with your DeepL API key:');
  console.error('DEEPL_API_KEY=your-key-here');
  process.exit(1);
}

// Read the original ui.html
let uiHtml = fs.readFileSync('./ui.html', 'utf8');

// Inject the API key into the HTML
const apiKeyScript = `
<script>
  // API Key injected at build time
  const DEEPL_API_KEY = '${process.env.DEEPL_API_KEY}';
</script>
`;

// Insert the script before the closing </head> tag
uiHtml = uiHtml.replace('</head>', `${apiKeyScript}</head>`);

// Write the compiled UI
fs.writeFileSync('./ui-compiled.html', uiHtml);

console.log('✓ TypeScript compiled to code.js');
console.log('✓ UI compiled with DeepL API key injected');
console.log('✓ Build complete!');