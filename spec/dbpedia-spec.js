var SparqlClient = require('../');

var ENDPOINT = 'http://dbpedia.org/sparql';

/* Since this accesses an external resource, ignore it. */
xdescribe('Querying DBPedia', function () {
  it('should yield a list of cities', function (done) {
    var client = new SparqlClient(ENDPOINT);
    var query =
      "SELECT ?city ?leaderName " +
      "FROM <http://dbpedia.org> " +
      "WHERE {" +
      " ?city <http://dbpedia.org/property/leaderName> ?leaderName } " +
      "LIMIT 10";

    client.query(query)
      .execute({format: 'default', resource: 'city'}, function (error, results) {
        expect(results).toEqual(require('./fixtures/cities'));
        done();
      });
  });

  it('should yield, binding to a URI', function (done) {
    var client = new SparqlClient(ENDPOINT);
    var query =
      "SELECT ?postalCode " +
      "FROM <http://dbpedia.org> " +
      "WHERE { ?city <http://dbpedia.org/property/postalCode> ?postalCode } ";

    client.query(query)
      .bind('city', '<http://dbpedia.org/resource/Tokyo>')
      .execute(function (error, results) {
        expect(results).toEqual(require('./fixtures/tokyo'));
        done();
      });
  });

  it('should yield, binding to a prefixed URI', function (done) {
    var client = new SparqlClient(ENDPOINT);
    var query =
      "PREFIX db: <http://dbpedia.org/resource/> " +
      "PREFIX dbpedia-owl: <http://dbpedia.org/ontology/> " +
      "SELECT ?foundingDate " +
      "FROM <http://dbpedia.org> " +
      "WHERE { ?city dbpedia-owl:foundingDate ?foundingDate } ";

    client.query(query)
      .bind('city', 'db:Chicago')
      .execute(function (error, results) {
        expect(results).toEqual(require('./fixtures/chicago'));
        done();
      });
  });

  it('should yield a list of concepts', function (done) {
    var client = new SparqlClient(ENDPOINT);
    var query = 'select distinct ?Concept from <http://dbpedia.org> ' +
      'where {[] a ?Concept} limit 100';

    client.query(query, function (error, results) {
      expect(results).toEqual(require('./fixtures/concepts'));
      done();
    });
  });
});
