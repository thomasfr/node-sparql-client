/**
 * Query class.
 */

var _ = require('lodash');
var assert = require('assert');

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
    var callback, options, query, preamble, body;

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
    body = formatQuery(this.originalText, this.bindings);
    query = {
        text: (preamble) ? preamble + '\n' + body : body,
        isUpdate: statementIsUpdate(body)
    };

    return this.client.sparqlRequest(query, options)
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
    /* TODO: Throw some kind of error for this! */
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
        var binding = bindings[name];
        return formatBinding(binding);
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
function formatBinding(binding) {
    assert(binding.formatted !== undefined);
    return binding.formatted;
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
    var term = Term.create(value, options);
    /* Format RIGHT NOW so that queries fail during execute. */
    return {original: term, formatted: term.format()};
}

/**
 * Creates multiple terms.
 */
function prepareBindings(bindings) {
    return _.transform(bindings, function (results, value, key) {
        results[key] = prepareBinding(value);
    });
}

/**
 * Does a rough parse of the statement to determine if it's a query or an
 * update. SPARQL endpoints care about this because... they do.
 *
 * See:
 * http://www.w3.org/TR/2013/REC-sparql11-protocol-20130321/#update-operation
 */
function statementIsUpdate(text) {
    /* Regex derived using info from:
     * http://www.w3.org/TR/sparql11-query/#rQueryUnit */
    var pattern = /^(?:\s*(?:PREFIX|BASE)[^<]+<[^>]+>)*\s*(?!PREFIX|BASE)(\w+)/i;
    var update = {
        LOAD:1, CLEAR:1, DROP:1, CREATE:1, ADD:1, MOVE: 1, COPY:1,
        INSERT:1, DELETE:1, WITH:1
    };

    var match = pattern.exec(text);
    if (!match) {
        throw new Error('Malformed query: ' + text);
    }
    var keyword = match[1].toUpperCase();

    return keyword in update;
}
