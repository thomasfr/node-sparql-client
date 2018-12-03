var nock = require('nock');

var SparqlClient = require('../');

describe('GitHub Issues', function () {
  describe('thomasfr/node-sparql-client#6', function () {
    it('should not crash on HTTP response error', function (done) {
      var host = 'http://example.org';
      var endpoint = 'http://example.org/sparql';

      nock(host)
        .post('/sparql')
        .reply(503, { result: {} });

      var client = new SparqlClient(endpoint);
      client
        .query('SELECT ("hello" as ?var) { }')
        .execute(function (err, _response) {
          expect(err).toBeTruthy();
          done();
        });
    });
  });

  describe('thomasfr/node-sparql-client#11', function () {
    it('should not maintain state after doing an update', function (done) {
      var host = 'http://example.org';
      var endpoint = 'http://example.org/sparql';

      var scope = nock(host)
        .post('/sparql')
        .twice()
        .reply(200, replyWithArgsPresent);

      var client = new SparqlClient(endpoint);
      client
        .query('INSERT DATA { [] rdfs:label "hello" }')
        .execute(function (err1, data) {
          expect(err1).toBeFalsy();
          expect(data.update).toBeTruthy();
          expect(data.query).toBeFalsy();

          client
            .query('SELECT ("hello" as ?var) { }')
            .execute(function (err2, data) {
              expect(err2).toBeFalsy();
              expect(data.update).toBeFalsy();
              expect(data.query).toBeTruthy();

              scope.done();
              done();
            });
        });

      function replyWithArgsPresent(uri, body) {
        return {
          update: !!body.match(/update=/),
          query: !!body.match(/query=/)
        };
      }
    });
  });

  describe('#8', function () {
    it('should accept dashes in IRIs', function (done) {
      var scope = nockEndpoint();
      var query = new SparqlClient(scope.endpoint)
        .query('ASK { [] ex:v1 ?literal ; [] ex:v1 ?lateral }');

      // This IRI has a dash in it:
      query.bind('literal', 'http://example.org/this-is-valid', {type: 'uri'});
      // This is an internationalized URI, with dashes!
      query.bind('literal', 'http://💩.la/this-is-valid', {type: 'uri'});

      query.execute(function (error, data) {
        expect(error).toBeFalsy();
        expect(data).toBeTruthy();
        done();
      });
    });
  });
});

/* global nockEndpoint */
