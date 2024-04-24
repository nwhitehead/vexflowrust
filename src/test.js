
import _ from "./src/wrap.js";

const word = 'world';
console.log(`Hello, ${word}!`);
assert(true, 'hi');

const c = new DrawContext(1024, 800);
c.font = '30pt Bravura';
console.log(c.font);
c.fillText(0xe050, 100, 120, 30.0, 1);
c.fillText('a'.charCodeAt(0), 400, 120, 150.0, 0);
c.beginPath();
c.moveTo(400, 100);
c.lineTo(200, 400);
c.stroke();
c.save('image.png');

const el = document.createElement('span');
el.style.font = "30pt Bravura,default";
console.log(JSON.stringify(el.style.font));

console.log(JSON.stringify(c.measureText(0xe050, 30.0, 1)));