const fs = require('fs');
const path = require('path');

const replacements = {
  // Colors
  '#7451f8': 'var(--color-primary)',
  '#282c34': 'var(--color-bg-dark-app)',
  '#61dafb': 'var(--color-secondary)',
  'rgb(154, 97, 109)': 'var(--color-admin)',
  '#111': 'var(--color-bg-dark)',
  'rgb(156, 156, 156)': 'var(--color-text-dark)',
  '#333': 'var(--color-border-dark)',
  '#999': 'var(--color-text-darker)',
  '#555': 'var(--color-text-gray)',
  '#7551f818': 'var(--color-primary-light)',
  // 'red': 'var(--color-red)', // Can be risky for words like margin: auto
  // 'white': 'var(--color-white)',
  // 'gray': 'var(--color-gray)',
  // 'lightgray': 'var(--color-light-gray)',
  
  // Font sizes
  '12px': 'var(--font-size-sm)',
  '14px': 'var(--font-size-md)',
  '16px': 'var(--font-size-base)',
  '20px': 'var(--font-size-lg)',
  '25px': 'var(--font-size-xl)',
  '10px': 'var(--font-size-xs)',
  '0.8rem': 'var(--font-size-xs-rem)',
  
  // Font weights
  ' 500;': ' var(--font-weight-medium);', // added padding to avoid replacing inside 5000px
  ' 300;': ' var(--font-weight-light);',
  ' bold;': ' var(--font-weight-bold);'
};

const wordReplacements = {
  'white': 'var(--color-white)',
  'red': 'var(--color-red)',
  'gray': 'var(--color-gray)',
  'lightgray': 'var(--color-light-gray)',
  'blueviolet': 'var(--color-blueviolet)'
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.css') || entry.name.endsWith('.scss'))) {
      if (entry.name === 'index.css') continue; // don't replace in index.css itself for now

      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      for (const [key, value] of Object.entries(replacements)) {
        // Safe regex for hex and px so it doesn't match a substring of a larger hex/px
        const regexStr = key.startsWith('#') || key.endsWith('px') || key.endsWith('rem') || key.includes('rgb') ? 
          key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zA-Z0-9])' : 
          key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(regexStr, 'g'), value);
      }

      // Words like red, white need word boundaries
      for (const [key, value] of Object.entries(wordReplacements)) {
        content = content.replace(new RegExp(`:\\s*${key}\\s*;`, 'g'), `: ${value};`);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Done.');
