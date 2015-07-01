/**
 * Note: This source is meant to work on the current version of io.js (2.3.1,
 * as of July 1, 2015). That is, this should run without a transpiler (like
 * traceur). As of now, this means no object destructuring:
 *
 * const {SPARQL} = require('sparql-client');
 */

const SPARQL = require('../').SPARQL;

describe('SPARQL (tagged templates)', function () {

  it('should not change a standard query', function () {
    var query;
    expect(function () {
      query = SPARQL`BASE <http://example.org/books/>
                     PREFIX ns: <http://example.org/ns#>

                     SELECT ?foo
                     FROM <http://example.org/sparql/>
                     WHERE { :book a ?foo }
                     LIMIT 10`;
    }).not.toThrow();

    expect(query.split(/\s+/)).toEqual([
      'BASE', '<http://example.org/books/>',
      'PREFIX', 'ns:', '<http://example.org/ns#>',
      'SELECT', '?foo',
      'FROM', '<http://example.org/sparql/>',
      'WHERE', '{', ':book', 'a', '?foo', '}',
      'LIMIT', '10'
    ]);

  });

  it('should interpolate literals', function () {
    var reasonableInput = `They said, "Howdy, y'all."`;
    var query =
      SPARQL`BASE <http://example.org/books/>
             PREFIX auth: <http://example.org/ns#>
             PREFIX ns: <http://example.org/ns#>

             INSERT DATA {
                :book ns:quote ${reasonableInput} ;
                      ns:author ${{auth: 'Some_Dude_I_guess'}}
                      ns:price ${{value: '4.60', type: 'decimal'}}
                      ns:rating ${-Infinity}
             }`;
    expect(query).toMatch(/ns:quote\s+('''|""").+?\\"Howdy, y\\'all.\\"\1/);
    expect(query).toMatch(/ns:author\s+auth:Some_Dude_I_guess\b/);
    expect(query).toMatch(/ns:price\s+4.60\b/);
    expect(query).toMatch(/ns:rating\s+(['"])-INF\1/);
  });
});
