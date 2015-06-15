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

/* Hmmm... this is not going to do surrogate pairs properly, probably... */
/* TODO: use ECMAScript 6 regex with full Unicode support. */
/* TODO: make test with some dumb emoji, (💩  probably). */
/*
 * From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#rVARNAME
 */
var VARNAME = '[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\U10000-\UEFFFF_0-9][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\U10000-\UEFFFF_0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\U10000-\UEFFFF0-9\u00B7\u0300-\u036F\u203F-\u2040]*';

var SparqlClient = module.exports = function (endpoint, options) {
    var slice = Array.prototype.slice;
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
            var err;

            if (error && error.code == "ECONNREFUSED") {
                err = "Could not connect to SPARQL endpoint.";
            }
            else {
                err = "SparQL query failed.";
            }

            continuation = nextTick(callback, [
                new Error(err),
                null
            ], that);
        }
        else {
            try {
                responseBody = JSON.parse(responseBody);
            }
            catch (e) {
                continuation = nextTick(callback, [
                    new Error("Could not parse responseBody."),
                    null
                ], that);
            }

            /* if (this.currentOptions && this.currentOptions.structure == 'default') {
             responseBody = structureResources(responseBody);
             }
             */

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

    var sparqlRequest = function sparqlRequest(query, callback) {
        var requestBody;
        /* TODO: This... is so unsafe... */
        if (query.indexOf("INSERT DATA") == -1 && query.indexOf("DELETE") == -1) {
            requestBody = _.extend(defaultParameters, {
                query: query
            });
            delete defaultParameters.update;
        } else {
            requestBody = _.extend(defaultParameters, {
                update: query
            });
            delete defaultParameters.query;
        }

        var opts = {
            body: querystring.stringify(requestBody)
        };
        doRequest(opts, function requestCallback() {
            var args = slice.call(arguments, 0);

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
    this.request = request;
    this.sparqlRequest = sparqlRequest;
    this.currentQuery = null;
    this.currentOptions = null;

    /* PREFIX xyz: <...> and BASE <...> stuff: */
    this.base = null;
    this.prefixes = Object.create(null);
};

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

Query.prototype.bind = fluent(function (placeholder, value) {
    var query = this.currentQuery;
    var pattern = new RegExp('\\?' + placeholder + '[\\s\\n\\r\\t]+', 'g');
    query = query.replace(pattern, value + " ");
    this.currentQuery = query;
});

Query.prototype.execute = function () {
    var callback, options, query;
    if (arguments.length === 1)  {
        callback = arguments[0];
    } else if (arguments.length === 2)  {
        options = arguments[0];
        callback = arguments[1];
    } else if (arguments.length > 2) {
        throw new Error("Wrong number of arguments used.");
    }

    query = formatQuery(this.originalText,
                        this.bindings,
                        this.prefixes,
                        this.base);
    return this.client.sparqlRequest(query, callback);
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

    /* Note: Assuming the prototype does NOT contain object, and hence all
     * enumerable properties (things for-in will loop over) are actual
     * prefixes. */
    _.forEach(prefixes, function (uri, prefix) {
        preamble += 'PREFIX ' + prefix + ': <' + ensureSafeURI(uri) + '>\n';
    });

    if (preamble) {
        preamble += '\n';
    }

    /* Throws an error when the URI is... uncouth. */
    function ensureSafeURI(uri) {
        if (uri.match(/[\u0000\n>]/)) {
            throw new Error('Refusing to add prefix with suspicious URI.');
        }
        return uri;
    }

    return preamble;
}

function formatQuery(query, bindings, prefixes, base) {
    var preamble = makePreamble(prefixes, base);
    return preamble + query;
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
