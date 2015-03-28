goog.provide('eventy.EventySocket');

/**
 * Client Side library to interface with the eventy server and handle the message passing
 * protocol.
 *
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */
(function() {
    /**
     * Make an address compatible with websocket url.
     * @param {string} address The address to normalize to websocket format.
     * @returns {string}
     */
    function normalizeAddress(address) {
        address = address.replace("http://","ws://");

        return address;
    }

    /**
     * The address of the host to connect to.
     * @param address
     * @callback {Function} onConnection
     * @constructor
     */
    function EventySocket(address) {
        this.address = normalizeAddress(address);   // Connection address
        this._registeredEvents = {};                // Event's that we can respond to from the server
    }

    /**
     * Connect to the event server.
     */
    EventySocket.prototype.connect = function() {
        var self = this;
        this.socket = new WebSocket(this.address);

        this._startLifeSupport(); // Keep socket alive

        /**
         * The socket was opened start listening for event messages
         * from the server.
         *
         * @param evt An event received from the server.
         */
        this.socket.onmessage = function(evt) {
            var message = JSON.parse(evt.data); // get object

            if(self._registeredEvents[message.eventName]) {
                for(var i in self._registeredEvents[message.eventName].callbacks) {
                    self._registeredEvents[message.eventName].callbacks[i](message.data);
                }
            }
        }
    }

    /**
     * Intentionally disconnect from the event server.
     */
    EventySocket.prototype.disconnect = function() {
        this.socket.onclose = null; // We don't want to stay alive
        this.socket.close();

        if(this._onClose) { this._onClose(); }
    }

    /**
     * Register a handler for when the connection is opened.
     * @callback callback The event to fire.
     */
    EventySocket.prototype.onConnection = function(callback) {
        if(!callback) { throw "Handler cannot be null."; }

        this._onConnection = callback;
    }

    /**
     * Register a handler for when the connection is closed for good.
     * Note: This does not fire when a connection is restarted.
     * @callback callback The event to fire.
     */
    EventySocket.prototype.onClose = function(callback) {
        if(!callback) { throw "Handler cannot be null."; }

        this._onClose = callback;
    }

    /**
     * Send a message event to the server.
     *
     * @param {string} event    The name of the event.
     * @param {object} data     The data to send back.
     */
    EventySocket.prototype.emit = function(event, data) {
        if(!event) { throw "Event name must be set."; }

        event = event.toLowerCase();

        if(event === 'heartbeat' && data) { throw "Event name 'heartbeat' is reserved."; }

        if(!data) { data = {} } // Empty data so other end still parses JSON

        this.socket.send(JSON.stringify({
            eventName: event,
            room: null,
            data: data
        }));
    }

    /**
     * Register an event to be handled when it is recieved from the server.
     *
     * @param event
     * @param callback
     */
    EventySocket.prototype.on = function(event, callback) {
        if(!this._registeredEvents[event]) {
            this._registeredEvents[event] = {
                callbacks:[callback]
            }
        } else {
            this._registeredEvents[event].callbacks.push(callback);
        }
    }

    /**
     * Start the methods needed to keep the socket alive
     * indefinitely.
     */
    EventySocket.prototype._startLifeSupport = function() {
        var self = this;
        this._interval = 60000; //120000; // Initial interval 2 minutes
        var heartbeatThread = null;

        /**
         * The socket was opened successfully. Start
         * the heartbeat interval thread so that the
         * socket will stay open as long as the user
         * is on the page.
         */
        this.socket.onopen = function() {
            if(self._onConnection) { self._onConnection(); } // Fire event

            heartbeatThread = setInterval(function() {
                self.emit('heartbeat');
            }, self._interval);
        }

        /**
         * Try and reopen the connection.
         */
        this.socket.onclose = function() {
            clearInterval(heartbeatThread);
            self._interval = self._interval - 10000; // Make heartbeat faster

            // Couldn't reopen just close
            if(self._interval <= 20000) {
                if(!this._onClose) { this._onClose(); }
                throw "Connection cannot be kept alive. Please check server.";
            }

            EventySocket.call(this, this.address); // Start connection again
        }
    }

    eventy.EventySocket = EventySocket;
})();