/**
 * @author: Chris Kellendonk (4810800)
 * @date: 2013-12-02
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Events associated with this class.
 * @type {{PAYLOAD_RECEIVED: string}}
 */
var events = {
    PAYLOAD_RECEIVED: 'payload-received'
}

/**
 * @constant
 * @type {number}
 */
const MASK_LENGTH = 4;

/**
 * Get the value of a bit at a position in a byte.
 * @param {byte}    byte            The byte to get the bit from.
 * @param {int}     bitPosition     The position of the bit in the byte.
 * @returns {boolean} The value of the bit.
 */
function bitFromByte(byte, bitPosition) {
    return (byte & (1 << bitPosition)) != 0;
}

/**
 * A more usable format of interacting with the frame returned from a websocket request.
 * @param {Buffer} data                                     The frame data received on this request
 * @param {function(Buffer, Frame)} [payloadReceivedEvent   The event to fire when the full payload
 *                                                          has been received.
 *
 * @constructor
 * @mixes EventEmitter
 */
function Frame(data, payloadReceivedEvent) {
    EventEmitter.call(this);

    this.data = data;   // Raw data (the entire frame that was received)

    this.recvdPayloads = []; // Will hold buffers of received payloads.
    this.numRecvdPayloadBytes = 0; // The number of bytes of the payload we've received

    if(payloadReceivedEvent) { this.on(events.PAYLOAD_RECEIVED, payloadReceivedEvent); }
}

util.inherits(Frame, EventEmitter);

/**
 * Unpack the header and first chunk of data.
 * @returns {object}
 */
Frame.prototype.unpack = function() {
    return this.pushData(this.data);
}

/**
 * Add this data to the received payloads
 * @param {Buffer} data The data that was received.
 * @return {object} Indicating if this data packet had more than one frame in it.
 */
Frame.prototype.pushData = function(data) {
    var result = {
        split: false, // Did multiple frames come in same data packet
        data: null    // Extra data after this frame was decoded
    };

    if(this.recvdPayloads.length <= 0) { // Starting data received (this data contains header)
        var end = this.info().payloadStartIndex + this.info().payloadLength;
        var payload = data.slice(this.info().payloadStartIndex, end);
        this.recvdPayloads.push(payload);
        this.numRecvdPayloadBytes += payload.length;

        if(end < data.length) { // Frame split
            result = {
                split: true,
                data: data.slice(end)
            };
        }
    } else if(!this.isComplete()) { // Get continued data
        if(this.numRecvdPayloadBytes + data.length <= this.info().payloadLength) {
            this.recvdPayloads.push(data);
            this.numRecvdPayloadBytes += data.length;
        } else { // Started recieving part of next frame
            var end = this.info().payloadLength - this.numRecvdPayloadBytes;
            var splitPayload = data.slice(0, end);
            this.recvdPayloads.push(splitPayload);
            this.numRecvdPayloadBytes = splitPayload.length;

            // Frame split
            result = {
                split: true,
                data: data.slice(end)
            };
        }
    } else {
        throw "Invalid payload data. This frame has been fully received."
    }

    // Fire an event indicating we have received the full payload.
    if(this.isComplete()) {
        this.emit(events.PAYLOAD_RECEIVED, this.payload(), this);
    }

    return result;
}

/**
 * Decode a full payload from a frame.
 * @returns {Buffer} The buffer of decoded payload data.
 */
Frame.prototype.payload = function() {
    // Make sure we have the full payload
    if(!this.isComplete()) {
        throw "Incomplete Frame - The payload has not been fully received.";
    }

    // Lazy - Decode Payload
    if(!this._payload) {
        // Decode Payload
        var maskedPayload = Buffer.concat(this.recvdPayloads);
        var decoded = new Buffer(maskedPayload.length);
        var mask = this.mask();

        for(var i = 0; i < decoded.length; i++) {
            decoded[i] = maskedPayload[i] ^ mask[i % 4];
        }

        this._payload = decoded;
    }

    return this._payload;
}

/**
 * The decoded options header of a frame that was received.
 * @returns {{FIN: boolean, RSV1: boolean, RSV2: boolean, RSV3: boolean, OPCODE: number}}
 */
Frame.prototype.options = function() {
    if(!this._options) { // Lazy
        this._options = {
            FIN:    bitFromByte(this.data[0], 7),
            RSV1:   bitFromByte(this.data[0], 6),
            RSV2:   bitFromByte(this.data[0], 5),
            RSV3:   bitFromByte(this.data[0], 4),
            OPCODE: this.data[0] & 0x0F  // 1 = text data
        };
    }

    return this._options;
}

/**
 * Payload information.
 * @returns {{maskStartIndex: number, payloadStartIndex:number, payloadLength: number}}
 */
Frame.prototype.info = function() {
    if(!this._info) {
        var length = this.data[1] - 128; // Length of the payload data.
        var indexOfMask = 2;        // Start index of the mask

        if(length === 126) { // 16 bit length extension
            length = ((this.data[2] & 0x7F) << 8) | this.data[3];
            indexOfMask = 4;
        } else if(length === 127) { // 64 bit length extension
            length = (this.data[2] & 0x7F) << 56;
            for(var i = 3, s = 48; i < 10; i++, s -= 8) {
                length |= this.data[i] << s;
            }
            indexOfMask = 10;
        }

        this._info = {
            maskStartIndex: indexOfMask,    // Offset of the mask in the raw data
            payloadStartIndex: indexOfMask + MASK_LENGTH,
            payloadLength: length           // The total length of payload data we expect to receive
        };
    }

    return this._info;
}

/**
 * The mask to retrieve the payload data.
 * @returns {Buffer} The section of data referencing the mask.
 */
Frame.prototype.mask = function() {
    if(!this._mask) {
        var offset = this.info().maskStartIndex;

        // Get mask values
        this._mask = this.data.slice(offset, offset + MASK_LENGTH);
    }

    return this._mask;
}

/**
 * @returns {boolean} True if the entire payload has been received for this frame.
 */
Frame.prototype.isComplete = function() {
    return (this.numRecvdPayloadBytes >= this.info().payloadLength);
}

/**
 * @returns {boolean} True if this is the final frame of the message. Full payload is
 *                    part of this frame.
 */
Frame.prototype.isFinal = function() {
    return this.options().FIN;
}

module.exports = Frame;
module.exports.events = events;