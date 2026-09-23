// src/app.jsx → app.js (JSX 변환). 사용: node build.js
const fs = require('fs');
const babel = require('@babel/core');
const src = fs.readFileSync(__dirname + '/src/app.jsx', 'utf8');
const out = babel.transformSync(src, { presets: [['@babel/preset-react', { runtime: 'classic' }]], compact: false, comments: false });
fs.writeFileSync(__dirname + '/app.js', out.code);
console.log('app.js', out.code.length, 'bytes');
