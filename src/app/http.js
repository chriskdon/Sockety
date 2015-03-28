/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var http = require("http");

/**
 * Adds a method to the standard http library to send
 * json as a response.
 * @param {Object} data The object to send as JSON.
 */
http.ServerResponse.prototype.json = function(data) {
    this.writeHeader(200, {
        "Content-Type": "application/json"
    });

    this.write(JSON.stringify(data));
    this.end();
};

module.exports = http;