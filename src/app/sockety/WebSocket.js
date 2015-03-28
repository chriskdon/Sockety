/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Frame = require('./Frame');

/**
 * The events associated with this class.
 * @type {{MESSAGE_RECEIVED: string, CLOSED: string}}
 */
var events = {
    MESSAGE_RECEIVED: 'message',    // New frame recieved -> function({Buffer} payload)
    CLOSED: 'close'                 // The socket is closing.
};

/**
 * Wrapper for socket to handle sending and receiving data over a websocket.
 * @param {net.Socket} socket The raw socket that is connected.
 * @constructor
 */
function WebSocket(socket) {
    EventEmitter.call(this);

    this.socket = socket;

    this.startListening(); // Start listening for data
}

util.inherits(WebSocket, EventEmitter);

/**
 * Send string data to a client websocket.
 * @param {string} str The string data to send.
 */
WebSocket.prototype.send = function(str) {
    var strData = new Buffer(str);

    // Generate header data
    var header = null; // Header data buffer
    var length = strData.length;
    if(length <= 125) {
        header = new Buffer(2); // 2 Byte header
        header[1] = length;     // Payload length
    } else if(length > 125 && (length >> 16)  <= 0) {
        header = new Buffer(4); // 4 byte header
        header[1] = 126;        // Indicate 16 bit length is being used

        header.writeUInt16BE(length, 2);
    } else {
        throw "64 bit payload length not supported.";
    }

    header[0] = 0x81; // Set option flags - Text data as single frame. RFC 64555

    this.socket.write(Buffer.concat([header, strData]));
}

/**
 * Listen for data from the connected client.
 */
WebSocket.prototype.startListening = function() {
    var self = this;

    // Listen for and queue message frames
    var frameQueue = [];
    this.socket.on('data', function(data) {
        if(frameQueue.length <= 0) {
            var frame = new Frame(data);
            frameQueue.push(frame);

            var result = frame.unpack();
            while(result.split) {
                temp = new Frame(result.data);
                frameQueue.push(temp);
                result = temp.unpack();
            }
        } else {
            frameQueue[0].pushData(data);
        }

        for(var i = 0; i < frameQueue.length; i++) {
            if(frameQueue[i].isComplete()) {
                self.emit(events.MESSAGE_RECEIVED, frameQueue[i].payload());
                frameQueue.splice(i, 1);
                i -= 1;
            }
        }
    });

    // Forward close event
    this.socket.on('close', function() { self.emit(events.CLOSED); });
}

module.exports = WebSocket;
module.exports.events = events;