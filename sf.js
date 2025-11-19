// static flashcards

class Card {
    constructor(front, back) {
        this.front = front;
        this.back = back;
    }

    toString() {
        return `Q: ${this.front}\nA: ${this.back}`;
    }
}

function parseCards(text) { // -> [cards, errors]
    let cards = [];
    let errors = [];

    const paragraphs = text.split('\n\n').map(s => s.trim());
    for (const p of paragraphs) {
        let lines = p.split('\n');
        lines = lines.filter(line => !line.startsWith('#'));  // drop comments

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

