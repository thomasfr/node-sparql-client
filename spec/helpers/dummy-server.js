/**
 * An actual fake HTTP server! Intended to mock requests.
 *
 * Usage:
 *
 *  var server = new DummyServer().start(3000, done);
 *  server.nextStatus = 400;
 *  server.nextBody = {status: false};
 *
 *  // After a request is made...
 *  server.lastRequest.statusCode === 400;
 */

var http = require('http');
var url = require('url');
var querystring = require('querystring');

var DummyServer = global.DummyServer = function DummyServer() {
  var self = this;

  this.nextBody = undefined;
  this.nextStatus = undefined;
  this.lastRequest = undefined;
  this._server = null;

  Object.defineProperty(this, 'lastQuery', {
    get: function () {
      var qs = url.parse(self.lastRequest.url).query;
      return querystring.parse(url).query;
    }
  });
};

DummyServer.prototype.start = function start(port, done) {
  var self = this;
  var server = this._server = http.createServer(function (req, res) {
    var status = self.nextStatus || 200;
    var body = self.nextBody || {
      head: {vars: {}},
      results: {bindings: []}
    };

    var bodySerialized = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Length': bodySerialized.length,
      'Content-Type': 'application/json'
    });
    res.end(bodySerialized, 'UTF-8');

    self.resetState();
    self.lastRequest = req;
    delete self.lastRequest.socket;
  });

  server.listen(port, function () {
    done();
  });
  return this;
};

DummyServer.prototype.stop = function stop(done) {
  this._server.close(function () {
    done();
  });
};

DummyServer.prototype.resetState = function () {
  this.nextBody = undefined;
  this.nextStatus = undefined;
};
