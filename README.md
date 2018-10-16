sparql-client
=============

[![Build Status](https://travis-ci.org/eddieantonio/node-sparql-client.svg?branch=master)](https://travis-ci.org/eddieantonio/node-sparql-client)
[![npm Version](https://img.shields.io/npm/v/sparql-client-2.svg)](https://www.npmjs.com/package/sparql-client-2)

# THIS PACKAGE IS NO LONGER MAINTAINED

This package is currently unmaintained. If you would like to adopt this
package, feel free to [open an issue](https://github.com/eddieantonio/node-sparql-client/issues/new) and get in touch with me!

---

A SPARQL 1.1 client for JavaScript.

```javascript
const {SparqlClient, SPARQL} = require('sparql-client-2');
const client =
  new SparqlClient('http://dbpedia.org/sparql')
    .register({
      db: 'http://dbpedia.org/resource/',
      dbo: 'http://dbpedia.org/ontology/',
    });

function fetchCityLeader(cityName) {
  return client
    .query(SPARQL`
           SELECT ?leaderName
           WHERE {
             ${{db: cityName}} dbo:leaderName ?leaderName
           }`)
    .execute()
    // Get the item we want.
    .then(response => Promise.resolve(response.results.bindings[0].leaderName.value));
}

fetchCityLeader('Vienna')
  .then(leader => console.log(`${leader} is a leader of Vienna`));
```


Table of Contents
=================

  * [sparql-client](#sparql-client)
  * [Use](#use)
    * [Using `SPARQL` Tagged Template and Promises (ECMAScript 2015/ES 6)](#using-sparql-tagged-template-and-promises-ecmascript-2015es-6)
    * [Using "Traditional" Node Callbacks](#using-traditional-node-callbacks)
    * [Registering URI Prefixes](#registering-uri-prefixes)
      * [Registering common prefixes](#registering-common-prefixes)
      * [Registering custom prefixes](#registering-custom-prefixes)
    * [Binding variables](#binding-variables)
      * [Explicitly, using `#bind()`](#explicitly-using-bind)
      * [Using the <code>SPARQL</code> template tag](#using-the-sparql-template-tag)
    * [Updates](#updates)
      * [Specifying a different update endpoint](#specifying-a-different-update-endpoint)
    * [Errors](#errors)
    * [Result Formatting](#result-formatting)
  * [License](#license)

Use
===

## Using `SPARQL` [Tagged Template][TT] and [Promises][] (ECMAScript 2015/ES 6)

You may use the `SPARQL` template tag to interpolate variables into the
query. All values are automatically converted into their SPARQL literal
form, and any unsafe strings are escaped.

```javascript
const SparqlClient = require('sparql-client-2');
const SPARQL = SparqlClient.SPARQL;
const endpoint = 'http://dbpedia.org/sparql';

const city = 'Vienna';

// Get the leaderName(s) of the given city
const query =
  SPARQL`PREFIX db: <http://dbpedia.org/resource/>
         PREFIX dbpedia: <http://dbpedia.org/property/>
         SELECT ?leaderName
         FROM <http://dbpedia.org>
         WHERE {
           ${{db: city}} dbpedia:leaderName ?leaderName
         }
         LIMIT 10`;

const client = new SparqlClient(endpoint)
  .register({db: 'http://dbpedia.org/resource/'})
  .register({dbpedia: 'http://dbpedia.org/property/'});

client.query(query)
  .execute()
  .then(function (results) {
    console.dir(results, {depth: null});
  })
  .catch(function (error) {
    // Oh noes! 🙀
  });
```

Results in:

```javascript
{ head: { link: [], vars: [ 'leaderName' ] },
  results:
   { distinct: false,
     ordered: true,
     bindings:
      [ { leaderName: { type: 'literal', 'xml:lang': 'en', value: 'Maria Vassilakou ,' } },
        { leaderName: { type: 'literal', 'xml:lang': 'en', value: 'Michael Häupl' } },
        { leaderName: { type: 'literal', 'xml:lang': 'en', value: 'Renate Brauner ;' } } ] } }
```

[TT]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings
[Promises]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

## Using "Traditional" Node Callbacks

You are not forced to use promises; traditional `(err, results)`
callbacks work too. You may also use `#bind()` to replace `?variables`
in the query with sanitized values:

```javascript
// Get the leaderName(s) of the 10 cities
var query = "SELECT * FROM <http://dbpedia.org> WHERE { " +
  "?city <http://dbpedia.org/property/leaderName> ?leaderName " +
  "} LIMIT 10";
var client = new SparqlClient( 'http://dbpedia.org/sparql')
  .register({db: 'http://dbpedia.org/resource/'});

client.query(query)
  .bind('city', {db: 'Vienna'})
  .execute(function(error, results) {
    console.dir(arguments, {depth: null});
});
```

## Registering URI Prefixes

### Registering common prefixes

Often, SPARQL queries have many prefixes to register.

Common prefixes include:

Prefix | URI
-------|----
`rdf`  | <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
`rdfs` | <http://www.w3.org/2000/01/rdf-schema#>
`xsd`  | <http://www.w3.org/2001/XMLSchema#>
`fn`   | <http://www.w3.org/2005/xpath-functions#>
`sfn`  | <http://www.w3.org/ns/sparql#>


You may register any of the above by passing them to
`#registerCommon()`. This may be done per-query:

```javascript
new SparqlClient(endpoint)
  .query(`SELECT ...`)
  .registerCommon('xsd', 'sfn')
  // Will have PREFIX xsd and sfn to this query only.
  .execute();
```

Or on the client, affecting every subsequent query:

```javascript
client
  .registerCommon('rdfs', 'xsd');
// Will add prefix rdfs and xsd.
client.query('...').execute();
```

### Registering custom prefixes

Using `#register()` on either the client or the query, you can register
any arbitrary prefix:

```javascript
var client = new SparqlClient(endpoint)
  // Can register one at a time:
  .register('ns', 'http://example.org/ns#')
  // Can register in bulk, as an object:
  .register({
      db: 'http://dbpedia.org/resource/',
      dbpedia: 'http://dbpedia.org/property/'
  })
  // Can register a BASE (empty prefix):
  .register('http://example.org/books/');
```

## Binding variables

### Explicitly, using `#bind()`

It's inadvisable to concatenate strings in order to write a query,
especially if data is coming from untrusted sources. `#bind()` allows
you to pass values to queries that will be converted into a safe SPARQL
term.

Say you have a statement like this:

```javascript
var text = 'INSERT DATA {' +
  ' [] rdfs:label ?creature ;' +
  '    dbfr:paws ?paws ;' +
  '    dbfr:netWorth ?netWorth ;' +
  '    dbfr:weight ?weight ;' +
  '    dbfr:grumpy ?grumpy ;' +
  '    dbfr:derrivedFrom ?derrivedFrom .' +
  '}';
```

Each of the `?questionMarked` fields can be bound to JavaScript
values while querying using `#bind()`:

```javascript
client.query(text)
  // Bind one at a time...
  .bind('grumpy', true)
  // Use a third argument to provide options.
  .bind('derrivedFrom', 'http://fr.wikipedia.org/wiki/Grumpy_Cat?oldid=94581698', {type:'uri'})
  // Or bind multiple values at once using an object:
  .bind({
    creature: {value: 'chat', lang: 'fr'},
    paws: {value: 4, type: 'integer'},
    netWorth: {value: '16777216.25', type: 'decimal'}, // francs
    weight: 3.18, // kg
  });
```

### Using the `SPARQL` template tag

Any value that can be bound using `#bind()` can equally be interpolated
using the `SPARQL` template tag: URIs, strings, booleans, language
tagged strings, doubles, literals with custom types­anything! Note the
doubled curly-braces (`${{value: ...}}`) when passing an object.

```javascript
var text = SPARQL`
  INSERT DATA {
    ${{dc: 'eddieantonio'}} ns:favouriteGame ${{db: 'Super_Metroid'}} ;
                rdfs:label ${'@eddieantonio'} ;
                ns:prettyCheekyM8 ${true} ;
                rdfs:label ${{value: 'エディ', lang: 'jp'}} ;
                ns:favoriteConstant ${Math.PI} ;
                ns:favoriteColor ${{value: 'blue', datatype: {ns: 'Color'}}} .
  }`;
```

Then `text` would be the string:

```
  INSERT DATA {
    dc:eddieantonio ns:favouriteGame db:Super_Metroid ;
                rdfs:label '@eddieantonio' ;
                ns:prettyCheekyM8 true ;
                rdfs:label 'エディ'@jp ;
                ns:favoriteConstant 3.141592653589793e0 ;
                ns:favoriteColor 'blue'^^ns:Color .
  }
```

## Updates

There's no need to specify anything special; `LOAD`, `CLEAR`, `DROP`,
`ADD`, `MOVE`, `COPY`, `INSERT DATA`, and `DELETE DATA` are
automatically requested as updates. Just write these statements like any
other:

```javascript
new SparqlClient(endpoint).query(SPARQL`
  INSERT DATA {
    ${{pkmn: 'Lotad'}} pkdx:evolvesTo ${{pkmn: 'Lombre'}}
    ${{pkmn: 'Lombre'}} pkdx:evolvesTo ${{pkmn: 'Ludicolo'}}
  }`)
  .execute();
```

### Specifying a different update endpoint

Some servers have different endpoints for queries and updates. Specify
the alternate options when starting the client:

```javascript
var client = new SparqlClient('http://example.org/query', {
  updateEndpoint: 'http://example.org/update'
});
```

You may use the client subsequently:

```javascript
// Will be sent to http://example.org/update
client.query(SPARQL`
  INSERT DATA {
    ${{pkmn: 'Lotad'}} pkdx:evolvesTo ${{pkmn: 'Lombre'}}
    ${{pkmn: 'Lombre'}} pkdx:evolvesTo ${{pkmn: 'Ludicolo'}}
  }`)
  .execute();

// Will be sent to http://example.org/query
client.query(SPARQL`
  SELECT {
    ${{pkmn: 'Lombre'}} pkdx:evolvesTo ?evolution
  }`)
  .execute()
  .then(response => {
    // Prints Ludicolo
    console.log(response.results.bindings[0].evolution.value)
  });
```

### Overriding request defaults

You can override the request defaults by passing them in the options
object of the constructor. `defaultParams` are the default parameters in
the request, and `requestDefaults` are the default _request options_.
This distinction is a little confusing, so here are some examples:

For example, say you have a graph database that expects `format: 'json'`
as a param rather than the default `format:
'application/sparql-results+json'`. You can override the default when
constructing your client like so:

```js
var client = new SparqlClient('http://example.org/query', {
  defaultParameters: {
    format: 'json'
  }
});
```

Similarly, let's say you want to specify your client's user agent
string. You can pass this, and other headers, as part of
a `requestDefaults` option.

```js
var client = new SparqlClient('http://example.org/query', {
  requestDefaults: {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/sparql-results+json,application/json',
      'User-Agent': 'My Totally Sweet App - 1.0'
    }
  }
});
```

## Errors

If an error occurs, such as when submitting a query with a syntax error,
the first argument to `execute()` will be an `Error` object and have
the `.httpStatus` attribute with the associated HTTP status code.
Usually this is `400` when there is a syntax error, or `500` when the
server refuses to process the request (such as when a timeout occurs).
This status code is defined by the particular SPARQL server used.

```javascript
new SparqlClient(endpoint).query(`
    SELECT ?name
    WHERE { ?x foaf:name ?name
    ORDER BY ?name
  `)
  .execute(function (err, data) {
    console.log(err.httpStatus);
    // logs '400'
    console.log(err);
    // logs 'HTTP Error: 400 Bad Request'
  });
```

This also works with promises:

```javascript
new SparqlClient(endpoint).query(`
    SELECT ?name
    WHERE { ?x foaf:name ?name
    ORDER BY ?name
  `)
  .execute()
  .then(function () {
    // will never reach here!
  })
  .catch(function (err) {
    console.log(err.httpStatus);
    // logs '400'
    console.log(err);
    // logs 'HTTP Error: 400 Bad Request'
  });
```

## Result Formatting

We may want to execute the following query (to retrieve all books and
their genres).

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
  console.dir(arguments, {depth: null});
});
```

License
=======
The MIT License

Copyright © 2014 Thomas Fritz
</br>Copyright © 2015, 2016 Eddie Antonio Santos

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
