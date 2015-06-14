var SparqlClient = require('../');

describe('SPARQL API', function () {
  'use strict';

  beforeEach(function () {
    jasmine.addMatchers(customMatchers);
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
        expect(query.bind).toBeDefined();
        expect(query.execute).toBeDefined();
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


  describe('SPARQLQuery', function () {
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

        query.execute(function (err, data) {
          var rawQuery = data.request.query;
          expect(rawQuery).toHavePrefix({rdfs: 'http://www.w3.org/2000/01/rdf-schema#'});
          expect(rawQuery).not.toHavePrefix({dc: true});
          done();
        });
      });
    });

    describe('#bind() [single]', function() {
      // Binds variables in the pattern
      it('should bind a string literal', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .registerCommon('rdfs')
          .query('SELECT ?s { ?s rdfs:label ?label }')
          .bind('label', 'chat');
        pending('Assert binding worked as required');
      });

      it('should bind a string literal with a language tag', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .registerCommon('rdfs')
          .query('ASK { ?article rdfs:label ?label }')
          .bind('label', 'chat', {lang: 'fr'})
          .bind('article', {value: 'die', lang: 'de'});
        pending('Assert binding worked as required');
      });

      it('should bind a literal with an arbitrary datatype, expressed as a URI', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ?s { [] ?p ?literal }')
          .bind('literal', 'xyz', {type: 'http://example.org/ns/userDatatype'});
        pending('Assert binding worked as required');
      });

      it('should bind a literal with an arbitrary datatype, expressed as a prefixed URI', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register({appNS: 'http://example.org/ns/'})
          .query('SELECT ?s { [] ?p ?literal }')
          .bind('literal', 'xyz', {type: {appNS: 'appDataType'}});
        pending('Assert binding worked as required');
      });

      it('should bind an integer literal to a query');
      it('should bind an decimal literal to a query');
      it('should bind a double literal to a query');
      it('should bind a URI to a query');
      it('should bind a prefixed-URI to a query');

      it('should bind booleans to a query', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register({dinder: 'http://example.org/dinder/'})
          .query('SELECT ?s { ?s dinder:hasCats ?cats ; dinder:likesMichaelBolton ?bolton }')
          .bind('cats', true)
          .bind('bolton', false);
        // Swiping right, an exercise for the reader.
        pending('Assert binding worked as required');
      });

      it('should properly escape simple strings');

      it('should properly escape multi-line strings', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ?s {?s ?p ?value}')
          .bind('value', '"""' + "'''" + "\n" + "\\");
        pending('Assert binding worked as required');
      });

      it('should properly escape URIs');
      it('should present a fluent interface');
    });

    describe('#bind() [multiple]', function () {
      it('should bind an object of single bindings', function () {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .register('dbpedia-fr', 'http://fr.dbpedia.org/')
          .query('SELECT DISTINCT ?type { [] a ?type ; rdf:label ?p }')
          .bind({
            creature: {value: 'chat', lang: 'fr'},
            paws: 4,
            grumpy: true,
            weight: 3.18, // kg,
            derivedFrom: {uri: 'http://fr.wikipedia.org/wiki/Grumpy_Cat?oldid=94581698'}
          });
        pending('Assert binding worked as required');
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

      it('should execute a query with bindings');

      it('should accept arbitrary options', function (done) {
        var scope = nockEndpoint();
        var query = new SparqlClient(scope.endpoint)
          .query('SELECT ("hello" as ?var) { }')
          .execute({format: {resource: 'book'}}, function (err, data) {
            done();
          });
        pending('Assert query worked as expected');
      });

      it('should return a promise', function (done) {
        pending('Promises not yet implemented');
        var scope = nockEndpoint(400);
        var promise = new SparqlClient(scope.endpoint)
          .query('SELECT ("hello" as ?var) { }')
          .execute();

        expect(promise.then).toBeDefined();
        promise.then(function (data) {
          expect(data.hello).toEqual('world');
          done();
        });
      });

      it('should handle return a failed promise', function (done) {
        pending('Promises not yet implemented');
        var scope = nockEndpoint(400);
        var promise = new SparqlClient(scope.endpoint)
          .query('SELECT ("hello" as ?var) { }')
          .execute();

        expect(promise.then).toBeDefined();
        promise
          .then(function () {
            expect(false).toBe(true);
            done();
          })
          .then(null, function (error) {
            done();
          });
      });
    });
  });
});
