/**
 * Literal RDF terms. Strings and other primitive datatypes.
 */

module.exports = Literal;

var assert = require('assert');

var Term = require('../term');
var IRI = require('./iri');

var SPARQL_LITERAL_PATTERNS = {
    boolean: /true|false/,
    integer: /^[-+]?[0-9]+$/,
    double: /^[-+]?(?:[0-9]+.[0-9]*|.[0-9]+|[0-9]+)[eE][+-]?[0-9]+$/,
    decimal: /^[-+]?[0-9]*.[0-9]+$/
};

function Literal(value, datatype) {
    this.value = assertSafeString(''+value);
    if (datatype !== undefined) {
        try {
            this.datatype = IRI.create(datatype);
        } catch (e) {
            // TODO: Ensure we're getting the right error.
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
            return term.asString ?
                formatStringWithDataType(term.literal, this.datatype) :
                term.literal;
        }
    }

    return formatStringWithDataType(this.value, this.datatype);
};

/**
 * Creates a literal with no datatype.
 */
Literal.create = function (value) {
    return new StringLiteral(value);
};

/**
 * Creates a literal with an explicit language tag.
 */
Literal.createWithLangaugeTag = function (value, languageTag) {
    if (typeof languageTag !== 'string') {
        throw new TypeError('Term as written must specify a language tag.');
    }
    return new StringLiteral(value, languageTag);
};

/**
 * Creates a literal with an explicit datatype.
 */
Literal.createWithDataType = function (value, datatype) {
    if (datatype === undefined) {
        throw new TypeError('Undefined datatype provided.');
    }
    return new Literal(value, datatype);
};


/**
 * Ensures U+0000 is not in the string.
 */
function assertSafeString(value) {
    if (/\u0000/.test(value)) {
        throw new Error('Refusing to encode string with null-character');
    }
    return value;
}

/**
 * Escapes all special characters in a string.
 */
var escapeCharacterMapping = {
    '\t': 't',
    '\n': 'n',
    '\r': 'r',
    '\b': 'b',
    '\f': 'f'
};
function escapeString(str) {
    /* From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#grammarEscapes */
    var escapableCodePoints = /[\\'"\t\n\r\b\f]/g;
    return str.replace(escapableCodePoints, function (character) {
        character = escapeCharacterMapping[character] || character;
        return '\\' + character;
    });
}

/**
 * Format the string part of a string.
 */
function formatString(value) {
    var stringified = ''+value;
    var escaped = escapeString(stringified);
    var hasSingleQuote = /'/.test(stringified);
    var hasDoubleQuote = /"/.test(stringified);
    var hasNewline = /\n/.test(stringified);

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

/**
 *
 */
function formatStringWithDataType(value, datatype) {
    var term = formatString(value);

    if (datatype !== undefined) {
        return term + '^^' + datatype.format();
    }
    return term;
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
        return tryFormatDouble(value);
    }

    if (SPARQL_LITERAL_PATTERNS[type].test(stringifiedValue)) {
        return {literal: stringifiedValue};
    }
}

/**
 * Tries to coerce the given value into looking like a SPARQL double literal.
 * Returns the original value if it fails.
 *
 * Although not SPARQL string literals, the special values are converted into
 * their XSD equivalents[1]:
 *
 *  JS            xsd
 * ========================
 *  NaN       =>  NaN
 *  Infinity  =>  INF
 *  -Infinity => -INF
 *
 * [1]: http://www.w3.org/TR/xmlschema-2/#double-lexical-representation
 */
function tryFormatDouble(value) {
    var pattern = SPARQL_LITERAL_PATTERNS.double;
    var stringified = '' + value;

    /* Special cases for +/-Infinity: */
    if (Math.abs(+value) === Infinity) {
        stringified = ((value < 0) ? '-' : '') + 'INF';
        return {literal: stringified, asString: true};
    }

    /* Try to make the given double look like a SPARQL double literal. */
    if (pattern.test(stringified)) {
        return {literal: stringified};
    }

    stringified += 'e0';

    if (pattern.test(stringified)) {
        return {literal: stringified};
    }
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
