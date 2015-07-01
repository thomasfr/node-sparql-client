/**
 * Loads Traceur, if needed.
 */
try {
    eval('`I like to have ${0/0} with my curry.`');
} catch (e) {
    if (e instanceof SyntaxError) {
        var traceur = require('traceur');
        traceur.require.makeDefault(function(filename) {
          // don't transpile our dependencies, just our app
          return filename.indexOf('node_modules') === -1;
        });
    }
}
