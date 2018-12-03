/**
 * Base class for representing RDF Terms.
 *
 * Terms are required to provide a #format() method.
 *
 * http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#sparqlBasicTerms
 */

var assign = require('lodash/assign');
var assert = require('assert');

module.exports = Term;
/* Ensure the following are required *after* module.exports assignment due to
 * circular dependency to Term.prototype. */
var IRI = require('./iri');
var Literal = require('./literal');
var BlankNode = require('./blank-node');

/**
 * XSD datatypes. SPARQL has literals for these.
 */
var KNOWN_DATATYPES = {
    boolean: 1, decimal: 1, double: 1, integer: 1
};


/**
 * An RDF Term. IRIs, blank nodes, and literals are all RDF terms.
 */
function Term() {
}

/**
 * Returns a term suitable for replacement in a SPARQL query.
 */
Term.prototype.format = function dummyFormat() {
    assert(false, 'term MUST implement a #format method!');
};

Term.prototype.toString = function () {
    return JSON.stringify(this, 'type value datatype xml:lang'.split(/\s+/));
};

/**
 * Creates a term from an arbitrary value, and options, if any.
 * Valid options:
 *
 *  - lang:     Sets the language tag for the value.
 *              Relevant only if value is a string.
 *  - xml:lang: Same as lang.
 *  - datatype: Sets the datatype for a literal.
 *  - type:     Can be an SPARQL term type 'literal', 'uri', 'bnode';
 *              the value will be interpreted as in the SPARQL spec.
 *              Additionally, can be 'integer', 'double', 'decimal'.
 */
Term.create = function create(value, options) {
    if (options) {
        return createTerm(assign({}, options, {value: value}));
    }
    return createTerm(value);
};

/* Helpers. */

function createTerm(value) {
    var type = determineType(value);

    switch (type) {
        case 'string':
            return Literal.create(value);
        case 'number':
            /* + 'e0' to look like a SPARQL double literal. */
            return Literal.createWithDataType(value, {xsd: 'double'});
        case 'boolean':
            return Literal.createWithDataType(value, {xsd: 'boolean'});
        case 'object':
            return createTermFromObject(value);
    }

    throw new TypeError('Cannot bind ' + type + ' value: ' + value);
}

function createTermFromObject(object) {
    var value, type;

    /* Check if it's a short URI object. */
    if (Object.keys(object).length === 1) {
        return IRI.createFromObject(object);
    }

    value = object.value;

    if (value === undefined) {
        throw new Error('Binding must contain property called `value`. ' +
                        "If you're trying to bind a URI, do so explicitly by " +
                        "writing {value: {prefix: name}, type: 'uri', ...}  " +
                        "rather than {prefix: name, ...}");
    }

    resolveDataTypeShortcuts(object);

    type = determineType(value);
    switch (true) {
        case object.type === 'uri':
            return IRI.create(value);
        case object.lang !== undefined:
            return Literal.createWithLangaugeTag(value, object.lang);
        case object['xml:lang'] !== undefined:
            return Literal.createWithLangaugeTag(value, object['xml:lang']);
        case object.datatype !== undefined:
            return Literal.createWithDataType(value, object.datatype);
    }
    throw new Error('Could not bind object: ' +
                    require('util').inspect(object));
}

/**
 * The value `type` can be one of the XSD types, but this is just a shortcut
 * for {type: 'literal', datatype: givenType}.
 *
 * This patches the object, such that type is moved to
 */
function resolveDataTypeShortcuts(object) {
    var TYPES = {
        bnode: 1, literal: 1, uri: 1
    };
    var datatype, type = object.type;

    if (type === undefined || type in TYPES) {
        /* Nothing to resolve. */
        return object;
    }

    if (type in KNOWN_DATATYPES) {
        datatype = {xsd: type};
    } else {
        datatype = type;
    }

    object.type = 'literal';
    object.datatype = datatype;

    return object;
}

/**
 * Returns a string of:
 * * 'null'         = With type: 'bnode' is a blank node
 * * 'undefined'
 * * 'number'       => An xsd:double; can be coreced with 'type' to
 *                     xsd:integer or xsd:decimal.
 * * 'boolean'      => An xsd:boolean
 * * 'string'       => A plain literal; can add an xml:lang property
 *                     with type 'uri', is considered a fully-qualified IRI.
 * * 'object'       => If length 1, a URI. Else, must contain 'value' and pass
 *                     rest of the properties as options.
 * * 'function'
 */
function determineType(unknown) {
    var value = (unknown === null || unknown === undefined) ?
        unknown :
        unknown.valueOf();

    return (value === null) ? 'null' : typeof value;
}
