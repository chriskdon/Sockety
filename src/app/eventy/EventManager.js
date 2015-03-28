/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Events associated with the EventManager
 * @type {{CONNECTION: string, ROOM_DELETED: string, ROOM_ADDED: string}}
 */
var events = {
    CONNECTION:     'connection',       // New connection from socket
    ROOM_DELETED:   'room-deleted',     // Room was deleted
    ROOM_ADDED:     'room-added'        // A new room was added
}

/**
 * Manages connections to an server and stores the connection pools for
 * broadcasting events to rooms, etc.
 * @constructor
 */
function EventManager() {
    EventEmitter.call(this);

    this._connectionPool = {}; // Holds all current open connections
    this._rooms = {};          // Will hold rooms connections can be put in, multiple connections (many -> many)

    var self = this;
    var i = 0;

    /**
     * Add new connections to the connection pool
     * when they connect.
     */
    this.on(events.CONNECTION, function(eventWire) {
        eventWire.__EventManager__ = { GUID: i++ }; // Object modification for tracking

        self._connectionPool[eventWire.__EventManager__.GUID] = eventWire;

        /**
         * When a connection is closed remove them from the
         * pool of connected clients.
         */
        eventWire.onClose(function() {
            delete self._connectionPool[eventWire.__EventManager__.GUID];

            for(var key in this._rooms) {
                this.removeFromRoom(eventWire, key);
            }
        });
    })
}

util.inherits(EventManager, EventEmitter);

/**
 * Send an event message to all connected clients in a connection pool.
 * @param {object}            pool  The pool of connections to send to.
 * @param {eventy.EventyWire} wire  The wire that made the request.
 * @param {string}            event The name of the event to broadcast.
 * @param {object}            data  The data to broadcast out.
 * @private
 */
EventManager.prototype._broadcastToConnectionPool = function(pool, wire, event, data) {
    if(!wire) { throw "The sender event wire must be set."; }
    if(!event) { throw "Event name must be set."; }

    for(var i in pool) {
        if(i != wire.__EventManager__.GUID) {
            pool[i].emit(event, data);
        }
    }
}

/**
 * Send an event to all connected clients. If a room is specified then it will
 * only send event to clients in that room.
 * @param {eventy.EventWire}  wire    The wire that made the request.
 * @param {string}            event   The name of the event to broadcast.
 * @param {object}            data    The data to broadcast out.
 * @param {string}            [room]  The name of the room to broadcast to.
 */
EventManager.prototype.broadcast = function(wire, event, data, room) {
    if(!room) { // Room argument not specified (broadcast to ALL connections)
        this._broadcastToConnectionPool(this._connectionPool, wire, event, data);
    } else if(this._rooms[room]) {
        this._broadcastToConnectionPool(this._rooms[room].pool, wire, event, data);
    } else {
        throw "Invalid Room.";
    }
}

/**
 * Put an event wire into a room so it can be broadcast to.
 * @param {eventy.EventWire} wire   The wire to put in a room.
 * @param {string}           room   The name of the rrom.
 */
EventManager.prototype.putInRoom = function(wire, room) {
    if(!wire) { throw "Wire must be set"; }
    if(!room) { throw "Room name must be set"; }

    if(this._rooms[room]) { // Room exists
        this._rooms[room].pool[wire.__EventManager__.GUID] = wire;
        this._rooms[room].connections += 1;
    } else { // Create room
        this._rooms[room] = { pool: {}, connections: 1 };
        this._rooms[room].pool[wire.__EventManager__.GUID] = wire;
        this.emit(events.ROOM_ADDED, room);
    }
}

/**
 * Remove an event wire from a room.
 * @param {eventy.EventWire} wire   The wire to put in a room.
 * @param {string}           room   The name of the rrom.
 */
EventManager.prototype.removeFromRoom = function(wire, room) {
    if(!wire) { throw "Wire must be set"; }
    if(!room) { throw "Room name must be set"; }

    if(this._rooms[room]) {
        // Remove use from room
        delete this._rooms[room].pool[wire.__EventManager__.GUID];
        this._rooms[room].connections -= 1;

        // Remove empty rooms
        if(this._rooms[room].connections <= 0) {
            delete this._rooms[room];
            this.emit(events.ROOM_DELETED, room);
        }
    }
}

/**
 * Returns a list of the room names.
 * @returns {string[]}
 */
EventManager.prototype.getRoomNames = function() {
    var names = [];
    for(var name in this._rooms) {
        names.push(name);
    }

    return names;
}

module.exports = EventManager;
module.exports.events = events;