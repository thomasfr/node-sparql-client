/**
 * Base class for representing RDF Terms.
 *
 * Terms are required to provide a #format() method.
 *
 * http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#sparqlBasicTerms
 */

var _ = require('lodash');
var assert = require('assert');

module.exports = Term;
/* Ensure that IRI is required *after* module.exports assignment due to
 * circular dependency! */
var IRI = require('./iri');


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
        return createTerm(_.extend({}, options, {value: value}));
    }
    return createTerm(value);
};

function createTerm(value) {
    var type = determineType(value);

    switch (type) {
        case 'string':
            return new StringLiteral(value);
        case 'number':
            /* + 'e0' to look like a SPARQL double literal. */
            return new Literal(value, {xsd: 'double'});
        case 'boolean':
            return new Literal(value, {xsd: 'boolean'});
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
            return new StringLiteral(value, object.lang);
        case object['xml:lang'] !== undefined:
            return new StringLiteral(value, object['xml:lang']);
        case object.datatype !== undefined:
            return new Literal(value, object.datatype);
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

/*
 * Term subclasses.
 */

var SPARQL_LITERAL_PATTERNS = {
    boolean: /true|false/,
    integer: /^[0-9]+$/,
    double: /^(?:[0-9]+.[0-9]*|.[0-9]+|[0-9]+)[eE][+-]?[0-9]+$/,
    decimal: /^[0-9]*.[0-9]+$/
};

function Literal(value, datatype) {
    this.value = assertSafeString(''+value);
    if (datatype !== undefined) {
        try {
            this.datatype = IRI.create(datatype);
        } catch (e) {
            throw new Error('Datatype must be string or single-valued ' +
                            'object. Got ' + datatype + ' instead');
        }
    }
}

Literal.prototype = Object.create(Term.prototype, {
    type: { value: 'literal', enumerable: true }
});

Literal.prototype.format = function () {
    var term;

    if (knownDatatype(this.datatype)) {
     term = tryFormatType(this.value, this.datatype.id);
        if (term !== undefined) {
            return term;
        }
    }

    term = formatString(this.value);

    if (this.datatype !== undefined) {
        term += '^^' + this.datatype.format();
    }
    return term;
};

function assertSafeString(value) {
    if (/\u0000/.test(value)) {
        throw new Error('Refusing to encode string with null-character');
    }
    return value;
}

function knownDatatype(iri) {
    if (!iri || iri.namespace !== 'xsd') {
        return false;
    }

    return true;
}

/**
 * Returns formatted value of built in xsd types. Returns undefined if the
 * given value does not match the pattern.
 */
function tryFormatType(value, type) {
    var stringifiedValue = '' + value;
    assert(SPARQL_LITERAL_PATTERNS[type] !== undefined);

    if (type === 'double') {
        stringifiedValue = tryFormatDouble(value);
    }

    if (SPARQL_LITERAL_PATTERNS[type].test(stringifiedValue)) {
        return stringifiedValue;
    }
}

/**
 * Tries to coerce the given value into looking like a SPARQL double literal.
 * Returns the original value if it fails.
 */
function tryFormatDouble(value) {
    var pattern = SPARQL_LITERAL_PATTERNS.double;
    var stringified = '' + value;
    /* Try to make the given double look like a SPARQL double literal. */
    if (pattern.test(stringified)) {
        return stringified;
    }

    stringified += 'e0';

    if (pattern.test(stringified)) {
        return stringified;
    }
    return value;
}


function StringLiteral(value, languageTag) {
    Literal.call(this, value);

    if (languageTag !== undefined) {
        this['xml:lang'] = assertSafeLanguageTag(languageTag);
    }
}

StringLiteral.prototype = Object.create(Literal.prototype, {
    languageTag: { get: function () { return this['xml:lang']; }}
});

StringLiteral.prototype.format = function () {
    var term = formatString(this.value);

    if (this.languageTag !== undefined) {
        term += '@' + this.languageTag;
    }
    return term;
};

/**
 * Raises an error if the language tag seems malformed.
 */
function assertSafeLanguageTag(tag) {
    /* See: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#rLANGTAG */
    if (/^[a-zA-Z]+(?:-[a-zA-Z0-9]+)*$/.test(tag)) {
        return tag;
    }

    throw new Error('Invalid langauge tag: ' + tag);
}


/**
 * TODO
 */
function BlankNode(identifier) {
    if (identifier === undefined || identifier === null) {
        // TODO: random node name.
    }
}

BlankNode.prototype = Object.create(Term.prototype, {
    type: { value: 'bnode', enumerable: true }
});

/* Helpers. */

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

/**
 * Format the string part of a string.
 */
function formatString(value) {
    var stringified = ''+value;
    var escaped = escapeString(stringified);
    var hasSingleQuote = /'/.test(stringified);
    var hasDoubleQuote = /"/.test(stringified);
    var hasNewline = /"/.test(stringified);

    var delimiter;

    if (hasNewline || (hasSingleQuote && hasDoubleQuote)) {
        delimiter = '"""';
    } else if (hasSingleQuote) {
        delimiter = '"';
    } else {
        delimiter =  "'";
    }

    assert(!(new RegExp('(?!\\\\)' + delimiter).test(escaped)),
          'found `' + delimiter + '` in `' + escaped + '`'
          );
    return delimiter + escaped + delimiter;
}

function escapeString(str) {
    /* From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#grammarEscapes */
    /* This omits newline. */
    var escapableCodePoints = /[\\\u0009\u000D\u0008\u000C\u0022\u0027]/g;
    return str.replace(escapableCodePoints, function (character) {
        return '\\' + character;
    });
}
