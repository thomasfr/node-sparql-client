/**
 * TODO
 */
module.exports = BlankNode;

var Term = require('../term');

function BlankNode(identifier) {
    if (identifier === undefined || identifier === null) {
        // TODO: random node name.
    }
}

BlankNode.prototype = Object.create(Term.prototype, {
    type: { value: 'bnode', enumerable: true }
});
