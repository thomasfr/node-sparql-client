var util = require('util');

var SparqlClient = require('../');
var endpoint = 'http://dbpedia.org/sparql';

// Get the leaderName(s) of the given citys
// if you do not bind any city, it returns 10 random leaderNames
var query = "SELECT * FROM <http://dbpedia.org> WHERE { ?city <http://dbpedia.org/property/leaderName> ?leaderName } LIMIT 10";
var client = new SparqlClient(endpoint);
console.log("Query to " + endpoint);
console.log("Query: " + query);
client.query(query)
  //.bind('city', 'db:Chicago')
  //.bind('city', 'db:Tokyo')
  //.bind('city', 'db:Casablanca')
  .bind('city', '<http://dbpedia.org/resource/Vienna>')
  .execute(function(error, results) {
  process.stdout.write(util.inspect(arguments, null, 20, true)+"\n");
});