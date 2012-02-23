var request = require('request');
var querystring = require('querystring');
var http = require('http');
var _ = require('underscore');

var sparql = module.exports = function (endpoint, options) {
    var defaults = {
        url:endpoint,
        method:'POST',
        encoding:'utf8',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded',
            'Accept':'application/json'
        }
    };
    this._defaultParameters = {
        format:'application/json',
        "content-type":'application/json'
    };
    this._defaults = _.extend(defaults, options);
    this.request = request.defaults(this._defaults);
}

sparql.prototype.query = function query(query, callback) {
    var body = _.extend(this._defaultParameters, {query:query});
    var opts = {
        body:querystring.stringify(body)
    };
    this.request(opts, function (error, response, responseBody) {
        if (error || response.statusCode >= 300) {
            return callback({
                statusCode:response.statusCode,
                statusMessage:http.STATUS_CODES[response.statusCode],
                response:response,
                errorObject:error || null
            });
        }
        else {
            var data = responseBody;
            _.each(response.headers, function (val, key) {
                if (!_.isString(val)) return;
                key = key.toLowerCase();
                if (key !== 'content-type') return;

                val = val.toLowerCase();
                if (val.match(/application\/json/gi)) {
                    try {
                        data = JSON.parse(data);
                    }
                    catch (e) {
                        callback({
                            statusCode:response.statusCode,
                            statusMessage:http.STATUS_CODES[response.statusCode],
                            response:response,
                            errorObject:error || null
                        });
                        return;
                    }
                }
                callback(null, data);
                return;
            });
        }
    });
}