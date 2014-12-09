sparql-client
=============

A simple sparql client written for [Node.js](http://nodejs.org/) (with compatibility for [Apache Fuseki](http://jena.apache.org/documentation/serving_data/)).

Version 0.2.0

Usage
=====

###Querying###
```javascript

var SparqlClient = require('sparql-client');
var util = require('util');
var endpoint = 'http://dbpedia.org/sparql';

// Get the leaderName(s) of the given citys
// if you do not bind any city, it returns 10 random leaderNames
var query = "SELECT * FROM <http://dbpedia.org> WHERE {
    ?city <http://dbpedia.org/property/leaderName> ?leaderName
} LIMIT 10";
var client = new SparqlClient(endpoint);
console.log("Query to " + endpoint);
console.log("Query: " + query);
client.query(query)
  //.bind('city', 'db:Chicago')
  //.bind('city', 'db:Tokyo')
  //.bind('city', 'db:Casablanca')
  .bind('city', '<http://dbpedia.org/resource/Vienna>')
  .execute(function(error, results) {
  process.stdout.write(util.inspect(arguments, null, 20, true)+"\n");1
});

```

###Formatting###

From version 0.2.0 it is possible to add options regarding the formating of the results.
For example, we execute the following query (to retrieve all books and their genres).
```
PREFIX dbpedia-owl: <http://dbpedia.org/owl/>
SELECT ?book ?genre WHERE {
    ?book dbpedia-owl:literaryGenre ?genre
}
```
The *default* formatting (when no options are provided) results, for the bindings (limited to two results in our example), in

```javascript
[{ book :
    {
        type: 'uri',
        value: 'http://live.dbpedia.org/page/A_Game_of_Thrones'
    },
    genre : {
        type: 'uri',
        value: 'http://live.dbpedia.org/page/Fantasy'
    }
}, { book :
    {
        type: 'uri',
        value: 'http://live.dbpedia.org/page/A_Game_of_Thrones'
    },
    genre : {
        type: 'uri',
        value: 'http://live.dbpedia.org/page/Political_strategy'
    }
}]
```
Using the format option *resource* with the resource option set to *book* results in

```javascript
[{ book :
    {
        type: 'uri',
        value: 'http://live.dbpedia.org/page/A_Game_of_Thrones'
    },
    genre : [{
        type: 'uri',
        value: 'http://live.dbpedia.org/page/Fantasy'
    }, {
        type: 'uri',
        value: 'http://live.dbpedia.org/page/Political_strategy'
    }]
}]
```

This makes it easier to process the results later (in the callback), because all the genres are connected to one book (in one binding), and not spread over several bindings.
Calling the *execute* function will look something like this

```javascript
execute({format: 'resource', resource: 'book'}, function(error, results) {
  process.stdout.write(util.inspect(arguments, null, 20, true)+"\n");
});
```

License
=======
The MIT License

Copyright &copy; 2014 Thomas Fritz

Contributors

- Martin Franke (@MtnFranke)
- Pieter Heyvaert ([@PHaDventure](https://twitter.com/PHaDventure))

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
