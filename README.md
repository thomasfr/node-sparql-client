sparql-client
=============

A simple sparql client written for node.js (with compatibility for Apache Fuseki).

Usage
=====

```javascript

var SparqlClient = require('sparql-client');
var util = require('util');
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

```

License
=======
The MIT License

Copyright (c) 2012 Thomas Fritz

Contributors
  - Martin Franke (@MtnFranke)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
