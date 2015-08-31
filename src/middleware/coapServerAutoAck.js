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

var iopaStream = require('iopa-common-stream');
    
/**
 * CoAP IOPA Middleware for Auto Acknowledging Server Requests
 *
 * @class CoAPServerAutoAck
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPServerAutoAck(app) {
    if (!app.properties["server.Capabilities"]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

   app.properties["server.Capabilities"]["CoAPAutoAck.Version"] = "1.0";
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPServerAutoAck.prototype.invoke = function CoAPServerAutoAck_invoke(context, next) {
     console.log("CHECKING " + context["iopa.Seq"]);
    if(context["server.IsLocalOrigin"])
    {
        console.log("LOCAL ORIGIN " + context["iopa.Seq"]);
         context["iopa.Events"].on("response", this._invokeOnParentResponse.bind(this, context)); 
        return next();
    } 
    
    // SERVER
    
  //  if (context["iopa.METHOD"] > '0.00' && context["iopa.METHOD"] <'1.00')
      // transfer to request for matching
      
    if (context["coap.Confirmable"])
    {  
       console.log("[AUTOACK] SERVER SETTING AUTO ACK TIMER " + context["iopa.Seq"]);
       context["coap.Ack"] = true;
       context.response["server.RawStream"] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context.response["server.RawStream"]));  
            context["CoAPAutoAck._acknowledgeTimer"] = setTimeout(function() {
                console.log("[AUTOACK] SERVER AUTO ACK TRIGGERED " + context["iopa.Seq"]);
                context["coap.WriteAck"]();
         
                // we are no longer in piggyback
                context.response["coap.Confirmable"] = true;
                context.response["coap.Ack"] = false;
    
                // we need a new messageId for the new reply
                delete context.response["iopa.MessageId"];
                }, 1050);
    } else
    console.log("[AUTOACK] SERVER NOT CONFIRMABLE " + context["iopa.Method"] + " "  + context["iopa.Seq"]);
    
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
     if (context["coap.Confirmable"])
    {  
      console.log("[AUTOACK] WRITING ACK " + context["iopa.Method"] + " "  + context["iopa.Seq"]);
     context["coap.WriteAck"]();
         
        // we are no longer in piggyback
        context.response["coap.Confirmable"] = true;
        context.response["coap.Ack"] = false;
    
        // we need a new messageId for any further reply
        delete context.response["iopa.MessageId"];
    } else
    
     console.log("[AUTOACK] NOT CONFIRMABLE " + context["iopa.Method"] + " "  + context["iopa.Seq"]);
   
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
        console.log("[AUTOACK] ACKED " + context["iopa.Method"] + " "  + context["iopa.Seq"]);
        clearTimeout(context["CoAPAutoAck._acknowledgeTimer"]);
        context["CoAPAutoAck._acknowledgeTimer"] = null;
    }
 
    nextStream.write(chunk, encoding, callback);
};

module.exports = CoAPServerAutoAck;
