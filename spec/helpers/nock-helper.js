/**
 * Helper that creates a single-use nock SPARQL endpoint.
 */
global.nockEndpoint = function (status, data, options) {
  var nock = require('nock');
  var querystring = require('querystring');

  // Assuming no-one will need status 0 (non-existent)
  status = status || 200;
  options = options || {};

  var endpoint = options.endpoint || 'http://example.org/sparql';
  var scope = nock(host(endpoint))
    .post(path(endpoint))
    .reply(status, function (uri, requestBody) {
      /* Standard SPARQL JSON response... */
      data = data || {
        head: { link: [], vars: []},
        results: { distinct: false, ordered: true, bindings: [] },
      };
      /* ...but append the request body. */
      data.request = querystring.parse(requestBody);
      return data;
    });

  /* Tack on the endpoint on to the scope so that clients can use the proper
   * mocked URI. */
  scope.endpoint = endpoint;

  return scope;
};
