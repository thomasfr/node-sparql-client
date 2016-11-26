/**
 * An IRI is like a URI but forbids spaces.
 */

var Term = require('./term');

module.exports = IRI;

/**
 * Base IRI.
 */
function IRI() {
  Term.call(this);
}

IRI.prototype = Object.create(Term.prototype, {
  type: { value: 'uri', enumerable: true }
});

/**
 * Returns an IRI for whatever is passed in.
 */
IRI.create = function (value) {
  if (typeof value === 'object') {
    return IRI.createFromObject(value);
  } else if (typeof value === 'string') {
    return new IRIReference(value);
  } else {
    throw new TypeError('Invalid IRI');
  }
};

/**
 * Returns an IRI object or null if none can be created.
 */
IRI.createFromObject = function (object) {
  var namespace;
  var value;
  var keys = Object.keys(object);
  if (keys.length !== 1) {
    throw new Error('Invalid prefixed IRI.');
  }

  namespace = keys[0];
  value = object[namespace];

  if (typeof value !== 'string') {
    throw new TypeError('Invalid prefixed IRI.');
  }

  /* TODO: This is NOT a sufficient regex! */
  if (!/^[^\s;.,<|$]+$/.test(value)) {
    throw new Error('Invalid IRI identifier');
  }

  return new PrefixedNameIRI(namespace, value);
};

/**
 * A Prefixed Name like:
 * book:book1
 * or
 * :book1
 */
function PrefixedNameIRI(namespace, identifier) {
  IRI.call(this);
  this.namespace = namespace;
  this.id = identifier;
}

PrefixedNameIRI.prototype = Object.create(IRI.prototype, {
  value: {
    get: function () { return 'INVALID!' + this.format(); },
    enumerable: true
  }
});

PrefixedNameIRI.prototype.format = function () {
  return this.namespace + ':' + this.id;
};

/**
 * An IRI reference like:
 *
 * <http://example.org/book/book1> or <book1>.
 */
function IRIReference(iri) {
  IRI.call(this);
  /*
   * IRIREF is defined here:
   * http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#rIRIREF
   */
  if (!/^[^<>"{}|^`\\\u0000-\u0020]*$/.test(iri)) {
    throw new Error('Invalid IRI: ' + iri);
  }
  this.iri = iri;
}

IRIReference.prototype = Object.create(IRI.prototype, {
  value: { get: function () { return this.iri; }, enumerable: true }
});

IRIReference.prototype.format = function () {
  return '<' + this.iri + '>';
};

