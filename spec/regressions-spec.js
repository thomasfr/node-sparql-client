var nock = require('nock');

var SparqlClient = require('../');

describe('GitHub Issues', function () {

  describe('#6', function () {
    it('should not crash on HTTP response error', function (done) {
      var host = 'http://example.org';
      var endpoint = 'http://example.org/sparql';

      nock(host)
        .post('/sparql')
        .reply(503, { result: {} });

      var client = new SparqlClient(endpoint);
      client
        .query('SELECT ("hello" as ?var) { }')
        .execute(function (err, response) {
          expect(err).toBeTruthy();
          done();
        });
    });
  });

  describe('#11', function () {
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

      function replyWithArgsPresent (uri, body) {
        return {
          update: !!body.match(/update=/),
          query: !!body.match(/query=/)
        };
      }
    });
  });

});
