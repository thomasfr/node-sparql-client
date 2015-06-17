var assert = require('assert');
var querystring = require('querystring');

var request = require('request');
var _ = require('lodash');

var formatter = require('./formatter.js');

/**
 * From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#docNamespaces
 */
var COMMON_PREFIXES = {
    rdf:    'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:   'http://www.w3.org/2000/01/rdf-schema#',
    xsd:    'http://www.w3.org/2001/XMLSchema#',
    fn:     'http://www.w3.org/2005/xpath-functions#',
    sfn:    'http://www.w3.org/ns/sparql#'
};

var SparqlClient = module.exports = function (endpoint, options) {
    var requestDefaults = {
        url: endpoint,
        method: 'POST',
        encoding: 'utf8',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json,application/json'
        }
    };
    var defaultParameters = {
        format: 'application/sparql-results+json',
        'content-type': 'application/sparql-results+json'
    };
    var doRequest = request.defaults(requestDefaults);

    var emptyFn = function emptyFn() {
    };

    var that = this;

    var nextTick = function nextTick(callback, args, scope) {
        scope = scope || this;
        return function nextTickCallback() {
            process.nextTick(function nextTickWrapper() {
                callback.apply(scope, args);
            });
            return scope;
        };
    };

    var responseHandler = function responseHandler(error, response, responseBody, callback) {
        var continuation = emptyFn;
        if (error || response.statusCode >= 300) {
            var msg;

            if (error && error.code == "ECONNREFUSED") {
                msg = "Could not connect to SPARQL endpoint.";
            } else {
                msg = "SPARQL query failed.";
            }

            continuation = nextTick(callback, [
                new Error(msg),
                null
            ], that);
        } else {
            try {
                responseBody = JSON.parse(responseBody);
            } catch (e) {
                continuation = nextTick(callback, [
                    new Error("Could not parse responseBody."),
                    null
                ], that);
            }

            if (this.currentOptions) {
                formatter.format(responseBody, this.currentOptions);
            }

            continuation = nextTick(callback, [
                null,
                responseBody
            ]);
        }
        return continuation();
    };

    var sparqlRequest = function sparqlRequest(preamble, query, callback) {
        var fullQuery = (!!preamble) ? preamble + '\n' + query : query;
        var requestBody =
            (statementIsUpdate(query)) ?
                { update: fullQuery } :
                { query: fullQuery };
        _.defaults(requestBody, defaultParameters);

        doRequest({form: requestBody}, function requestCallback() {
            var args = _.toArray(arguments);

            //if an error occurs only the error is provided, with the reponse and reponsebody
            //so we need to add 2 dummy arguments 'null', so that the callback is the 4th
            //argument of the responseHandler.
            if (args.length == 1) {
                args = args.concat([
                    null,
                    null
                ]);
            }

            responseHandler.apply(that, args.concat(callback));
        });
    };

    this.defaultParameters = defaultParameters;
    this.requestDefaults = _.extend(requestDefaults, options);
    this.sparqlRequest = sparqlRequest;
    this.currentOptions = null;

    /* PREFIX xyz: <...> and BASE <...> stuff: */
    this.base = null;
    this.prefixes = Object.create(null);
};

/*
 * Create an alias to itself so that CoffeeScript and Harmony users can:
 * {SparqlClient} = require('sparql-client');
 */
SparqlClient.SparqlClient = SparqlClient;


SparqlClient.prototype.query = function query(userQuery, callback) {
    var statement = new Query(this, userQuery, {
        base: this.base,
        prefixes: this.prefixes
    });

    if (callback) {
        return statement.execute(callback);
    } else {
        return statement;
    }
};

SparqlClient.prototype.register = fluent(function register(subject, predicate) {
    if (arguments.length === 1) {
        switch(typeof subject) {
            case 'string':
                /* Set the base. */
                return void (this.base = subject);
            case 'object':
                /* Add an object full of prefixes. */
                return addPrefixes(this.prefixes, subject);
        }
    } else if (arguments.length === 2) {
        /* Add single prefix. */
        var obj = {};
        obj[subject] = predicate;
        return addPrefixes(this.prefixes, obj);
    }

    throw new Error('Invalid arguments for #register()');
});

SparqlClient.prototype.registerCommon = fluent(function () {
    if (arguments.length === 0) {
        return addPrefixes(this.prefixes, COMMON_PREFIXES);
    }

    var prefixes = {};
    for (var i in arguments) {
        var prefix = arguments[i];
        var uri = COMMON_PREFIXES[prefix];
        if (prefix === undefined) {
            throw new Error('`' + prefix + '` is not a known prefix.');
        }
        prefixes[prefix] = uri;
    }

    addPrefixes(this.prefixes, prefixes);
});


function Query(client, text, options) {
    this.client = client;
    this.originalText = text;

    /* Inherit these from the parent. */
    this.base = options.base;
    this.prefixes = _.cloneDeep(options.prefixes);

    /* Create an empty set of bindings! */
    this.bindings = Object.create(null);
}

Query.prototype.bind = fluent(function (subject, predicate, options) {
    if (arguments.length === 1) {
        _.assign(this.bindings, bindMultiple(subject));
    } else if (arguments.length <= 3) {
        this.bindings[subject] = bindOne(predicate, options);
    } else {
        throw new Error('Invalid invocation for #bind()');
    }
});

Query.prototype.execute = function () {
    var callback, options, query, preamble;
    if (arguments.length === 1)  {
        callback = arguments[0];
    } else if (arguments.length === 2)  {
        options = arguments[0];
        callback = arguments[1];
    } else if (arguments.length > 2) {
        throw new Error("Wrong number of arguments used.");
    }

    preamble = makePreamble(this.prefixes, this.base);
    query = formatQuery(this.originalText, this.bindings);
    return this.client.sparqlRequest(preamble, query, callback);
};

/* Just borrow these methods from SparqlClient. They won't mind. */
Query.prototype.register = SparqlClient.prototype.register;
Query.prototype.registerCommon = SparqlClient.prototype.registerCommon;

/* Helper methods. */

/* Registering stuff. */
function addPrefixes(current, newPrefixes) {
    var inspect = require('util').inspect;
    _.forEach(newPrefixes, function (uri, prefix) {
        current[prefix] = uri;
    });
}

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
    /* This is buggy and wrong... */
    return _.reduce(bindings, function (previous, value, placeholder) {
        return replacePlaceholder(previous, placeholder, value);
    }, query);
}

function replacePlaceholder(query, placeholder, value) {
    var pattern = new RegExp('\\?' + placeholder + '[\\s\\n\\r\\t]+', 'g');
    query = query.replace(pattern, value + " ");
    return query;
}

/**
 * Currently a no-op. It should do post-processing based on the type and
 * options of the given parameters.
 */
function bindOne(value, options) {
    options = options || {};
    return value;
}

function bindMultiple(bindings) {
    return _.transform(bindings, function (results, value, key) {
        results[key] = bindOne(value);
    });
}

/* Utilities */

/* Wraps a method, making it fluent (i.e., it returns `this`). */
function fluent(method) {
    return function () {
        var result = method.apply(this, arguments);
        assert(result === undefined);
        return this;
    };
}

/**
 * Does a rough parse of the statement to determine if it's an query or an
 * update. SPARQL endpoints care about this because... they do.
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
