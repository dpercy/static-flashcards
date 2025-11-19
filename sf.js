// static flashcards

class Card {
    constructor(front, back) {
        this.front = front;
        this.back = back;
    }

    toString() {
        return `Q: ${this.front}\nA: ${this.back}`;
    }

    async hash() {
        return [...new Uint8Array(await crypto.subtle.digest('sha-1', new TextEncoder('utf-8').encode(this.toString())))].map(b => b.toString(16)).join('');
    }
}

function parseCards(text) { // -> [cards, errors]
    let cards = [];
    let errors = [];

    const paragraphs = text.split('\n\n').map(s => s.trim());
    for (const p of paragraphs) {
        let lines = p.split('\n');
        lines = lines.filter(line => !line.startsWith('#'));  // drop comments
        lines = lines.filter(line => !line.startsWith('<'));  // drop tags
        lines = lines.filter(line => line); // drop empty lines

        if (lines.length == 0) {
            // noop
        } else if (lines.length == 2 && lines[0].startsWith('Q: ') && lines[1].startsWith('A: ')) {
            // Q: front
            // A: back
            let [front, back] = lines;
            front = front.slice(3);
            back = back.slice(3);
            cards.push(new Card(front, back));
        } else {
            errors.push(lines.join('\n'));
        }
    }

    return [cards, errors];
}


// for browser
async function runApp() {
    let [cards, errors] = parseCards(document.body.innerHTML);
    console.log({ cards, errors });

    document.body.innerHTML = '';


    document.writeln(`
        <style>
        .card { border: 1px solid black; border-radius: 3px; margin: 1em; }
        .card .front { font-weight: bold; }
        .card .hash { color: gray; font-size: 0.75lh; }

        .error { border: 1px solid red; border-radius: 3px; margin: 1em; }
        </style>
        `);
    for (const card of cards) {
        document.writeln(`
            <div class="card">
                <div class="hash">${await card.hash()}</div>
                <div class="front">${card.front}</div>
                <div class="back">${card.back}</div>
            </div>
        `)
    }
    for (const error of errors) {
        document.writeln(`
            <div class="error">${error}</div>
        `)
    }
}

// for CLI
async function main() {
    const fs = require('fs');
    const process = require('process');

    const text = fs.readFileSync('index.html').toString();
    const [cards, errors] = parseCards(text);
    if (errors.length > 0) {
        console.error(`${errors.length} errors:`, errors);
        process.exit(1);
    }
}


if (typeof require !== 'undefined' && require.main === module) {
    main();
}
