/**
 * The methods in Registerable should sit somewhere in the prototype chain  by
 * anything that needs the methods:
 *
 * #regsiter()
 * #registerCommon()
 *
 * Note: the constructor of any object MUST declare `this.prefixes` as an
 * object.
 */

var forEach = require('lodash/forEach');
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
        assert(typeof this.prefixes === 'object' && this.prefixes !== null);

        if (arguments.length === 1) {
            switch(typeof subject) {
                case 'string':
                    /* Set the base. */
                    return addPrefix(this.prefixes, '', subject);
                case 'object':
                    /* Add several prefixes. */
                    return addPrefixes(this.prefixes, subject);
            }
        } else if (arguments.length === 2) {
            /* Add a single prefix. */
            return addPrefix(this.prefixes, subject, predicate);
        }

        throw new Error('Invalid arguments for #register()');
    }),

    registerCommon: fluent(function () {
        assert(typeof this.prefixes === 'object' && this.prefixes !== null);

        /* Add ALL the prefixes. */
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

function addPrefix(current, prefix, uri) {
    current[prefix] = ensureSafeURI(uri);
}

function addPrefixes(current, newPrefixes) {
    forEach(newPrefixes, function (uri, prefix) {
        addPrefix(current, prefix, uri);
    });
}

/**
 * Throws an error when the URI is... uncouth.  Otherwise, return it
 * untouched.
 */
function ensureSafeURI(uri) {
    if (uri.match(/[\u0000\s>]/)) {
        throw new Error('Refusing to add prefix with suspicious URI.');
    }
    return uri;
}

/* Wraps a method, making it fluent (i.e., it returns `this`). */
function fluent(method) {
    return function () {
        var result = method.apply(this, arguments);
        assert(result === undefined);
        return this;
    };
}
