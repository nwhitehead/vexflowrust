
import _ from "./src/wrap.js";

const word = 'world';
console.log(`Hello, ${word}!`);

const c = new DrawContext(1024, 800);
c.font = '30pt Bravura';
console.log(c.font);
c.fillText(0xe050, 100, 120, 350.0, 1);
c.fillText('a'.charCodeAt(0), 400, 120, 150.0, 0);
c.beginPath();
c.moveTo(400, 100);
c.lineTo(200, 400);
c.stroke();
c.save('image.png');
