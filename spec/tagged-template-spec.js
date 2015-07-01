/**
 * Note: This is an ECMAScript 2015 (ES6) source!
 */

const {SPARQL} = require('../');

describe('SPARQL (tagged templates)', function () {

  it('should not change a standard query', function () {
    var query;
    expect(() => {
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
             }`;
    expect(query).toMatch(/ns:quote\s+('''|""").+?\\"Howdy, y\\'all.\\"\1/);
    expect(query).toMatch(/ns:author\s+auth:Some_Dude_I_guess\b/);
    expect(query).toMatch(/ns:price\s+4.60\b/);
  });
});
