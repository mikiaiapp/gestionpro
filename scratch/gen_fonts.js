const fs = require('fs');
const path = require('path');

try {
    const reg = fs.readFileSync('NatashawalkerRegular-lgede.ttf').toString('base64');
    const bold = fs.readFileSync('NatashawalkerBold-vmevO.ttf').toString('base64');
    
    const content = `export const NATASHA_REGULAR = "${reg}";
export const NATASHA_BOLD = "${bold}";
`;
    
    fs.writeFileSync('src/lib/fonts.ts', content);
    console.log('Successfully generated src/lib/fonts.ts from TTF files');
} catch (err) {
    console.error('Error:', err.message);
}
