/**
 * An IRI is like a URI but forbids spaces.
 */

module.exports = IRI;

function IRI(namespace, identifier) {
    this.namespace = namespace;
    this.id = identifier;
}

IRI.prototype = Object.create(require('./term'));

IRI.prototype.format = IRI.prototype.toString = function () {
    return this.namespace + ':' + this.id;
};

/**
 * Returns an IRI object or null if none can be created.
 */
IRI.createFromObject = function (object) {
    var namespace, value, keys = Object.keys(object);
    if (keys.length != 1) {
        return null;
    }

    namespace = keys[0];
    value = object[namespace];

    if (typeof value !== 'string') {
        return null;
    }

    return new IRI(namespace, value);
};
