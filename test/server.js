var PeerServer = require('../').PeerServer;
var expect = require('expect.js');
var sinon = require('sinon');

describe('PeerServer', function() {
  describe('constructor', function() {
    before(function() {
      PeerServer.prototype._initializeWSS = sinon.stub();
      PeerServer.prototype._initializeHTTP = sinon.stub();
    });

    it('should be able to be created without the `new` keyword', function() {
      var p = PeerServer();
      expect(p.constructor).to.be(PeerServer);
    });

    it('should default to port 80, key `peerjs`', function() {
      var p = new PeerServer();
      expect(p._options.key).to.be('peerjs');
      expect(p._options.port).to.be(80);
    });

    it('should accept a custom port', function() {
      var p = new PeerServer({ port: 8000 });
      expect(p._options.port).to.be(8000);
    });
  });

  describe('#_initializeWSS', function() {
    WebSocketServer = sinon.stub();

  });

  describe('#_configureWS', function() {

  });

  describe('#_checkKey', function() {
    var p;
    before(function() {
      PeerServer.prototype._initializeHTTP = sinon.stub();
      p = new PeerServer({ port: 8000 });
      p._checkKey('peerjs', 'myip', function() {});
    });

    it('should reject keys that are not the default', function(done) {
      p._checkKey('bad key', null, function(response) {
        expect(response).to.be('Invalid key provided');
        done();
      });
    });

    it('should accept valid key/ip pairs', function(done) {
      p._checkKey('peerjs', 'myip', function(response) {
        expect(response).to.be(null);
        done();
      });
    });

    it('should reject ips that are at their limit', function(done) {
      p._options.ip_limit = 0;
      p._checkKey('peerjs', 'myip', function(response) {
        expect(response).to.be('myip has reached its concurrent user limit');
        done();
      });
    });

    it('should reject when the server is at its limit', function(done) {
      p._options.concurrent_limit = 0;
      p._checkKey('peerjs', 'myip', function(response) {
        expect(response).to.be('Server has reached its concurrent user limit');
        done();
      });
    });

  });

  describe('#_initializeHTTP', function() {

  });

  describe('#_startStreaming', function() {

  });

  describe('#_pruneOutstanding', function() {

  });

  describe('#_processOutstanding', function() {

  });

  describe('#_removePeer', function() {
    var p;
    before(function() {
      PeerServer.prototype._initializeHTTP = sinon.stub();
      p = new PeerServer({ port: 8000 });

      var fake = {ip: '0.0.0.0'};
      p._ips[fake.ip] = 1;
      p._clients['peerjs'] = {};
      p._clients['peerjs']['test'] = fake;
    });

    it('should decrement the number of ips being used and remove the connection', function() {
      expect(p._ips['0.0.0.0']).to.be(1);
      p._removePeer('peerjs', 'test');
      expect(p._ips['0.0.0.0']).to.be(0);
      expect(p._clients['peerjs']['test']).to.be(undefined);
    });
  });

  describe('#_handleTransmission', function() {
    var p;
    var KEY = 'peerjs';
    var ID = 'test';
    before(function() {
      PeerServer.prototype._initializeHTTP = sinon.stub();
      p = new PeerServer({ port: 8000 });
      p._clients[KEY] = {};
    });

    it('should send to the socket when appropriate', function() {
      var send = sinon.spy();
      var write = sinon.spy();
      var message = {dst: ID};
      p._clients[KEY][ID] = {
        socket: {
          send: send
        },
        res: {
          write: write
        }
      }
      p._handleTransmission(KEY, message);
      expect(send.calledWith(JSON.stringify(message))).to.be(true);
      expect(write.calledWith(JSON.stringify(message))).to.be(false);
    });

    it('should write to the response with a newline when appropriate', function() {
      var write = sinon.spy();
      var message = {dst: ID};
      p._clients[KEY][ID] = {
        res: {
          write: write
        }
      }
      p._handleTransmission(KEY, message);
      expect(write.calledWith(JSON.stringify(message) + '\n')).to.be(true);
    });

    // no destination.
    it('should push to outstanding messages if the destination is not found', function() {
      var message = {dst: ID};
      p._outstanding[KEY] = {};
      p._clients[KEY] = {};
      p._handleTransmission(KEY, message);
      expect(p._outstanding[KEY][ID][0]).to.be(message);
    });

    it('should not push to outstanding messages if the message is a LEAVE or EXPIRE', function() {
      var message = {dst: ID, type: 'LEAVE'};
      p._outstanding[KEY] = {};
      p._clients[KEY] = {};
      p._handleTransmission(KEY, message);
      expect(p._outstanding[KEY][ID]).to.be(undefined);

      message = {dst: ID, type: 'EXPIRE'};
      p._handleTransmission(KEY, message);
      expect(p._outstanding[KEY][ID]).to.be(undefined);
    });

    it('should remove the peer if there is no dst in the message', function() {
      var message = {type: 'LEAVE'};
      p._removePeer = sinon.spy();
      p._outstanding[KEY] = {};
      p._handleTransmission(KEY, message);
      expect(p._removePeer.calledWith(KEY, undefined)).to.be(true);
    });

    it('should remove the peer and send a LEAVE message if the socket appears to be closed', function() {
      var send = sinon.stub().throws();
      var message = {dst: ID};
      var leaveMessage = {type: 'LEAVE', dst: undefined, src: ID};
      var oldHandleTransmission = p._handleTransmission;
      p._removePeer = function() {
        // Hacks!
        p._handleTransmission = sinon.spy();
      };
      p._clients[KEY][ID] = {
        socket: {
          send: send
        }
      }
      p._handleTransmission(KEY, message);
      expect(p._handleTransmission.calledWith(KEY, leaveMessage)).to.be(true);
    });
  });

  describe('#_generateClientId', function() {
    var p;
    before(function() {
      PeerServer.prototype._initializeHTTP = sinon.stub();
      p = new PeerServer({ port: 8000 });
    });

    it('should generate a 16-character ID', function() {
      p._generateClientId('anykey', function(id, err) {
        expect(id.length).to.be(16);
      });
    });
  });
});
