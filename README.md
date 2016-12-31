sparql-client
=============

[![Build Status](https://travis-ci.org/eddieantonio/node-sparql-client.svg?branch=v0.3.0)](https://travis-ci.org/eddieantonio/node-sparql-client)

A SPARQL client written for [Node.js](http://nodejs.org/) (with compatibility for [Apache Fuseki](http://jena.apache.org/documentation/serving_data/)).

Version 0.3.1

Usage
=====

###Querying###

#### Node style

```javascript
var SparqlClient = require('sparql-client');
var util = require('util');
var endpoint = 'http://dbpedia.org/sparql';

// Get the leaderName(s) of the given cities
// if you do not bind any city, it returns 10 random leaderNames
var query = "SELECT * FROM <http://dbpedia.org> WHERE { " +
"    ?city <http://dbpedia.org/property/leaderName> ?leaderName " +
"} LIMIT 10";
var client = new SparqlClient(endpoint)
  .register({db: 'http://dbpedia.org/resource/'});

client.query(query)
  .bind('city', {db: 'Vienna'})
  .execute(function(error, results) {
    process.stdout.write(util.inspect(arguments, null, 20, true)+"\n");
});
```

#### With Promises

```javascript
var SparqlClient = require('sparql-client');
var util = require('util');
var endpoint = 'http://dbpedia.org/sparql';

// Get the leaderName(s) of the given citys
// if you do not bind any city, it returns 10 random leaderNames
var query = "SELECT * FROM <http://dbpedia.org> WHERE { " +
"    ?city <http://dbpedia.org/property/leaderName> ?leaderName " +
"} LIMIT 10";
var client = new SparqlClient(endpoint)
  .register({db: 'http://dbpedia.org/resource/'});

client.query(query)
  .bind('city', {db: 'Vienna'})
  .execute()
  .then(function (results) {
    process.stdout.write(util.inspect(results, null, 20, true)+"\n");
  })
  .catch(function (error) {
    process.stderr.write(util.inspect(error, null, 20, true)+"\n");
  });
});
```

###Formatting###

From version 0.2.0 it is possible to add options regarding the formating of the results.
For example, we execute the following query (to retrieve all books and their genres).

```sparql
PREFIX dbpedia-owl: <http://dbpedia.org/owl/>
SELECT ?book ?genre WHERE {
    ?book dbpedia-owl:literaryGenre ?genre
}
```
The *default* formatting (when no options are provided) results, for the bindings (limited to two results in our example), in

```javascript
[
  {
    book: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/A_Game_of_Thrones'
    },
    genre: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/Fantasy'
    }
  },
  {
    book: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/A_Game_of_Thrones'
    },
    genre: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/Political_strategy'
    }
  }
]
```

Using the format option *resource* with the resource option set to
*book* like so:

```javascript
query.execute({format: {resource: 'book'}}, function(error, results) {
  // ...
});
```

Results in:

```javascript
[
  {
    book: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/A_Game_of_Thrones'
    },
    genre: [
      {
        type: 'uri',
        value: 'http://dbpedia.org/resource/Fantasy'
      },
      {
        type: 'uri',
        value: 'http://dbpedia.org/resource/Political_strategy'
      }
    ]
  }
]
```

This makes it easier to process the results later (in the callback), because all the genres are connected to one book (in one binding), and not spread over several bindings.
Calling the *execute* function will look something like this

```javascript
query.execute({format: {resource: 'book'}}, function(error, results) {
  process.stdout.write(util.inspect(arguments, null, 20, true)+"\n");
});
```

License
=======
The MIT License

Copyright © 2014 Thomas Fritz
</br>Copyright © 2015 Eddie Antonio Santos

Contributors

- Martin Franke (@MtnFranke)
- Pieter Heyvaert ([@PHaDventure](https://twitter.com/PHaDventure))
- Eddie Antonio Santos ([@eddieantonio](http://eddieantonio.ca/))

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
