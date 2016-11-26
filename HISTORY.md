0.6.1 / 2016-11-16
==================

 * Fixed erroneous IRIREF production [#8](https://github.com/thomasfr/node-sparql-client/issues/6)—thanks [paulwilton](https://github.com/paulwilton)!

0.6.0 / 2016-04-25
==================

 * Add `defaultParams` and `requestDefaults` options

0.5.1 / 2016-04-24
==================

 * Fixed crash when response contains empty body.

0.5.0 / 2016-04-24
==================

 * Added support for alternate query and update endpoints
   (specified on the client as `{ updateEndpoint: '...' }`

0.4.2 / 2016-02-24
==================

 * Added explicit support for HTTP Error messages. Errors are patched
   with `.httpStatus` to indicate status code.

0.4.0 / 2015-07-01 🍁
====================

 * Query mechanism refactored.
 * `Query#bind()` is very exception happy method; the opinion of this module is anything that _looks_ unsafe should be dealt with immediately.
 * Tried darnedest not to throw weird errors on `execute()` from within the module.
 * Better mapping of JavaScript numbers to SPARQL doubles (or `xsd:double`).
 * Added `SPARQL` template tag (ECMAScript 2015).

0.3.0 / 2015-06-20
==================

 * Fixed [#6](https://github.com/thomasfr/node-sparql-client/issues/6)—thanks [pheyvaer](https://github.com/pheyvaer)!
 * Fixed [#11](https://github.com/thomasfr/node-sparql-client/issues/11)—thanks [dkrantsberg](https://github.com/dkrantsberg)!
 * Fixed erroneously turning a query (`ASK`, `SELECT`, `CONSTRUCT`, `DESCRIBE`) into an update if `DELETE` or `INSERT DATA` is present _anywhere_ in the query.
 * Updated API (breaks backwards-compatibility):
  - Add URI prefixes: both globally and per query using `#register()` and `#registerCommon()`
  - Escape bindings to _attempt_ to prevent SPARQL injection!
  - Apply formatting with `{format: { resource: 'binding_name' } }` instead of `{format: 'resource', resource: 'binding_name'}`
  - Multiple binds supported in one call to `#bind()`
  - Support binding [SPARQL 1.1 literals](http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#QSynLiterals); breaks backwards compatibility since this is dependent on the type of arguments, whereas before, everything would be silently coerced into a string.
  - `#execute` supports Promises/A+ API.
  - API has a "fail-fast" attitude and complains bitterly if given suspicious input.
 * Added a whackload of Jasmine specs, though by no means does this constitute a comprehensive test suite.

0.2.0 / 2014-12-09
==================

 * Added formatting feature
 * Fixed error when sparql endpoint is not reachable

0.1.0 / 2014-08-22
==================

 * Version bump.
 * Updated dependencies.
 * Changed underscore dep to lodash.
 * removed querystring, as it is in core.
 * Merge pull request #4 from MtnFranke/master
 * Validated package.json file.
 * Added 'DELETE' functionality.
 * Fixed typo.
 * Updated README.md and package.json.
 * Added Fuseki INSERT DATA compability.
 * Changed return type to work with the latest version of fuseki.

0.0.2 / 2012
============

 * Added support for binding variables
 * Initial commit
