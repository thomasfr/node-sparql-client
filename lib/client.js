var request = require('request');
var querystring = require('querystring');
var _ = require('lodash');
var formatter = require('./formatter.js');

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

    var sparqlRequest = function sparqlRequest(originalQuery, callback) {
        var requestBody;
        var preamble = makePreamble(query, this.prefixes, this.base);
        var query = preamble + originalQuery;

        /* TODO: This... is so unsafe... */
        /* TODO: Write test that destroys the assumptions made by this if
        * statement: */
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

    this.base = null;
    this.prefixes = Object.create(null);
};

SparqlClient.prototype.query = function query(userQuery, callback) {
    if (callback) {
        this.sparqlRequest(userQuery, callback);
        return this;
    }
    else {
        this.currentQuery = userQuery;
        return this;
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

    throw new Error('Invalid arguments for SparqlClient#register()');
});

/* TODO: Move to Query! */
SparqlClient.prototype.bind = function (placeholder, value) {
    var query = this.currentQuery;
    var pattern = new RegExp('\\?' + placeholder + '[\\s\\n\\r\\t]+', 'g');
    query = query.replace(pattern, value + " ");
    this.currentQuery = query;
    return this;
};

SparqlClient.prototype.execute = function () {
    var callback;

    if (arguments.length === 0 || arguments.length > 2) {
        throw "Wrong number of arguments used.";
    }

    if (arguments.length == 1) {
        callback = arguments[0];
    }
    else {
        callback = arguments[1];
        this.currentOptions = arguments[0];
    }

    this.sparqlRequest(this.currentQuery, callback);
    return this;
};

/* Registering stuff. */
function addPrefixes(current, newPrefixes) {
    _.forEach(newPrefixes, function (prefix, uri) {
        current[prefix] = uri;
    });
}

function makePreamble(query, prefixes, base) {
    var preamble = '';

    if (base) {
        preamble += 'BASE <' + ensureSafeURI(base) + '>\n';
    }

    /* Note: Assuming the prototype does NOT contain object, and hence all
     * enumerable properties (things for-in will loop over) are actual
     * prefixes. */
    _.forEach(prefixes, function (prefix, uri) {
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

/* Utilities */

/* Wraps a method, making it fluent (i.e., it returns `this`). */
function fluent(method) {
    return function () {
        var result = method.apply(this, arguments);
        console.assert(result === undefined);
        return this;
    };
}
