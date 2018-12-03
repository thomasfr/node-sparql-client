var SparqlClient = module.exports = require('./lib/client');

/*
 * Create an alias to itself so that CoffeeScript and Harmony users can:
 * {SparqlClient} = require('sparql-client');
 */
SparqlClient.SparqlClient = SparqlClient;
SparqlClient.SPARQL = require('./lib/sparql-tag');
