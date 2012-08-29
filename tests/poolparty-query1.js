var SparqlClient = require('../');
var util = require('util');
var endpoint = 'http://pp.punkt.at/PoolParty/sparql/GeoTestThesaurus';
var query = "select distinct * where {?country <http://www.w3.org/2004/02/skos/core#narrower> ?narrower}";
var country = "<http://pp.punkt.at/GeoTestThesaurus/Austria>";
var client = new SparqlClient(endpoint);
console.log("Query to " + endpoint);
console.log("Query: " + query);
client.query(query).bind('country', country).execute(function (error, results) {
  process.stdout.write(util.inspect(arguments, null, 20, true) + "\n");
});