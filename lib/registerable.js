/**
 * Inherited by anything that needs the methods:
 * #regsiter()
 * #registerCommon()
 */

var _ = require('lodash');
var assert = require('assert');

/**
 * From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#docNamespaces
 */
var COMMON_PREFIXES = {
    rdf:    'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:   'http://www.w3.org/2000/01/rdf-schema#',
    xsd:    'http://www.w3.org/2001/XMLSchema#',
    fn:     'http://www.w3.org/2005/xpath-functions#',
    sfn:    'http://www.w3.org/ns/sparql#'
};

var RegisterablePrototype = module.exports = {
    register: fluent(function register(subject, predicate) {
        if (arguments.length === 1) {
            switch(typeof subject) {
                case 'string':
                    /* Set the base. */
                return void (this.base = subject);
                case 'object':
                    /* Add an object full of prefixes. */
                return addPrefixes(this.prefixes, subject);
            }
        } else if (arguments.length === 2) {
            /* Add single prefix. */
            var obj = {};
            obj[subject] = predicate;
            return addPrefixes(this.prefixes, obj);
        }

        throw new Error('Invalid arguments for #register()');
    }),

    registerCommon: fluent(function () {
        if (arguments.length === 0) {
            return addPrefixes(this.prefixes, COMMON_PREFIXES);
        }

        var prefixes = {};
        for (var i in arguments) {
            var prefix = arguments[i];
            var uri = COMMON_PREFIXES[prefix];
            if (prefix === undefined) {
                throw new Error('`' + prefix + '` is not a known prefix.');
            }
            prefixes[prefix] = uri;
        }

        addPrefixes(this.prefixes, prefixes);
    })
};

/* Helpers. */

function addPrefixes(current, newPrefixes) {
    var inspect = require('util').inspect;
    _.forEach(newPrefixes, function (uri, prefix) {
        current[prefix] = uri;
    });
}

/* Utilities */

/* Wraps a method, making it fluent (i.e., it returns `this`). */
function fluent(method) {
    return function () {
        var result = method.apply(this, arguments);
        assert(result === undefined);
        return this;
    };
}
