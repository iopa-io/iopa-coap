/*
 * Copyright (c) 2015 Internet of Protocols Alliance (IOPA)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const constants = require('iopa').constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  COAP = constants.COAP;
  
const Events = require('events');
const QOS = require('../common/constants.js').QOS
 , iopaStream = require('iopa-common-stream');
 
 const THISMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap:confirmablesend",
  RETRYSENDER: "confirmablesend.RetrySender",
  RESPONSELISTENER: "confirmablesend.ResponseListener"},
     packageVersion = require('../../package.json').version,
     COAPMIDDLEWARE = require('../common/constants.js').COAPMIDDLEWARE

 
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * IOPA Middleware for Auto Retrying Sends until Confirmed (by any "response" event on iopa.Events)
 *
 * @class IopaMessageConfirmableSend
 * @param {dictionary} properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function IopaMessageConfirmableSend(app) {
    if (!app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY])
    throw ("Missing Dependency: IOPA CoAP Server/Middleware in Pipeline");

  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
IopaMessageConfirmableSend.prototype.invoke = function IopaMessageConfirmableSend_invoke(context, next) { 
    
  if (context[SERVER.IsLocalOrigin])
     // CLIENT REQUEST OUT
      context[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context[SERVER.RawStream]));  
  else if (context[SERVER.IsRequest]) 
    // SERVER REQUEST IN
     context.response[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context.response, context.response[SERVER.RawStream])); 
    
   return next();
};

/**
 * @method _write
 * @param context IOPA context dictionary
 * @param nextStream Stream The raw stream saved that is next in chain for writing
 * @param chunk     String | Buffer The data to write
 * @param encoding String The encoding, if chunk is a String
 * @param callback Function Callback for when this chunk of data is flushed
 * @private
*/
IopaMessageConfirmableSend.prototype._write = function IopaMessageConfirmableSend_write(context, nextStream, chunk, encoding, callback) {
     
    if (context[SERVER.Retry])
    {
             var oldChunk = chunk.slice();
             context[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.RETRYSENDER] = new RetrySender(context,  nextStream.write.bind(nextStream, oldChunk, encoding));
       }

    nextStream.write(chunk, encoding, callback);
};

var retryId = 0;

/**
 * Internal UDP Sender that keeps retrying sends until reset by "coap.Finish" event
 *
 * @class RetrySender
 * @this context IOPA context dictionary
 * @constructor
 * @private
 */
function RetrySender(context, resend) {
    _classCallCheck(this, RetrySender);
        
    this._sendAttempts = 0;
    this._currentTime = QOS.ackTimeout * (1 + (QOS.ackRandomFactor - 1) * Math.random()) * 1000;
    this._context = context;
    this._resend = resend;
    this.id = retryId ++;
    
    var that1 = this;

    context[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.RESPONSELISTENER] = function(rData) {
        context[IOPA.Events].removeListener(IOPA.EVENTS.Response,context[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.RESPONSELISTENER]);
        that1.reset();
        that1 = null;
    }
    
    context[IOPA.Events].on(IOPA.EVENTS.Response, context[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.RESPONSELISTENER]);

    var that2 = this;
    this._maxRetrytimer = setTimeout(function() {
        context[IOPA.Events].removeListener(IOPA.EVENTS.Response, context[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.RESPONSELISTENER]);
        var err = new Error('[CONFIRMABLE] No reply in ' + QOS.exchangeLifetime + 's');
        err.retransmitTimeout = QOS.exchangeLifetime;
        that2.emit('error', err);
        that2.reset();
        that2 = null;
    }, QOS.exchangeLifetime * 1000);

   this._doTimer.call(this, context);
}

RetrySender.prototype._doTimer = function _retrySender_doTimer(context) {
    if (++this._sendAttempts <= QOS.maxRetransmit)
            this._retryTimer = setTimeout(this._retry.bind(this, context), this._currentTime);
}

RetrySender.prototype._retry = function _retrySender_retry(context) {
     this._currentTime = this._currentTime * 2;
      try {
            this._resend();
        }
      catch (err) {
            context[SERVER.Logger].error("[CONFIRMABLE] Unable to resend packet");
      }
        
     this._doTimer(context);
}

RetrySender.prototype.reset = function _retrySender_reset() {
    clearTimeout(this._maxRetrytimer)
    clearTimeout(this._retryTimer)
    delete this._maxRetrytimer;
    delete this._retryTimer;
    this._context = null;
}

module.exports = IopaMessageConfirmableSend; 