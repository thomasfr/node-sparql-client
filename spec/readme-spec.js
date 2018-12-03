/**
 * These test the README examples.
 */

var nock = require('nock');

describe('The README examples', function () {

  describe('basic usage', function() {
    /* Install the Nock endpoint. */
    beforeEach(function () {
      nock.cleanAll();
      this.endpoint = nockEndpoint(200, require('./fixtures/leader-names'), {
        endpoint: 'http://dbpedia.org/sparql'
      });
    });

    it('should work with node-style callbacks', function (done) {
      var SparqlClient = require('../');
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
        expect(error).toBeFalsy();

        expect(results.head)
          .toEqual(require('./fixtures/leader-names').head);
        expect(results.results)
          .toEqual(require('./fixtures/leader-names').results);

        done();
      });
    });

    it('should work with promises', function (done) {
      var SparqlClient = require('../');
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
        .execute()
        .then(function (results) {
          expect(results.head)
            .toEqual(require('./fixtures/leader-names').head);
          expect(results.results)
            .toEqual(require('./fixtures/leader-names').results);

          done();
        })
        .catch(function (error) {
          fail('Control should never reach here.');
          done();
        });
    });
  });

  describe('Formatting style', function () {

    /* Install the Nock endpoint. */
    beforeEach(function () {
      nock.cleanAll();
      this.endpoint = nockEndpoint(200, require('./fixtures/got-genres'), {
        endpoint: 'http://dbpedia.org/sparql'
      });
    });

    it('should format the results', function (done) {
      var SparqlClient = require('../');
      var endpoint = 'http://dbpedia.org/sparql';

      // Get the leaderName(s) of the given cities
      // if you do not bind any city, it returns 10 random leaderNames
      var query = "SELECT ?book ?genre WHERE { ?book dbpedia-owl:literaryGenre ?genre . }";
      var client = new SparqlClient(endpoint)
        .register({'dbpedia': 'http://dbpedia.org/resource/'})
        .register({'dbpedia-owl': 'http://dbpedia.org/ontology/'});

      client.query(query)
        .bind({got: {dbpedia: 'A_Game_of_Thrones'}})
        .execute({format: {resource: 'book'}})
        .then(function (results) {
          expect(results.results.bindings).toEqual([
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
          ]);

          done();
        })
        .catch(function (error) {
          fail('Control should never reach here.');
          done();
        });
    });
  });
});
