/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

/**
 * Handles WebSocket connections to the server. This implementation was made just
 * to support sending and receiving JSON/String formatted data.
 * Basic implementation of the protocol. Not all features are supported.
 *  - No secure sockets
 *  - No detailed errors.
 * Basic Version 13 of the protocol is implemented.
 *
 * WebSockets - RFC6455
 */

var SocketyServer = require('./SocketyServer');
var Frame = require('./Frame');

/**
 * Create a new sockety web socket handler attached to this server.
 * @param {http.Server} httpServer The HTTP server to bind to.
 */
function listen(httpServer) {
    return new SocketyServer(httpServer);
}

// Functions
module.exports.listen = listen;

// Classes
module.exports.SocketServer = SocketyServer;
module.exports.Frame = Frame;
