/**
 * Base class for representing RDF Terms.
 *
 * Terms are required to provide a #format() method.
 *
 * http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#sparqlBasicTerms
 */

var _ = require('lodash');
var assert = require('assert');

var IRI; // This is required later due to a circular dependency.

module.exports = Term;

/**
 * An RDF Term. IRIs, blank nodes, and literals are all RDF terms.
 */
function Term() {
}

IRI = require('./iri');

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
        case 'object':
            return createTermFromObject(value);
        default:
            throw new TypeError('Cannot bind object');
    }
}

function createTermFromObject(object) {
    var value, type;

    if (Object.keys(object).length === 1) {
        return IRI.create(object);
    }

    value = object.value;

    if (value === undefined) {
        throw new Error('Binding must contain `value` (TODO: IRI usage)');
    }

    type = determineType(value);
    switch (type) {
        case 'string':
            return new StringLiteral(value, object.lang || object['xml:lang'] || '');
    }
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

function Literal(value) {
    this.value = value;
}

Literal.prototype = Object.create(Term.prototype, {
    type: { value: 'literal', enumerable: true }
});

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
