/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var crypto = require('crypto');

/**
 * Calculate the response key for a websocket options based on
 * the request key.
 * @param {string} requestKey The key from the options request to start websocket.
 * @return {string} The response key.
 */
function calculateWebSocketResponseKey(requestKey) {
    var magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"; // GUID from protocol definition
    var shaEncoder = crypto.createHash('sha1');
    shaEncoder.update(requestKey + magic);

    return shaEncoder.digest('base64');
}

/**
 * Create a the response header options format. This will be sent to the client
 * to accept a websocket connection.
 *
 * @param {string} address          The address of the server.
 * @param {int} port                The port of the server.
 * @param {Object} requestHeader    The options data that made the request.
 * @constructor
 */
function WebSocketResponseHeader(address, port, requestHeaders) {
    this.address = address;
    this.port = port;
    this.responseKey = calculateWebSocketResponseKey(requestHeaders['sec-websocket-key']);
}

/**
 * @returns {string} The options string.
 */
WebSocketResponseHeader.prototype.toString = function() {
    var headerOutput = "";

    headerOutput += "HTTP/1.1 101 Switching Protocols\r\n";
    headerOutput += "Upgrade: websocket\r\n";
    headerOutput += "Connection: Upgrade\r\n";
    headerOutput += "Origin: http://" + this.address + ":" + this.port + "\r\n";    // Protocol version 13
    headerOutput += "Sec-WebSocket-Accept: " + this.responseKey + "\r\n";
    headerOutput += "\r\n";

    return headerOutput;
}

module.exports = WebSocketResponseHeader;
