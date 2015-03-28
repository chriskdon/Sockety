/**
 * Main entry point of the application. The server is started
 * from here and can be viewed by going to 127.0.0.1:2222
 *
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var http = require('./http');              // HTTP Server for static files
var url = require('url');                  // Parse URLs
var router = require('./router');          // Route requests from HTTP server
var eventy = require('./eventy/eventy');   // WebSocket/Events Handler
var ChatRoom = require('./ChatRoom');      // Chat Room specific handlers

// Prepare Server
var httpServer = http.createServer(router.routeRequest); // HTTP

// Prepate eventy server and chat room
new ChatRoom(eventy.listen(httpServer)); // Create the chat room

// Start HTTP Server
httpServer.listen(2222);
console.log("NChat HTTP Started: 0.0.0.0:2222");


