// static flashcards

async function hash(str) {
    const utf8Bytes = new TextEncoder('utf-8').encode(str);
    const hashBytes = new Uint8Array(await crypto.subtle.digest('sha-1', utf8Bytes));
    const hashStr = [...hashBytes].map(b => b.toString(16)).join('');
    return hashStr;
}

// Choose one item pseudorandomly, different for each day.
// 
async function pick(items, today) { // -> item
    console.log('picking', items, today);

    const hashes = [];
    for (const item of items) {
        console.log('hash input', item, today + JSON.stringify(item));
        hashes.push(await hash(today + JSON.stringify(item)));
        console.log('hash', hashes.slice(-1)[0]);
    }

    let minHash = hashes[0];
    let minItem = items[0];
    for (let i = 1; i < items.length; ++i) {
        if (hashes[i] < minHash) {
            minHash = hashes[i];
            minItem = items[i];
        }
    }

    return minItem;
}


class Card {
    constructor(front, back) {
        this.front = front;
        this.back = back;

        Object.freeze(this);
    }

    toString() {
        return `Q: ${this.front}\nA: ${this.back}`;
    }

    async hash() {
        return await hash(this.toString());
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


function getEpoch() {
    return '2000-01-01';
}
function getToday() {
    return new Date().toLocaleDateString('sv');
}
function dateAdd(start, days) {
    const dayMillis = 24 * 3600 * 1000;
    const startMillis = +new Date(start + ' 00:00:00');
    const endMillis = startMillis + days * dayMillis;
    return new Date(endMillis).toLocaleDateString('sv');
}
function isDateString(s) {
    return dateAdd(s, 0) == s;
}

// Stats about responses to the card.
//
//   1. due
//   2. interval
class CardStats {
    constructor(card_id, card, due, interval) {
        if (!(card instanceof Card)) {
            throw new Error(`Expected a Card: ${card}`);
        }
        if (!isDateString(due)) {
            throw new Error(`Expected a date string: ${due}`);
        }
        if (!(typeof interval == 'number' && (interval | 0) == interval && interval >= 0)) {
            throw new Error(`Expected a nonnegative integer: ${interval}`);
        }

        this.card_id = card_id;
        this.card = card;
        this.due = due;
        this.interval = interval;

        Object.freeze(this);
    }

    static async makeDefault(card) {
        return new CardStats(await card.hash(), card, getEpoch(), 0);
    }

    rescheduled(today, newInterval) {
        newInterval = Math.max(1, newInterval);
        return new CardStats(
            this.card_id,
            this.card,
            dateAdd(today, newInterval),
            newInterval
        );
    }

    updateCorrect(today) { // -> CardStats
        return this.rescheduled(today, this.interval * 2);
    }
    updateIncorrect(today) { // -> CardStats
        return this.rescheduled(today, 0);
    }
}

class DB {
    constructor(stats) {
        this._statsById = {};
        for (const s of stats) {
            this._statsById[s.card_id] = s;
        }
    }

    static async open(text) {
        let [cards, errors] = parseCards(document.body.innerHTML);
        for (const e of errors) {
            console.error('malformed card', e);
        }

        let stats = [];
        for (const card of cards) {
            stats.push(await CardStats.makeDefault(card));
        }

        return new DB(stats);

    }

    async saveCardStats(stats) {
        console.log('saving', stats);
        if (!(stats instanceof CardStats)) {
            throw new Error('Expected a CardStats: ' + stats);
        }

        this._statsById[stats.card_id] = stats;
    }

    getCardStatsDueAt(today) { // -> [CardStats]
        return this.getAllStats().filter(stats => stats.due <= today);
    }

    getAllStats() {
        return Object.values(this._statsById);
    }
}

// for browser
async function runApp() {
    window.db = await DB.open(document.body.innerHTML);

    await redraw();
}

async function redraw() {
    const today = getToday();

    let result = '';
    result += `<div>reviewing for ${today}</div>`;

    const dueToday = db.getCardStatsDueAt(today);
    if (dueToday.length == 0) {
        result += `
            <div>done!</div>
        `;
    } else {
        // Only the first one.
        const stats = await pick(dueToday, today);
        const { card_id, card } = stats;
        window.stats = stats;

        result += `
            <details>
                <summary>Q: ${card.front}</summary>
                <div class="answer">A: ${card.back}</div>

                <div class="grade">
                    <button onclick="db.saveCardStats(stats.updateIncorrect(getToday())); redraw()">wrong</button>
                    <button onclick="db.saveCardStats(stats.updateCorrect(getToday())); redraw()">right</button>
                </div>
            </detail>
        `;
    }

    document.body.innerHTML = result;
}

function wrong() {

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
