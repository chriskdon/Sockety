/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

/**
 * Handle chat room specific actions. Shows how easy it is to use my (eventy, sockety)
 * libraries to create a websocket/event driven chat room.
 * @param {eventy.EventManager} evm The event manager to bind to.
 * @constructor
 */
function ChatRoom(evm) {
    /**
     * Handle the events being sent over the socket.
     */
    evm.on('connection', function(wire) {
        var room = null; // The current room the client is in

        /**
         * Outputs the current list of rooms when a new user connects.
         */
        wire.emit('current-room-list', evm.getRoomNames());

        /**
         * Broadcast message to users
         */
        wire.on('message', function(data) {
            evm.broadcast(wire, 'message', data, room);
        });

        /**
         * Set a users room so they only receive messages from that room
         */
        wire.on('set-room', function(data) {
            if(data.oldRoom) {
                evm.removeFromRoom(wire, data.oldRoom);
            }

            evm.putInRoom(wire, data.newRoom);
            room = data.newRoom;
        });

        /**
         * Add rooms to user's clients
         */
        evm.on('room-added', function(room) {
            wire.emit('room-added', {
                room: room
            });
        });

        /**
         * Remove rooms from users clients
         */
        evm.on('room-deleted', function(room) {
            wire.emit('room-deleted', {
                room: room
            })
        });
    })
}

module.exports = ChatRoom;