import { JSDOM } from 'jsdom';

console.log("Hello");
const jsdom = new JSDOM();
let span = jsdom.window.document.createElement('span');
console.log(span);
span.style.font = "12pt Arial,Lato";
console.log(span.style.fontSize);
