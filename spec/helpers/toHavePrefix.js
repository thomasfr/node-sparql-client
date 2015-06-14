var matchers = global.customMatchers = global.customMatchers || {};

/**
 * Given a string, interprets it as a query, and ensures that it has the given
 * The given URI can be passed as `true` to match *any* URI.
 */
matchers.toHavePrefix = function (util, customEqualityTesters) {
  return {
    compare: function (actual, expected) {
      var result = {};
      var prefix = Object.keys(expected)[0];
      var uri = expected[prefix];

      var uriPattern = (uri === true) ?  '[^>]*' : escapeRegExp(uri);

      var pattern = new RegExp('PREFIX\\s+' +
                               escapeRegExp(prefix) +
                               ':\\s+<' +
                               uriPattern +
                               '>');

      result.pass = !!actual.match(pattern);
      if (result.pass) {
        result.message = 'Expected `' + actual +
          '` to not declare the prefix ' + prefix +
          ' as ' + uri;
      } else {
        result.message = 'Expected `' + actual +
          '` to declare the prefix ' + prefix +
          ' as ' + uri;
      }

      return result;
    }
  };
};

/* From: http://stackoverflow.com/a/6969486 */
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
