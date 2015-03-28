/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * EventWire is a special form of WebSocket that can listen for and responsd
 * to events sent over the network.
 * @param {sockety.WebSocket} websocket
 * @constructor
 */
function EventWire(websocket) {
    EventEmitter.call(this);

    /** @type {sockety.WebSocket} */
    this.socket = websocket;    // The websocket this event wire is using to communicate on.

    var self = this;

    /**
     * Listen for messages from the socket and try to convert
     * them into events.
     */
    this.socket.on('message', function(payload) {
        try {
            var message = JSON.parse(payload.toString());

            self._localEmit(message.eventName, message.data, message.room); // Emit the message locally
        } catch(ex) { /* Ignore Invalid JSON */ }
    });

    /**
     * Listen for close and fire user handler when it happens
     */
    this.socket.on('close', function() {
        if(self._close) { self._close(); }
    });
}

util.inherits(EventWire, EventEmitter);

/**
 * The public emit has been overridden to handle sending messages over the socket. But
 * we still need a way to send messages to local callbacks that were recieved from
 * a remote socket. So here we apply the original EventEmitter emit(...)
 * @private
 */
EventWire.prototype._localEmit = function() {
    EventEmitter.prototype.emit.apply(this, arguments);
}

/**
 * Override the emit function from the EventEmitter to handle
 * sending the event through the socket rather than firing
 * it locally.
 *
 * @param {string} event    Name of the event.
 * @param {object} data     Data to send.
 */
EventWire.prototype.emit = function(event, data) {
    this.socket.send(JSON.stringify({
        eventName: event,
        room: null,
        data: data
    }));
}

/**
 * Fire the callback when the socket is closed.
 * @param callback Function to call.
 */
EventWire.prototype.onClose = function(callback) {
    this._close = callback;
}

module.exports = EventWire;