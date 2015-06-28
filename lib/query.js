/**
 * Query module.
 *
 */

var _ = require('lodash');
var assert = require('assert');
var sprintf = require("sprintf-js").sprintf;

var IRI = require('./iri.js');

module.exports = Query;

function Query(client, text, options) {
    this.client = client;
    this.originalText = text;

    /* Inherit these from the parent. */
    this.base = options.base;
    this.prefixes = _.cloneDeep(options.prefixes);

    /* Create an empty set of bindings! */
    this.bindings = Object.create(null);
}

/* Query is Registerable. */
Query.prototype = Object.create(require('./registerable'));

Query.prototype.bind = function (subject, predicate, options) {
    if (arguments.length === 1) {
        _.assign(this.bindings, prepareBindings(subject));
    } else if (arguments.length <= 3) {
        this.bindings[subject] = prepareBinding(predicate, options);
    } else {
        throw new Error('Invalid invocation for #bind()');
    }
    return this;
};

Query.prototype.execute = function () {
    var callback, options, query, preamble;

    if (arguments.length === 1)  {
        if (typeof arguments[0] === 'function') {
            callback = arguments[0];
        } else {
            options = arguments[0];
        }
    } else if (arguments.length === 2)  {
        options = arguments[0];
        callback = arguments[1];
    } else if (arguments.length > 2) {
        throw new Error("Wrong number of arguments used.");
    }

    preamble = makePreamble(this.prefixes, this.base);
    query = formatQuery(this.originalText, this.bindings);

    return this.client.sparqlRequest(preamble, query, options)
        .nodeify(callback);
};

/* Helpers. */

function makePreamble(prefixes, base) {
    var preamble = '';

    if (base) {
        preamble += 'BASE <' + ensureSafeURI(base) + '>\n';
    }

    /* Note: Assuming the prototype chain does NOT contain Object.prototype,
     * and hence all enumerable properties (things for-in will loop over) are
     * actual prefixes. */
    _.forEach(prefixes, function (uri, prefix) {
        preamble += 'PREFIX ' + prefix + ': <' + ensureSafeURI(uri) + '>\n';
    });

    /* Throws an error when the URI is... uncouth. */
    function ensureSafeURI(uri) {
        if (uri.match(/[\u0000\n>]/)) {
            throw new Error('Refusing to add prefix with suspicious URI.');
        }
        return uri;
    }

    return preamble;
}

function formatQuery(query, bindings) {
    if (Object.keys(bindings).length < 1) {
        /* No bindings were created! */
        return query;
    }

    var pattern = createPlaceholderRegex(bindings);

    return query.replace(pattern, function (str, name) {
        var value = bindings[name];
        return formatValue(value);
    });
}

function createPlaceholderRegex(bindings) {
    var names = Object.keys(bindings);
    var alternatives = _.map(names, escapeRegExp).join('|');
    return new RegExp('\\?(' + alternatives + ')\\b', 'g');
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
    if (binding.lang !== undefined) {
        return initialString + '@' + binding.lang;

    } else if (bindingIsOfType(binding, {xsd:'integer'})) {
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

function bindingIsOfType(binding, iri) {
    return _.isEqual(binding.datatype, IRI.createFromObject(iri));
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

function formatURI(value) {
    if (value instanceof IRI) {
        return value.namespace + ':' + value.id;
    } else if (typeof value === 'string') {
        return '<' + value + '>';
    }
    throw new Error('Cannot format URI', value);
}

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

function escapeString(str) {
    /* From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#grammarEscapes */
    /* This is missing newline. */
    var escapableCodePoints = /[\\\u0009\u000D\u0008\u000C\u0022\u0027]/g;
    return str.replace(escapableCodePoints, function (character) {
        return '\\' + character;
    });
}

/**
 * Currently a no-op. It should do post-processing based on the type and
 * options of the given parameters.
 */
function prepareBinding(value, options, didRecurse) {
    var type = determineType(value);
    /* Assume it's a literal. Exceptions are URIs and null. */
    var result = _.defaults({}, options, {
        type: 'literal',
    });

    switch (type) {
        case 'null': /* TODO: maybe convert into a bnode? */
        case 'object':
            /* Attempt to convert to a URI. */
            result.value = IRI.createFromObject(value);
            if (result.value === null) {
                /* Then it MUST be an object with options like 'type', 'lang',
                 * and value. */
                if (didRecurse || result.value === undefined) {
                    throw new Error('Invalid object binding:', value);
                } else {
                    var newOptions = _.assign({}, value, options);
                    delete newOptions.value;
                    return prepareBinding(value.value, newOptions, true);
                }
            } else {
                result.type = 'uri';
                return result;
            }
            break;
        case 'string':
            result.value = assertSafeString(''+value);
            dataTypeForLiteral(result);
            break;
        case 'number':
            result.value = +value;
            /** Set a data type if `type` says so. */
            dataTypeForLiteral(result);
            _.defaults(result, {
                datatype: {xsd: 'double'}
            });
            /* TODO: handle other kind of numeric literals. */
            break;
        case 'boolean':
            result.value = value;
            _.defaults(result, {
                datatype: {xsd: 'boolean'}
            });
            break;
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
        result.datatype = IRI.createFromObject(result.datatype);
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

function prepareBindings(bindings) {
    return _.transform(bindings, function (results, value, key) {
        results[key] = prepareBinding(value);
    });
}

function assertSafeString(value) {
    if (/\u0000/.test(value)) {
        throw new Error('Refusing to encode string with null-character');
    }
    return value;
}

/**
 * See "The Long Answer" there:
 * http://stackoverflow.com/a/6969486
 */
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
