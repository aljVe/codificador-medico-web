const fs = require('fs');

// Create a dummy DOM
const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="resultsContainer"></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

// Load files
const dataCode = fs.readFileSync('C:/Users/aleja/Desktop/Programas hospital/Codificador médico/data.js', 'utf8');
const appCode = fs.readFileSync('C:/Users/aleja/Desktop/Programas hospital/Codificador médico/app.js', 'utf8');

// evaluate
eval(dataCode);
eval(appCode);

// test
try {
    handleSearch('les');
    const container = document.getElementById('resultsContainer');
    console.log("MATCH COUNT FOR 'les':", container.children.length);
    for (let child of container.children) {
        console.log(" -", child.querySelector('.result-title').textContent);
    }
} catch (e) {
    console.error(e);
}
