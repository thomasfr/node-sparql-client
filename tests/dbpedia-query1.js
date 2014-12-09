var util = require('util');

var SparqlClient = require('../');
var endpoint = 'http://dbpedia.org/sparql';
var query = 'select distinct ?Concept from <http://dbpedia.org> where {[] a ?Concept} limit 100';
var client = new SparqlClient(endpoint);
console.log("Query to " + endpoint);
console.log("Query: " + query);
client.query(query, function (error, results) {
    process.stdout.write(util.inspect(arguments, null, 20, true) + "\n");
});
