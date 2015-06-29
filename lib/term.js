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
// Ensure that IRI is required after module.exports assignment due to circular
// dependency!
var IRI = require('./iri');


/**
 * An RDF Term. IRIs, blank nodes, and literals are all RDF terms.
 */
function Term() {
}

/**
 * Returns a term suitable for replacement in a SPARQL query.
 */
Term.prototype.format = function dummyFormat() {
    //assert(false, 'term MUST implement a #format method!');
    console.warn('term `%s` does not implement #format()!', this.value);
    return formatValue(this);
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
    throw new TypeError('Cannot bind object');
}

function createTermFromObject(object) {
    var value, type;

    /* Check if it's a short URI object. */
    if (Object.keys(object).length === 1) {
        return IRI.createFromObject(object);
    }

    value = object.value;

    if (value === undefined) {
        throw new Error('Binding must contain `value` (TODO: IRI usage)');
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
    throw new Error('Pattern match failure.');
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

function weirdoldstuff() {

    /* Assume it's a literal. Exceptions are URIs and null. */
    var result = _.extend({type: 'literal'}, options);

    switch (type) {
        case 'number':
            result.value = +value;
            /** Set a data type if `type` says so. */
            dataTypeForLiteral(result);
            _.defaults(result, {
                datatype: {xsd: 'double'}
            });
            break;
        case 'string':
            result.value = assertSafeString(''+value);
            dataTypeForLiteral(result);
            break;
        case 'null': /* TODO: maybe convert into a bnode? */
        case 'object':
            /* Attempt to convert to a URI. */
            return createTermFromObject(options);
        default:
            throw new Error('Invalid binding', value);
    }

    /* Coerce xsd:lang to just lang. */
    if (result['xsd:lang'] !==  undefined) {
        result.lang = result['xsd:lang'];
        delete result['xsd:lang'];
    }

    if (result.lang !== undefined) {
        assertSafeLanguageTag(result.lang);
    }

    /* Corece datatype to an IRI. */
    if (typeof result.datatype === 'object') {
        result.datatype = IRI.create(result.datatype);
    }
    if (!((result.datatype instanceof IRI) || (typeof result.datatype === 'string') ||
          (typeof result.datatype === 'undefined'))) {
        throw new Error('Datatype must be string or single-valued ' +
                        'object. Got ' + result.datatype + ' instead');
    }

    /**
     * Should return an object minimally with properties value, and type (literal, uri,
     * or bnode). It may optionally have a datatype (a string or a URI), and
     * 'xsd:lang' for some strings.
     */
    assert(result.value !== undefined && result.type !== undefined);
    return result;
}

/*
 * Term subclasses.
 */

/**
 * XSD datatypes.
 */
var KNOWN_DATATYPES = {
    boolean: 1, decimal: 1, double: 1, integer: 1
};

function Literal(value, datatype) {
    this.value = value;
    if (datatype !== undefined) {
        this.datatype = IRI.create(datatype);
    }
}

Literal.prototype = Object.create(Term.prototype, {
    type: { value: 'literal', enumerable: true }
});

/**
 * Note! Not guarenteed to be commutatitive!
 */
Literal.prototype.equal = function (other) {
    return _.equal(this, other);
};

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

var SPARQL_LITERAL_PATTERNS = {
    boolean: /true|false/,
    integer: /^[0-9]+$/,
    double: /^(?:[0-9]+.[0-9]*|.[0-9]+|[0-9]+)[eE][+-]?[0-9]+$/,
    decimal: /^[0-9]*.[0-9]+$/
};

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

function knownDatatype(iri) {
    if (!iri || iri.namespace !== 'xsd') {
        return false;
    }

    return true;
}

/**
 * Infers the datatype from the `type` property and assigns accordingly.
 */
function dataTypeForLiteral(binding) {
    if (binding.type === undefined) {
        return binding;
    }

    switch (binding.type) {
        case 'integer':
            binding.datatype = {xsd: 'integer'};
            break;
        case 'double':
            binding.datatype = {xsd: 'double'};
            break;
        case 'decimal':
            binding.datatype = {xsd: 'decimal'};
            break;
        case 'uri':
            /* Do not convert into a literal! */
            return;
        case 'literal':
            /* There's nothing to convert. */
            break;
        default:
            throw new Error('Unknown type: ' + binding.type);
    }
    binding.type = 'literal';
    return binding;
}

function assertSafeString(value) {
    if (/\u0000/.test(value)) {
        throw new Error('Refusing to encode string with null-character');
    }
    return value;
}

/**
 * Formats the value for printing.
 *
 * This seems to be a multimethod dependent on type and datatype.
 */
function formatValue(binding) {
    var value = binding.value;
    var initialString;
    assert(value !== undefined && binding.type !== undefined);

    if (binding.type === 'uri') {
        return formatURI(value);
    }

    initialString = formatString(value);
    if (bindingIsOfType(binding, {xsd:'integer'})) {
        initialString = '' + (~~binding.value);
        assert(/^[0-9]+$/.test(initialString));
        return initialString;

    } else if (bindingIsOfType(binding, {xsd:'double'})) {
        initialString = sprintf('%e', binding.value);
        assert(/^(?:[0-9]+.[0-9]*|.[0-9]+|[0-9]+)[eE][+-]?[0-9]+$/
            .test(initialString));
        return initialString;

    } else if (bindingIsOfType(binding, {xsd:'decimal'}) &&
               /^[0-9]*.[0-9]+$/.test(binding.value)) {
        /* We should NOT try interpreting decimals as strings! */
        return ''+binding.value;

    } else if (bindingIsOfType(binding, {xsd:'boolean'})) {
        /* Take the string value of the boolean. */
        return '' + binding.value;

    } else if (binding.datatype !== undefined) {
        return initialString + '^^' + formatURI(binding.datatype);
    }

    return initialString;
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


function bindingIsOfType(binding, iri) {
    return _.isEqual(binding.datatype, IRI.createFromObject(iri));
}

function formatURI(value) {
    if (value instanceof IRI) {
        return value.namespace + ':' + value.id;
    } else if (typeof value === 'string') {
        return '<' + value + '>';
    }
    throw new Error('Cannot format URI', value);
}

function escapeString(str) {
    /* From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#grammarEscapes */
    /* This omits newline. */
    var escapableCodePoints = /[\\\u0009\u000D\u0008\u000C\u0022\u0027]/g;
    return str.replace(escapableCodePoints, function (character) {
        return '\\' + character;
    });
}
