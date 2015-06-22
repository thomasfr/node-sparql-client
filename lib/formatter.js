//this method formats the reponse (in place), using @options
var format = function format(response, options) {
    if (options.format && options.format.resource) {
        formatUsingResource(response, options.format.resource);
    }
};

//formats the reponse in place, based on @resourceVar
var formatUsingResource = function format(response, resourceVar) {
    var results = [];
    var bindings = response.results.bindings;
    var nonResourceVars = findNonResourceVars(resourceVar, response.head.vars);

    bindings.forEach(function (b) {
        var index = indexResource(resourceVar, b, results);
        if (index > -1) {
            //already found before
            results[index] = mergeResourceBinding(results[index], b, nonResourceVars);
        }
        else {
            //first time with this base value
            results.push(createResourceBinding(b, resourceVar, nonResourceVars));
        }
    });

    response.results.bindings = results;
};

//this methods find all the variables of the SPARQL query that are not the 'base'
//the base is the variable name of the resource used
var findNonResourceVars = function findNonResourceVars(resourceVar, allVars) {
    var index = allVars.indexOf(resourceVar);
    var nonResourceVars = allVars;

    if (index < 0) {
        throw 'Formatting using "resource" failed, because the variable of the resource was not found in the query.';
    }

    nonResourceVars.splice(index, 1);
    return nonResourceVars;
};

//this method is called when the first binding with a unique value for the resourceVar has been found
var createResourceBinding = function createResourceBinding(binding, resourceVar, nonResourceVars) {
    var newBinding = {};
    newBinding[resourceVar] = binding[resourceVar];

    nonResourceVars.forEach(function (nr) {
        if (binding[nr]) {
            newBinding[nr] = [binding[nr]];
        }
        else {
            newBinding[nr] = [];
        }
    });

    return newBinding;
};

//this method merges an exisiting binding (of a resourceVar) with another one that has information about the same resource
var mergeResourceBinding = function mergeResourceBinding(basebinding, binding, nonResourceVars) {
    nonResourceVars.forEach(function (nr) {
        //check if the binding has information about that nonResource
        if (binding[nr]) {
            //check if the information is unique
            if (indexValueType(basebinding[nr], binding[nr]) < 0) {
                basebinding[nr].push(binding[nr]);
            }
        }
    });

    return basebinding;
};

//this method compares two value-types, based on their value and type
//is incomplete
//returns true if the same
var compareValueType = function compareValueType(vt1, vt2) {
    return vt1.type === vt1.type && vt1.value === vt2.value;
};

//this method returns the index of a value-type in an array of value-types.
var indexValueType = function indexValueType(array, vt) {
    var i = 0;

    while (i < array.length && !compareValueType(array[i], vt)) {
        i++;
    }

    if (i < array.length) {
        return i;
    }
    else {
        return -1;
    }
};


//this method returns the index of a binding in an array of bindings, around a specific resourceVar
//returns -1 if the binding is not found
var indexResource = function indexResource(resourceVar, binding, bindings) {
    var i = 0;

    while (i < bindings.length && bindings[i][resourceVar].value != binding[resourceVar].value) {
        i++;
    }

    if (i < bindings.length) {
        return i;
    }
    else {
        return -1;
    }
};

exports.format = format;
