const fs = require('fs');

const f1 = 'src/components/FlashDeals/FlashDeals.jsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/fd-/g, 'ld-');
fs.writeFileSync(f1, c1);

const f2 = 'src/components/FlashDeals/FlashDeals.css';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/\.fd-/g, '.ld-');
fs.writeFileSync(f2, c2);

console.log("Done");
