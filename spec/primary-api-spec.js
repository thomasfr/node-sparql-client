var SparqlClient = require('../');

describe('SPARQL API', function () {

  beforeEach(function () {
    jasmine.addMatchers(customMatchers);
    require('nock').cleanAll();
  });

  describe('SparqlClient', function () {
    describe('constructor', function () {
      it('should connect to an endpoint via a URL', function () {
        var client = new SparqlClient('http://localhost:8080');

        expect(client).toEqual(jasmine.any(SparqlClient));
      });
    });

    describe('#query()', function () {
      it('should return a new SPARQLQuery instance', function () {
        var client = new SparqlClient('http://example.org/sparql');
        var query = client.query('SELECT ("Hello, World" as ?unused) {}');

        /* Check that it has some core methods. */
        expect(query).toEqual(jasmine.objectContaining({
          bind: jasmine.any(Function),
          execute: jasmine.any(Function)
        }));
      });
    });

    describe('#register()', function () {
      it('should register a single prefix for use in all new queries', function (done) {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.register('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.execute(function (err, data) {
          var rawQuery = data.request.query;
          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          done();
        });
      });

      it('should register a multiple prefixes for use in all new queries', function (done) {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.register({
          rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
          xsd:  'http://www.w3.org/2001/XMLSchema#',
          dc:   'http://purl.org/dc/elements/1.1/'
        });

        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.execute(function (err, data) {
          var rawQuery = data.request.query;

          expect(rawQuery).toHavePrefix({rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'});
          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          expect(rawQuery).toHavePrefix({xsd: 'http://www.w3.org/2001/XMLSchema#'});
          expect(rawQuery).not.toHavePrefix({owl: true});
          expect(rawQuery).toHavePrefix({dc: 'http://purl.org/dc/elements/1.1/'});
          done();
        });
      });

      it('should register the base prefix for use in all new queries', function (done) {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.register('http://dbpedia.org/resource/');

        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.execute(function (err, data) {
          var rawQuery = data.request.query;

          expect(rawQuery).toMatch(/\bBASE\s+<.+dbpedia.org.+>/);
          done();
        });
      });

      it('should present a fluent interface', function () {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        var result = client.register({
          rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
          xsd:  'http://www.w3.org/2001/XMLSchema#',
          owl:  'http://www.w3.org/2002/07/owl#'
        });

        expect(result).toEqual(jasmine.any(SparqlClient));
      });
    });

    describe('#registerCommon()', function () {
      it('should register at least one prefix', function (done) {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.registerCommon('rdfs');

        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.execute(function (err, data) {
          var rawQuery = data.request.query;

          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          expect(rawQuery).not.toHavePrefix({rdf: true});
          done();
        });
      });

      it('should register at several prefixes simultaneously', function (done) {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.registerCommon('rdf', 'rdfs', 'xsd');

        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.execute(function (err, data) {
          var rawQuery = data.request.query;

          expect(rawQuery).toHavePrefix({xsd: 'http://www.w3.org/2001/XMLSchema#'});
          expect(rawQuery).toHavePrefix({rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'});
          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          expect(rawQuery).not.toHavePrefix({fn: true});
          expect(rawQuery).not.toHavePrefix({sfn: true});
          done();
        });
      });

      it('should register at all prefixes found in the SPARQL 1.1 query spec.', function (done) {
        // http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#docConventions
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.registerCommon();

        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.execute(function (err, data) {
          var rawQuery = data.request.query;

          expect(rawQuery).toHavePrefix({rdf: true});
          expect(rawQuery).toHavePrefix({rdfs: true});
          expect(rawQuery).toHavePrefix({xsd: true});
          expect(rawQuery).toHavePrefix({fn: true});
          expect(rawQuery).toHavePrefix({sfn: true});
          done();
        });
      });

      it('should present a fluent interface', function () {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        var result = client.registerCommon('rdf', 'rdfs');

        expect(result).toEqual(jasmine.any(SparqlClient));
      });
    });
  });


  describe('Query', function () {
    describe('#register()', function() {
      it('should register the given prefix', function (done) {
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.register('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');

        query.execute(function (err, data) {
          var rawQuery = data.request.query;
          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          done();
        });
      });

      it('should override prefixes in inherited from SparqlClient', function (done) {
        var newPrefix = 'http://example.org/fake#dummy';
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.registerCommon('rdfs');
        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.register('rdfs', newPrefix);

        query.execute(function (err, data) {
          var rawQuery = data.request.query;
          expect(rawQuery).not.toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          expect(rawQuery).toHavePrefix({rdfs: newPrefix});
          done();
        });
      });

      it('should affect only this query', function (done) {
        var newPrefix = 'http://example.org/fake#dummy';
        var scope = nockEndpoint();
        var client = new SparqlClient(scope.endpoint);
        client.registerCommon('rdfs');

        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        query.register('dc', 'http://purl.org/dc/elements/1.1/');
        query.register('rdfs', newPrefix);

        var apresQuery = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');
        apresQuery.execute(function (err, data) {
          var rawQuery = data.request.query;
          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          expect(rawQuery).not.toHavePrefix({dc: true});
          done();
        });
      });

      it('should throw an error when binding suspicious URIs', function () {
        var client = new SparqlClient('http://example.org/sparql');
        var query = client.query('SELECT ?s ?o WHERE { ?s rdfs:label ?o }');

        /* This one is evil. */
        expect(function () {
          query.register('dc', 'http://purl.org/dc/\u0000elements/1.1/');
        }).toThrow();

        /* This is the same one, but less evil. */
        expect(function () {
          query.register('dc', 'http://purl.org/dc/elements/1.1/');
        }).not.toThrow();

        /* This is one is not a valid IRI: */
        expect(function () {
          query.register('hw', 'http://example.org/hello>world');
        }).toThrow();

        /* But the user can always explicitly encode it: */
        expect(function () {
          query.register('hw', encodeURIComponent('http://example.org/hello>world'));
        }).not.toThrow();
      });
    });

    describe('#bind() [single]', function() {

      it('should bind a string literal', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .registerCommon('rdfs')
          .query('SELECT ?s { ?s rdfs:label ?label }');
        query.bind('label', 'chat');

        query.execute(function (error, data) {
          var query = data.request.query;
          expect(query).toMatch(/\?s\s+rdfs:label/);
          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).toMatch(/rdfs:label\s+('|"|'''|""")chat\1/);
          done();
        });
      });

      it('should bind a string literal with a language tag', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .registerCommon('rdfs')
          .query('ASK { ?article rdfs:label ?label }')
          .bind('label', 'chat', {lang: 'fr'})
          .bind('article', {value: 'die', lang: 'de'});

        query.execute(function (error, data) {
          var query = data.request.query;
          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).toMatch(/('|"|'''|""")die\1@de\s+rdfs:label/);
          expect(query).toMatch(/rdfs:label\s+('|"|'''|""")chat\1@fr/);
          done();
        });
      });

      it('should reject invalid langauge tags', function () {
        var query = new SparqlClient('http://example.org/sparql')
          .registerCommon('rdfs')
          .query('ASK { ?article rdfs:label ?label }');
        expect(function () {
          query.bind('label', 'chat', {lang: ''});
        }).toThrow();
        expect(function () {
          query.bind('label', {value: 'chat', lang: 'fr CA'});
        }).toThrow();
      });

      it('should bind a literal with an arbitrary datatype, expressed as a URI', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('ASK { [] ex:v1 ?literal ; ex:v2 ?lateral }');
        query.bind('literal', 'xyz', {datatype: 'http://example.org/ns/userDatatype'});
        query.bind('lateral', {value: 'abc', datatype: 'http://example.org/ns/userDatatype'});

        query.execute(function (error, data) {
          var query = data.request.query;
          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).toMatch(/ex:v1\s+('|"|'''|""")xyz\1\^\^.+userDatatype\b/);
          expect(query).toMatch(/ex:v2\s+('|"|'''|""")abc\1\^\^.+userDatatype\b/);
          done();
        });
      });

      it('should bind a literal with an arbitrary datatype, expressed as a prefixed URI', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register({appNS: 'http://example.org/ns/'})
          .query('SELECT ?s { [] ?p ?literal }')
          .bind('literal', 'xyz', {datatype: {appNS: 'appDataType'}});

        query.execute(function (error, data) {
          var query = data.request.query;
          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).toMatch(/\?p\s+('|"|'''|""")xyz\1\^\^appNS:appDataType\b/);
          done();
        });
      });

      it('should bind an integer literal to a query', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register('ns', 'http://example.org/ns#')
          .query('SELECT ?s { ?s ns:philsophy ?x ; ns:appendages ?y ; ns:termites ?z }')
          .bind('x', {value: 42, type: 'integer' })
          .bind('y', '13', {datatype: {xsd: 'integer'}})
          .bind('z', -7, {type: 'integer'});

        query.execute(function (error, data) {
          var query = data.request.query;
          expect(query).toMatch(/ns:philsophy\s+42\b/);
          expect(query).toMatch(/ns:appendages\s+13\b/);
          expect(query).toMatch(/ns:termites\s+-7\b/);
          done();
        });
      });

      it('should bind decimal literals to a query', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register('db', 'http://example.org/dragonball#')
          .query('ASK WHERE { ?s db:powerLevel ?level ; db:frappuchinoCost ?frap . FILTER ( ?level > ?power )')
          /* Note that decimals MUST be passed as strings! */
          .bind('power', '9000.0', {datatype: {xsd: 'decimal'}})
          .bind('frap', '-4.75', {type: 'decimal'});

        query.execute(function (error, data) {
          var query = data.request.query;

          expect(query).toMatch(/\?level\s+>\s+9000.0\b/);
          expect(query).toMatch(/db:frappuchinoCost\s+-4.75\b/);
          done();
        });
      });

      it('should bind a double literal to a query', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register('ns', 'http://example.org/ns#')
          .query('ASK WHERE { ?s ns:favouriteConstant ' +
                 ' ?google | ?pi_trunc | ?NaN | ?inf | ?unidentity ; }')
          .bind('google', 1e100)
          .bind('pi_trunc', 3.1415)
          .bind('unidentity', -1)
          .bind('NaN', NaN)
          .bind('inf', -Infinity);

        query.execute(function (error, data) {
          var query = data.request.query;

          expect(query).toMatch(/ns:favouriteConstant\s+1e\+?100\b/);
          expect(query).toMatch(/\|\s+3.1415e\+?0\b/);
          expect(query).toMatch(/\|\s+-1e\+?0\b/);
          expect(query).toMatch(/\|\s('|")NaN\1\^\^xsd:double\b/);
          expect(query).toMatch(/\|\s('|")-INF\1\^\^xsd:double\b/);
          done();
        });
      });

      it('should bind a URI to a query', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('ASK { [] ex:v1 ?literal ; ex:v2 ?lateral }');
        query.bind('literal', 'http://example.org/#thing', {type: 'uri'});
        query.bind('lateral', {value: 'http://example.org/#thang', type: 'uri'});

        query.execute(function (error, data) {
          var query = data.request.query;
          expect(query).toMatch(/ex:v1\s+<.+#thing>/);
          expect(query).toMatch(/ex:v2\s+<.+#thang>/);
          done();
        });
      });

      it('should bind a prefixed-URI to a query', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register({appNS: 'http://example.org/ns/'})
          .query('SELECT ?s { [] a ?type }')
          .bind('type', {appNS: 'thang'});

        query.execute(function (error, data) {
          var query = data.request.query;
          expect(query).toMatch(/a\s+appNS:thang/);
          expect(query).toHavePrefix({appNS: 'http://example.org/ns/'});
          done();
        });
      });

      it('should bind booleans to a query', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register({dinder: 'http://example.org/dinder/'})
          .query('SELECT ?s { ?s dinder:hasCats ?cats ; dinder:likesMichaelBolton ?bolton }')
          .bind('cats', true)
          .bind('bolton', false);

        query.execute(function (error, data) {
          var query = data.request.query;
          expect(query).toMatch(/dinder:hasCats\s+true/);
          expect(query).toMatch(/dinder:likesMichaelBolton\s+false/);
          // Swiping right is left as an exercise for the reader.
          done();
        });
      });

      it('should properly escape simple strings', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .registerCommon('rdfs')
          .query('ASK { ?s rdfs:label ?value }')
          .bind('value', '"' + "\\" + "'");

        query.execute(function (error, data) {
          var query = data.request.query;
          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).toMatch(/rdfs:label\s+('|"|'''|""")\\"\\\\\\'\1/);
          done();
        });
      });

      it('should properly escape multi-line strings', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ?s {?s rdfs:label ?value}')
        // NOTE: Escaped characters list: https://www.w3.org/TR/sparql11-query/#grammarEscapes
          .bind('value', '"""' + "'''" + "\t\n\r\b\f" + "\\");

        query.execute(function (error, data) {
          var query = data.request.query;
          /* I applogize for this regex... */
          expect(query).toMatch(/rdfs:label\s+('''|""")\\"\\"\\"\\'\\'\\'\\t\\n\\r\\b\\f\\\\\1/);
          done();
        });
      });

      it('should reject malformed IRIs', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ?s {?s rdfs:label ?value}');

        /* There are A LOT of things that are not allowed in IRIs. */
        expect(function () {
          query.bind('value', {rdfs: 'herp derp'});
        }).toThrow();

        expect(function () {
          query.bind('value', 'http://example.org/hello world', {type: 'uri'});
        }).toThrow();

        expect(function () {
          query.bind('value', encodeURIComponent('http://example.org/hello world'));
          query.bind('value', encodeURIComponent('http://example.org/💩'));
        }).not.toThrow();
      });

      it('should not bind within already-bound strings', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('ASK WHERE { ?s a ?a ; rdfs:label ?b}')
          .bind('a', '?b')
          .bind('b', 'foo');

        query.execute(function (error, data) {
          var query = data.request.query;
          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).not.toMatch(/a\s+((?:'|"|'''|""")?)foo\1/);
          expect(query).toMatch(/\ba\s+('|"|'''|""")\?b\1/);
          expect(query).toMatch(/rdfs:label\s+('|"|'''|""")foo\1/);
          done();
        });
      });

      it('should reject encoding a null-terminator in strings', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ?s {?s ?p ?value}');

        expect(function () {
          query.bind('value', "Literally any\u0000where in the string");
        }).toThrow();
      });

      it('should present a fluent interface', function () {
        var query = new SparqlClient('http://example.org/sparql')
          .query('SELECT ?s { ?s rdfs:label ?label }')
          .bind('label', 'chat');

        /* Check that it has some core methods. */
        expect(query).toEqual(jasmine.objectContaining({
          bind: jasmine.any(Function),
          execute: jasmine.any(Function)
        }));
      });
    });


    describe('#bind() [multiple]', function () {
      it('should bind an object of single bindings', function (done) {
        var scope = nockEndpoint();
        var originalQuery =  'SELECT DISTINCT ?type\n' +
          ' WHERE {\n' +
          ' [] rdfs:label ?creature ;\n' +
          '    dbfr:paws ?paws ;\n' +
          '    dbfr:netWorth ?netWorth ;\n' +
          '    dbfr:weight ?weight ;\n' +
          '    dbfr:grumpy ?grumpy ;\n' +
          '    dbfr:derrivedFrom ?derrivedFrom .\n' +
          '}';
        var query = new SparqlClient(scope.endpoint)
          .register('dbfr', 'http://fr.dbpedia.org/')
          .query(originalQuery)
          .bind({
            creature: {value: 'chat', lang: 'fr'},
            paws: {value: 4, type: 'integer'},
            netWorth: {value: '16777216.25', type: 'decimal'}, // francs
            weight: 3.18, // kg
            grumpy: true,
            derrivedFrom: {value:'http://fr.wikipedia.org/wiki/Grumpy_Cat?oldid=94581698', type:'uri'},
          });

        query.execute(function (error, data) {
          var query = data.request.query;

          /* Match any kind of string delimiter: ('|"|'''|""") ... \1 */
          expect(query).toMatch(/rdfs:label\s+('|"|'''|""")chat\1@fr\b/);
          expect(query).toMatch(/dbfr:paws\s+4\b/);
          expect(query).toMatch(/dbfr:netWorth\s+16777216.25\b/);
          expect(query).toMatch(/dbfr:weight\s+3.18e\+?0\b/);
          expect(query).toMatch(/dbfr:grumpy\s+true\b/);
          expect(query).toMatch(/dbfr:derrivedFrom\s+<http:.+Grumpy_Cat.+>/);

          done();
        });
      });
    });

    describe('#execute()', function() {
      it('should execute a simple query', function(done) {
        var scope = nockEndpoint();
        var originalQuery = 'SELECT DISTINCT ?type { [] a ?type ; rdf:label ?p }';

        new SparqlClient(scope.endpoint)
          .query(originalQuery)
          .execute(function (error, results) {
            expect(error).toBeFalsy();
            expect(results).toBeTruthy();
            expect(results.request.query).toBe(originalQuery);
            done();
          });
      });

      it('should execute a query with bindings', function (done) {
        var scope = nockEndpoint();
        var originalQuery = 'SELECT DISTINCT ?s { ?s a ?type }';
        new SparqlClient(scope.endpoint)
          .registerCommon('xsd')
          .query(originalQuery)
          .bind({
            type: {xsd: 'integer'}
          })
          .execute(function (error, results) {
            var query = results.request.query;
            expect(query).toHavePrefix({xsd: true});
            expect(query).toContain('xsd:integer');
            expect(query).toMatch(/\?s\s+a\s+xsd:integer\b/);
            done();
          });
      });

      it('should execute a query with update keywords', function (done) {
        var scope = nockEndpoint();
        var query = 'SELECT ("""INSERT DATA and DELETE""" as ?update) { }';

        new SparqlClient(scope.endpoint)
          .query(query)
          .execute(function (error, results) {
            expect(results.request.update).toBeUndefined();
            expect(results.request.query).toContain(query);
            done();
          });
      });

      it('should accept arbitrary options', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ("hello" as ?var) { }')
          .execute({format: {resource: 'book'}}, function (err, data) {
            done();
          });
      });

      it('should allow for alternate query and update endpoints', function (done) {
        var queryScope = nockEndpoint();
        var updateScope = nockEndpoint(null, null, {
          endpoint: 'http://example.org/update'
        });

        var client = new SparqlClient(queryScope.endpoint, {
          updateEndpoint: updateScope.endpoint
        });

        // The query
        client.query('SELECT ("""INSERT DATA and DELETE""" as ?update) { }')
          .execute()
          .then(function (results) {
            expect(results.request.update).toBeUndefined();
          })
          .catch(function (err) {
            fail(err);
          })
          // The update
          .then(function () {
            return client
              .query('INSERT DATA { pkmn:Lotad pkdx:evolvesTo pkmn:Lombre }')
              .execute();
          })
          .then(function (results) {
            expect(results.request.update).toBeTruthy();
            done();
          })
          .catch(function (err) {
            fail(err);
          });
      });

      it('should allow for empty response bodies', function (done) {
        var queryScope = nockEndpoint(204, ' ');

        var client = new SparqlClient(queryScope.endpoint);

        // The query
        client.query('INSERT DATA { pkmn:Lotad pkdx:evolvesTo pkmn:Lombre }')
          .execute()
          .then(function (results) {
            expect(results).toBeNull();
            done();
          })
          .catch(function (err) {
            fail(err);
          });
      });

      it('should return a error message on request failure', function (done) {
        /* Based on
         * https://www.w3.org/TR/rdf-sparql-protocol/#select-malformed
         */
        var errorStatus = 400;
        var content = "4:syntax error, unexpected ORDER, expecting '}'";
        var scope = nockEndpoint(errorStatus);

        new SparqlClient(scope.endpoint)
          .query('SELECT ?name WHERE { ?x foaf:name ?name ORDER BY ?name }')
          .execute(function (err, data) {
            expect(err).toBeDefined();
            expect(err.message).toMatch(/\b400\b/);
            expect(err.message).toMatch(/\bBad Request\b/i);

            /* It should also return the http status. */
            expect(err.httpStatus).toBe(400);
            done();
          });
      });

      it('should return a promise', function (done) {
        var scope = nockEndpoint(200, {hello: 'world'});
        var promise = new SparqlClient(scope.endpoint)
          .query('SELECT ("hello" as ?var) { }')
          .execute();

        expect(promise).toBeDefined();
        expect(promise.then).toBeDefined();
        promise.then(function (data) {
          expect(data.hello).toEqual('world');
          done();
        });
      });

      it('should handle return a failed promise', function (done) {
        var scope = nockEndpoint(400);
        var promise = new SparqlClient(scope.endpoint)
          .query('SELECT ("hello" as ')
          .execute();

        promise
          .then(function () {
            fail('Must not fulfill promise; should reject instead');
            done();
          })
          .catch(function (error) {
            expect(error.httpStatus).toBe(400);
            done();
          });
      });

      it('should accept arbitrary options when called as a promise', function (done) {
        var scope = nockEndpoint(200, require('./fixtures/got-genres'));
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ?book ?genre { }')
          .execute({format: {resource: 'book'}})
          .then(done)
          .catch(function (error) {
            fail('Must not reject promise; must fulfill instead');
            done();
          });
      });
    });
  });
});
/*globals jasmine,describe,it,expect,beforeEach,fail*/
/*globals nockEndpoint*/
