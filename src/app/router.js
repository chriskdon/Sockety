/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var url = require("url");
var path = require("path");
var fs = require("fs");

var routes = {};

/**
 * Handle a request made to the server.
 * @param request {http.IncomingMessage}
 * @param response {http.ServerResponse}
 */
module.exports.routeRequest = function(request, response) {
    var requestPath = url.parse(request.url).pathname;

    if(routes[requestPath]) {
        routes[requestPath].callback(request, response);
    } else {
        handleStaticFileRequest(request, response);
    }
};

/**
 * Register a route to call a function.
 * @param {String} path The request path to match against.
 * @callback callback      The function to call when a path is matched.
 */
module.exports.registerRoute = function(path, callback) {
    if(routes[path]) {
        throw "Route already exists."
    } else {
        routes[path] = {callback:callback};
    }
}

// STATIC HANDLERS

/**
 * Send 404 Response.
 * @param response http.response handle.
 */
function send404Response(response) {
    response.writeHeader(404, {
        "Content-Type": "text/plain"
    });

    response.end("404 File Not Found\n");
}

/**
 * Send 500 Response.
 * @param response  http.response handle.
 * @param error     Error text to output.
 */
function send500Error(response, error) {
    response.writeHeader(500, {
        "Content-Type": "text/plain"
    });

    response.end(error + "\n");
}

/**
 * Send a 200 Okay with the contents of the file.
 * @param response  http.response handle.
 * @param msg       The message contents to send.
 * @param type      The type of the contents.
 */
function send200Okay(response, msg, type) {
    response.writeHeader(200);
    response.end(msg);
}

/**
 * Serve a static file.
 *
 * @param request
 * @param response
 */
function handleStaticFileRequest(request, response) {
    var requestPath = url.parse(request.url).pathname;

    // Default to index
    if(requestPath === "/") {
        requestPath = "/index.html";
    }

    var fileSystemPath = path.join(process.cwd() + "/../static/", requestPath); // Path on the Server Computer

    fs.exists(fileSystemPath, function(exists) {
        if(!exists) { // Make sure file exists
            send404Response(response);
            return;
        }

        fs.readFile(fileSystemPath, "binary", function(error, file) {
            if(error) {
                send500Error(response, error);
            } else {
                send200Okay(response, file, "binary"); // Send file
            }
        });
    });
}
