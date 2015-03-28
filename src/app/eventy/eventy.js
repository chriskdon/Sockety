/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var sockety = require('../sockety/sockety');
var EventManager = require('./EventManager');
var EventWire = require('./EventWire');

/**
 * Start an EventManger listening on the http server.
 * @param {http.Server} httpServer  The http server to bind to.
 * @returns {EventManager}  Return the event manager so we can listen for events.
 */
function listen(httpServer) {
    var socketServer = sockety.listen(httpServer);
    var manager = new EventManager();

    // Listen for new data events
    socketServer.on('connection', function(websocket) {
        var eventWire = new EventWire(websocket);

        // Let the manager now we have a connection
        manager.emit('connection', eventWire);

        // Forward close event through manager
        websocket.on('close', function() { manager.emit('close', eventWire); });
    });

    return manager;
}

// Functions
module.exports.listen = listen;

// Classes
module.exports.EventManger = EventManager;