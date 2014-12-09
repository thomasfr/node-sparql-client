var util = require('util');

var SparqlClient = require('../');
var endpoint = 'http://dbpedia.org/sparql';

// Get a list of books including their genres. The list will be formatted or grouped by genres
var query = "SELECT ?book ?genre WHERE { ?book <http://dbpedia.org/ontology/literaryGenre> ?genre } LIMIT 500";
var client = new SparqlClient(endpoint);
console.log("Query to " + endpoint);
console.log("Query: " + query);
client.query(query)
    .execute({
        format: 'resource',
        resource: 'genre'
    }, function (error, results) {
        process.stdout.write(util.inspect(arguments, null, 20, true) + "\n");
    });
