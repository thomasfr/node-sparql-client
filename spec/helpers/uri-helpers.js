/**
 * Adds host() and path() to make extracting each from URLs slightly easier.
 */
var url = require('url');

global.host = function (uri) {
  var result = url.parse(uri, false, true);
  return result.protocol + '//' + result.host;
};

global.path = function (uri) {
  return url.parse(uri).pathname;
};
