var nock = require('nock');
var SparqlClient = require('../');

var ENDPOINT = 'http://dbpedia.org/sparql';

/* Since this accesses an external resource, ignore it. */
describe('Querying DBPedia', function () {

  beforeAll(function () {
    nock.disableNetConnect();
  });

  it('should yield a list of cities', function (done) {
    var scope = nock(host(ENDPOINT))
      .post(path(ENDPOINT))
      .reply(200, require('./fixtures/cities.raw'));

    var client = new SparqlClient(ENDPOINT);
    var query =
      "SELECT ?city ?leaderName " +
      "FROM <http://dbpedia.org> " +
      "WHERE {" +
      " ?city <http://dbpedia.org/property/leaderName> ?leaderName } " +
      "LIMIT 10";

    client.query(query)
      .execute({format: {resource: 'city'}}, function (error, results) {
        expect(results).toEqual(require('./fixtures/cities'));
        scope.done();
        done();
      });
  });

  it('should yield, binding to a URI', function (done) {
    var scope = nock(host(ENDPOINT))
      .post(path(ENDPOINT))
      .reply(200, require('./fixtures/tokyo'));

    var client = new SparqlClient(ENDPOINT);
    var query =
      "SELECT ?postalCode " +
      "FROM <http://dbpedia.org> " +
      "WHERE { ?city <http://dbpedia.org/property/postalCode> ?postalCode } ";

    client.query(query)
      .bind('city', 'http://dbpedia.org/resource/Tokyo', {type:'uri'})
      .execute(function (error, results) {
        expect(results).toEqual(require('./fixtures/tokyo'));
        scope.done();
        done();
      });
  });

  it('should yield, binding to a prefixed URI', function (done) {
    var scope = nock(host(ENDPOINT))
      .post(path(ENDPOINT))
      .reply(200, require('./fixtures/chicago'));

    var client = new SparqlClient(ENDPOINT);
    var query =
      "PREFIX db: <http://dbpedia.org/resource/> " +
      "PREFIX dbpedia-owl: <http://dbpedia.org/ontology/> " +
      "SELECT ?foundingDate " +
      "FROM <http://dbpedia.org> " +
      "WHERE { ?city dbpedia-owl:foundingDate ?foundingDate } ";

    client.query(query)
      .bind('city', {db: 'Chicago'})
      .execute(function (error, results) {
        expect(results).toEqual(require('./fixtures/chicago'));
        scope.done();
        done();
      });
  });

  it('should yield a list of concepts', function (done) {
    var scope = nock(host(ENDPOINT))
      .post(path(ENDPOINT))
      .reply(200, require('./fixtures/concepts'));

    var client = new SparqlClient(ENDPOINT);
    var query = 'select distinct ?Concept from <http://dbpedia.org> ' +
      'where {[] a ?Concept} limit 100';

    client.query(query, function (error, results) {
      expect(results).toEqual(require('./fixtures/concepts'));
      scope.done();
      done();
    });
  });
});
