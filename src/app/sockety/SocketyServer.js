/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ResponseHeader = require('./ResponseHeader');
var WebSocket = require('./WebSocket');

/**
 * Events associated with this class.
 * @type {{CONNECTION: string}}
 */
var events = {
    CONNECTION: 'connection',        // function({sockety.WebSocket} socket)
}

/**
 * The websocket server that is connected to the http server to handle
 * websocket requests on the same port as the http server.
 * @param {http.Server} httpServer The server to bind to.
 * @constructor
 */
function SocketyServer(httpServer) {
    EventEmitter.call(this);

    var self = this;

    /**
     * Accept the websocket connection. Send the response header.
     */
    httpServer.on('upgrade', function (request, socket, header) {
        var address = httpServer.address().address;
        var port = httpServer.address().port;

        // Accept socket connection
        socket.write((new ResponseHeader(address, port, request.headers)).toString());

        var websocket = new WebSocket(socket);

        self.emit(events.CONNECTION, websocket);
    });
}

util.inherits(SocketyServer, EventEmitter);

module.exports = SocketyServer;


