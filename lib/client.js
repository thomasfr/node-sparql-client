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
            'Accept': 'application/sparql-results+json'
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
        }
    };

    var responseHandler = function responseHandler(error, response, responseBody, callback) {
        var continuation = emptyFn;
        if (error || response.statusCode >= 300) {
            var err;

            if (error.code == "ECONNREFUSED") {
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
        if (query.indexOf("INSERT DATA") == -1 && query.indexOf("DELETE") == -1) {
            var requestBody = _.extend(defaultParameters, {
                query: query
            });
        }
        else {
            var requestBody = _.extend(defaultParameters, {
                update: query
            });
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
};

SparqlClient.prototype.query = function query(query, callback) {
    if (callback) {
        this.sparqlRequest(query, callback);
        return this;
    }
    else {
        this.currentQuery = query;
        return this;
    }
};

SparqlClient.prototype.bind = function (placeholder, value) {
    var query = this.currentQuery;
    var pattern = new RegExp('\\?' + placeholder + '[\\s\\n\\r\\t]+', 'g');
    query = query.replace(pattern, value + " ");
    this.currentQuery = query;
    return this;
};

SparqlClient.prototype.execute = function () {
    var callback;

    if (arguments.length == 0 || arguments.length > 2) {
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
