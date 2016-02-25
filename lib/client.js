var querystring = require('querystring');

var http = require('http');
var request = require('request');
var promise = require('promise');
var _ = require('lodash');

var Query = require('./query');
var formatter = require('./formatter');


/**
 * The main client class.
 */
var SparqlClient = module.exports = function SparqlClient(endpoint, options) {
    var requestDefaults = {
        url: endpoint,
        method: 'POST',
        encoding: 'utf8',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json,application/json',
            'User-Agent': 'node-sparql-client/' + require('../package.json').version
        }
    };
    var defaultParameters = {
        format: 'application/sparql-results+json',
        'content-type': 'application/sparql-results+json'
    };
    var doRequest = promise.denodeify(request.defaults(requestDefaults));

    var that = this;

    var sparqlRequest = function sparqlRequest(query, queryOptions) {
        var requestBody =
            (query.isUpdate) ?
                { update: query.text } :
                { query: query.text };
        _.defaults(requestBody, defaultParameters);

        return doRequest({form: requestBody})
            .then(function (response) {
                var responseBody, error;
                if (response.statusCode >= 300) {
                    error = new Error(formatErrorMessage(response));
                    /* Patch .httpStatus onto the object. */
                    error.httpStatus = response.statusCode;

                    throw error;
                }

                responseBody = JSON.parse(response.body);

                if (queryOptions) {
                    formatter.format(responseBody, queryOptions);
                }
                return promise.resolve(responseBody);

                function formatErrorMessage(res) {
                    var code = res.statusCode;
                    var statusMessage = res.statusMessage ||
                         http.STATUS_CODES[code];

                    return 'HTTP Error: ' + code + ' ' + statusMessage;
                }
            })
            .catch(function (error) {
                if (error.code === "ECONNREFUSED") {
                    throw new Error("Could not connect to SPARQL endpoint.");
                }
                /* Rethrow the raw error. */
                throw error;
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
