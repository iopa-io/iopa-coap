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
  
const iopaStream = require('iopa-common-stream');
    
/**
 * CoAP IOPA Middleware for Auto Acknowledging Server Requests
 *
 * @class CoAPServerAutoAck
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPServerAutoAck(app) {
    if (!app.properties[SERVER.Capabilities]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

   app.properties[SERVER.Capabilities]["CoAPAutoAck.Version"] = "1.0";
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPServerAutoAck.prototype.invoke = function CoAPServerAutoAck_invoke(context, next) {
    if(context[SERVER.IsLocalOrigin])
    {
         context[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnParentResponse.bind(this, context)); 
        return next();
    } 
    
    // SERVER
    
  //  if (context["iopa.METHOD"] > '0.00' && context["iopa.METHOD"] <'1.00')
      // transfer to request for matching
      
    if (context[COAP.Confirmable])
    {  
       context[COAP.Ack] = true;
       context.response[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context.response["server.RawStream"]));  
            context["CoAPAutoAck._acknowledgeTimer"] = setTimeout(function() {
               context[SERVER.WriteAck]();
         
                // we are no longer in piggyback
                context.response[COAP.Confirmable] = true;
                context.response[COAP.Ack] = false;
    
                // we need a new messageId for the new reply
                context.response[IOPA.MessageId] = null;
                }, 50);
    } 
    
    return next();
};

/**
 * @method _invokeOnParentResponse
 * @this CacheMatch
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPServerAutoAck.prototype._invokeOnParentResponse = function CoAPServerAutoAck_invokeOnParentResponse(channelContext, context) {
     if (context[COAP.Confirmable])
    {  
     context[SERVER.WriteAck]();
         
        // we are no longer in piggyback
        context.response[COAP.Confirmable] = true;
        context.response[COAP.Ack] = false;
    
        // we need a new messageId for any further reply
        context.response[IOPA.MessageId] = null;
    } 
};

/**
 * @method _write
 * @this context IOPA context dictionary
 * @param nextStream  Raw Stream to send transformed data to
 * @param chunk     String | Buffer The data to write
 * @param encoding String The encoding, if chunk is a String
 * @param callback Function Callback for when this chunk of data is flushed
 * @private
*/
CoAPServerAutoAck.prototype._write = function CoAPServerAutoAck_write(context, nextStream, chunk, encoding, callback) {
    if (context["CoAPAutoAck._acknowledgeTimer"])
    {
         clearTimeout(context["CoAPAutoAck._acknowledgeTimer"]);
        context["CoAPAutoAck._acknowledgeTimer"] = null;
    }
 
    nextStream.write(chunk, encoding, callback);
};

module.exports = CoAPServerAutoAck;
