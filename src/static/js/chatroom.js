/**
 * Chat application demonstrating the usefulness of the library
 * I created for passing events and data over a socket. The actual
 * logic code is very short showing how the "eventy" library takes care
 * of most of the actual work for you.
 *
 * Features
 *  - Multiple Rooms
 *  - Change Username
 *  - Create Rooms
 *
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

(function() {
    // Includes
    var EventySocket = eventy.EventySocket;

    // Vars
    var username = null;
    var currentRoom = null; // Starting room for everyone
    var roomListDOM = {};       // DOM objects for selecting room

    // Init
    $(function() {
        // Templates
        var messageTemplate = Handlebars.compile($("#message-template").html());
        var roomTemplate = Handlebars.compile($("#room-template").html());

        // Eventy Socket
        var es = new EventySocket("ws://127.0.0.1:2222");

        // ------------------------------------------------
        // UI FUNCTIONS -----------------------------------
        // ------------------------------------------------

        /**
         * Output the user message.
         * @param {string} sender   Username of the sender.
         * @param {string} message  The message content.
         * @param {string} me       Class to add if it's me that sent it.
         */
        function outputMessage(sender, message, me) {
            $("#chat-box").append(messageTemplate({
                sender: sender,
                message: message,
                me: me
            }));

            $("#chat-box").scrollTop($("#chat-box")[0].scrollHeight);
        }

        // Set the new room and inform the server
        function setRoom(room) {
            es.emit('set-room', {
                oldRoom: currentRoom,
                newRoom: room
            });

            currentRoom = room;

            $("#roomName").html(currentRoom);
            $("#chat-box").html("");

            $(".current-room").removeClass("current-room");
            $("#room-" + roomListDOM[currentRoom]).addClass("current-room");
        }

        // Add a room to the DOM
        function addRoom(room) {
            roomListDOM[room] = room.replace(" ", "_");

            if($("#room-" + roomListDOM[room] ).length <= 0) { // it's a new room
                $("#rooms").append(roomTemplate({ID:roomListDOM[room],room:room}));
                $("#room-" + roomListDOM[room] ).click(function() {
                    setRoom(room);
                });
            }
        }

        // Add and go to a new room
        $("#addRoomButton").click(function() {
            var room = $("#newRoomTextbox").val();

            if(!room || room.length <= 0) {
                alert("Room name cannot be empty.");
                return;
            }

            addRoom(room);
            setRoom(room);
        });

        // Send a message
        function sendMessage() {
            es.emit('message', {
                username: username,
                message: $("#message").val()
            });

            outputMessage(username, $("#message").val(), "me");

            $("#message").val(""); // Empty
        }
        $("#send-button").click(sendMessage);
        $("#message").keyup(function(e) {
            if(e.keyCode === 13) {
                sendMessage();
            }
        });

        // ------------------------------------------------
        // Chat Mechanics / Events ------------------------
        // ------------------------------------------------

        // Get the current list of rooms that have been created when we connect.
        es.on('current-room-list', function(rooms) {
            for(var i in rooms) {
                addRoom(rooms[i]);
            }
        });

        // Show Message from Room
        es.on('message', function (data) {
            outputMessage(data.username, data.message);
        });

        // Add the new room to the sidebar
        es.on('room-added', function(data) {
            addRoom(data.room);
        });

        // A remove was removed because it was empty
        es.on('room-deleted', function(data) {
            $("#room-" + data.room).remove();
        });

        // ------------------------------------------------
        // Configuration ----------------------------------
        // ------------------------------------------------

        // Connect to a room (set username)
        $("#connectButton").click(function() {
            var u = $("#usernameTextbox").val();

            if(u.length <= 0) {
                alert("Username cannot be blank.");
                return;
            }

            username = u;

            es.onConnection(function() {
                addRoom('General');

                // Put user in the general room to start with
                setRoom('General');

                // Show Application
                $("#chat-application").show();
                $("#add-room").show();

                // Switch Buttons
                $("#connectButton").hide();
                $("#changeUsernameButton").show();
            })

            es.connect();
        });

        // Events for changing username
        $("#changeUsernameButton").click(function() {
            var u = $("#usernameTextbox").val();

            if(u.length <= 0) {
                alert("Username cannot be blank.");
                return;
            }

            username = u;
        });
    });
})();