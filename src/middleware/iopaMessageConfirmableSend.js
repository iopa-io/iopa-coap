/*
 * Copyright (c) 2015 Limerun Project Contributors
 * Portions Copyright (c) 2015 Internet of Protocols Assocation (IOPA)
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

const Events = require('events');
const constants = require('../common/constants.js')
 , iopaStream = require('iopa-common-stream');
 
/**
 * IOPA Middleware for Auto Retrying Sends until Confirmed (by any "response" event on iopa.Events)
 *
 * @class IopaMessageConfirmableSend
 * @param {dictionary} properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function IopaMessageConfirmableSend(app) {
    if (!app.properties["server.Capabilities"]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

    app.properties["server.Capabilities"]["coapResponseConfirmableSend.Version"] = "1.0";
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
IopaMessageConfirmableSend.prototype.invoke = function IopaMessageConfirmableSend_invoke(context, next) { 
    
  if (context["server.IsLocalOrigin"])
     // CLIENT REQUEST OUT
      context["server.RawStream"] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context["server.RawStream"]));  
  else if (context["server.IsRequest"]) 
    // SERVER REQUEST IN
     context.response["server.RawStream"] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context.response, context.response["server.RawStream"])); 
    
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
     
    if (context["server.ResendOnTimeout"])
    {
             var oldChunk = chunk.slice();
             var retry = new RetrySender(context,  nextStream.write.bind(nextStream, oldChunk, encoding));
            
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
    
   if (!(this instanceof RetrySender))
      return new RetrySender(context, resend);
 
    
    this._sendAttempts = 0;
    this._currentTime = constants.ackTimeout * (1 + (constants.ackRandomFactor - 1) * Math.random()) * 1000;
    this._context = context;
    this._resend = resend;
    this.id = retryId ++;
    
    var that1 = this;


    context["IopaMessageConfirmableSend.responseListener"] = function(rData) {
        context["iopa.Events"].removeListener("response", context["IopaMessageConfirmableSend.responseListener"]);
        that1.reset();
        that1 = null;
    }
    
    context["iopa.Events"].on("response", context["IopaMessageConfirmableSend.responseListener"]);

    var that2 = this;
    this._maxRetrytimer = setTimeout(function() {
        var err = new Error('[CONFIRMABLE] No reply in ' + constants.exchangeLifetime + 's');
        err.retransmitTimeout = constants.exchangeLifetime;
        that2.emit('error', err);
        that2.reset();
        that2 = null;
    }, constants.exchangeLifetime * 1000);

   this._doTimer.call(this, context);
}

RetrySender.prototype._doTimer = function _retrySender_doTimer(context) {
    if (++this._sendAttempts <= constants.maxRetransmit)
            this._retryTimer = setTimeout(this._retry.bind(this, context), this._currentTime);
}

RetrySender.prototype._retry = function _retrySender_retry(context) {
     this._currentTime = this._currentTime * 2;
      try {
            this._resend();
        }
      catch (err) {
            context["server.Logger"].error("[CONFIRMABLE] Unable to resend packet");
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