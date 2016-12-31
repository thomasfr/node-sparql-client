var querystring = require('querystring');

var request = require('request');
var promise = require('promise');
var _ = require('lodash');

var Query = require('./query');
var formatter = require('./formatter');

var SparqlClient = module.exports = function SparqlClient(endpoint, options) {
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
    var doRequest = promise.denodeify(request.defaults(requestDefaults));

    var that = this;

    var sparqlRequest = function sparqlRequest(preamble, query, queryOptions) {
        var fullQuery = (!!preamble) ? preamble + '\n' + query : query;
        var requestBody =
            (statementIsUpdate(query)) ?
                { update: fullQuery } :
                { query: fullQuery };
        _.defaults(requestBody, defaultParameters);

        return doRequest({form: requestBody})
            .then(function (response) {
                var responseBody;
                if (response.statusCode >= 300) {
                    throw new Error("SPARQL query failed.");
                }

                responseBody = JSON.parse(response.body);

                if (queryOptions) {
                    formatter.format(responseBody, queryOptions);
                }
                return promise.resolve(responseBody);
            })
            .catch(function (error) {
                if (error.code == "ECONNREFUSED") {
                    throw new Error("Could not connect to SPARQL endpoint.");
                }
                throw new Error(error);
            });
    };

    this.defaultParameters = defaultParameters;
    this.requestDefaults = _.extend(requestDefaults, options);
    this.sparqlRequest = sparqlRequest;

    /* PREFIX xyz: <...> and BASE <...> stuff: */
    this.prefixes = Object.create(null);
};

/* SparqlClient uses #register() and #registerCommon. */
SparqlClient.prototype = Object.create(require('./registerable'));

/*
 * Create an alias to itself so that CoffeeScript and Harmony users can:
 * {SparqlClient} = require('sparql-client');
 */
SparqlClient.SparqlClient = SparqlClient;

SparqlClient.prototype.query = function query(userQuery, callback) {
    var statement = new Query(this, userQuery, {
        prefixes: this.prefixes
    });

    if (callback) {
        return statement.execute(callback);
    } else {
        return statement;
    }
};

/* Helpers. */

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
