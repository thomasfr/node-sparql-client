var util = require('util');

var SparqlClient = require('../');
var client = new SparqlClient('http://dbpedia.org/sparql');
client.query("select distinct ?Concept from <http://dbpedia.org> where {[] a ?Concept} limit 100", function(err, response) {
	console.log("Error", err);
	process.stdout.write(util.inspect(response, null, 20, true)+"\n");
});
