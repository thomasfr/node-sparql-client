/**
 * Query class.
 */

var _ = require('lodash');
var assert = require('assert');
var sprintf = require("sprintf-js").sprintf;

var Term = require('./term');
var IRI = require('./iri');

module.exports = Query;

function Query(client, text, options) {
    this.client = client;
    this.originalText = text;

    /* Inherit prefixes from the parent. */
    this.prefixes = _.cloneDeep(options.prefixes);

    /* Create an empty set of bindings! */
    this.bindings = Object.create(null);
}

/* Query uses #register() and #registerCommon. */
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

    preamble = makePreamble(this.prefixes);
    query = formatQuery(this.originalText, this.bindings);

    return this.client.sparqlRequest(preamble, query, options)
        .nodeify(callback);
};

/* Helpers. */

function makePreamble(prefixes) {
    var preamble = '';

    if (prefixes['']) {
        preamble += 'BASE <' + ensureSafeURI(prefixes['']) + '>\n';
    }

    /* Note: Assuming the prototype chain does NOT contain Object.prototype,
     * and hence all enumerable properties (things for-in will loop over) are
     * actual prefixes. */
    _.forEach(prefixes, function (uri, prefix) {
        if (prefix === '') {
            return;
        }
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
 */
function formatValue(term) {
  // Delegate to Term#format().
  return term.format();
}
/**
 * See "The Long Answer" there:
 * http://stackoverflow.com/a/6969486
 */
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/**
 * Returns a term. Throws if the term is invalid in some form or another.
 */
function prepareBinding(value, options) {
    return Term.create(value, options);
}

/**
 * Creates multiple terms.
 */
function prepareBindings(bindings) {
    return _.transform(bindings, function (results, value, key) {
        results[key] = prepareBinding(value);
    });
}
