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

// Write the compiled UI (no changes needed, API key stays on server)
fs.writeFileSync('./ui-compiled.html', uiHtml);

console.log('✓ TypeScript compiled to code.js');
console.log('✓ UI compiled successfully');
console.log('✓ Build complete!');
console.log('');
console.log('⚠️  Remember to start the proxy server:');
console.log('   npm run proxy');