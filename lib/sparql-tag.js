/**
 * Implements an ECMAScript 2015 template tag in ECMAScript 5...
 */
var Term = require('./term');

module.exports = SPARQL;

function SPARQL(template) {
    // This would be easier in ES6:
    // function SPARQL(template, ...subsitutions) { ... }
    var substitutions = [].slice.call(arguments, 1);
    var result = template[0];

    substitutions.forEach(function (value, i) {
        result += Term.create(value).format() + template[i + 1];
    });

    return result;
}
