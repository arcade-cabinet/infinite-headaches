const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/babel-plugin-reactylon/build/index.js');

try {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const search = 'if (!sideEffectPaths)\n                                return;';
    const replace = 'if (!sideEffectPaths || !Array.isArray(sideEffectPaths))\n                                return;';
    
    // Simple string replace might fail if whitespace differs.
    // Use regex or more robust check.
    // The code I saw earlier:
    // const sideEffectPaths = constructorCoreSideEffectsMap[name];
    // if (!sideEffectPaths)
    //    return;
    
    // I'll search for the specific pattern.
    if (content.includes('if (!sideEffectPaths)')) {
        content = content.replace('if (!sideEffectPaths)', 'if (!sideEffectPaths || !Array.isArray(sideEffectPaths))');
        fs.writeFileSync(filePath, content);
        console.log('Successfully patched babel-plugin-reactylon');
    } else {
        console.log('Pattern not found in babel-plugin-reactylon, maybe already patched or version changed?');
    }
  } else {
    console.log('babel-plugin-reactylon not found, skipping patch');
  }
} catch (e) {
  console.error('Failed to patch babel-plugin-reactylon:', e);
}

