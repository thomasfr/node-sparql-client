/**
 * Base class for representing RDF Terms.
 *
 * Terms are required to provide a #format() method.
 *
 * http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#sparqlBasicTerms
 */

var assert = require('assert');

module.exports = Term;

/**
 * Term constructor. Does nothing!
 */
function Term() {
}

Term.prototype.format = function dummyFormat() {
    assert(false, 'term MUST implement a #format method!'); 
};

Term.create = function create(item, maybeOptions) {
};


function Literal() {
}

function BlankNode(identifier) {
    if (identifier === undefined || identifier === null) {
        // TODO: random node name.
    }
}
