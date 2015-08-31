/* global ) */
/* global connect */
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
 
const Promise = require('bluebird')

 var db_Clients = {};
 
/**
 * CoAP IOPA Middleware for Managing Server Sessions including Auto Subscribing Client Subscribe Requests
 *
 * @class CoAPSubscriptionClient
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPClientSubscriber(app) {
    if (!app.properties["server.Capabilities"]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

   app.properties["server.Capabilities"]["CoAPClientSubscriber.Version"] = "1.0";
   this.app = app;
  }

/**
 * @method invoke
 * @this CoAPClientSubscriber
 * @param channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPClientSubscriber.prototype.invoke = function CoAPClientSubscriber_invoke(channelContext, next) {
  //  channelContext["iopa.Events"].on("response", this._client_invokeOnParentResponse.bind(this, channelContext));
  
  //  channelContext["iopa.Events"].on("response", this._client_invokeOnParentResponse.bind(this, channelContext));
   
    channelContext.hello = this.hello.bind(this, channelContext);
    channelContext.get = this.transfer.bind(this, channelContext, "GET");
    channelContext.subscribe = this.subscribe.bind(this, channelContext, "GET");
    channelContext.put = this.transfer.bind(this, channelContext, "PUT");
    channelContext.post = this.transfer.bind(this, channelContext, "POST");
    channelContext.delete = this.transfer.bind(this, channelContext, "DELETE");
    channelContext.bye = this.bye.bind(this, channelContext);
    
    return next();
};

/**
 * @method _client_invokeOnParentResponse
 * @this CoAPSubscriptionClient
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPClientSubscriber.prototype._client_invokeOnParentResponse = function CoAPClientSubscriber_client_invokeOnParentResponse(channelContext, subscribeRequestContext, context) {
   var session = channelContext["coap.Session"];  
     
   if (context["coap.Code"] === "2.05" && context["iopa.Headers"]["Observe"]>0)
     {
        var resource = subscribeRequestContext["iopa.Path"];
         
        if (resource in session["coap.Subscriptions"])
        {
             (session["coap.Subscriptions"][resource]).forEach(function(callback){
                 callback(context);
             });
        };
    }    
};

/**
 * @method connect
 * @this CoAPClientSubscriber
 * @param string clientid  
 * @param bool clean   use clean (persistent) session
 */
CoAPClientSubscriber.prototype.hello = function CoAPClientSubscriber_hello(channelContext, ClientId, clean) {
   
    var session;
        
    if (!clean && (ClientId in db_Clients)) 
       {
          session =  db_Clients[ClientId];
       } else
       {
          session = {}
          session["coap.Subscriptions"] = {};
          session["coap.PendingMessages"] = [];
       }
               
    session["coap.ClientID"] = ClientId;
    session["coap.Clean"] = clean; 
    session["server.ChannelContext"] = channelContext;
    
    channelContext["coap.Session"] = session;
    db_Clients[ClientId] = session;
  //  channelContext["coapSessionClient._DisconnectListener"] = this.bye.bind(this, channelContext);
 //   channelContext["iopa.Events"].on("disconnect", channelContext["coapSessionClient._DisconnectListener"]);
        
    return Promise.resolve(null);
};


/**
 * @method transfer
 * @this CoAPClientSubscriber 
 * @param string resource   IOPA Path of CoAP resource
 */
CoAPClientSubscriber.prototype.transfer = function CoAPClientSubscriber_transfer(channelContext, method, resource) {
    
    var context = channelContext["server.CreateRequest"](resource, method);
    return context.send();
};

/**
 * @method subscribe
 * @this CoAPSubscriptionClient 
 * @param string topic   IOPA Path of  CoAP resource
 * @param appFunc callback  callback to for published responses
 */
CoAPClientSubscriber.prototype.subscribe = function CoAPClientSubscriber_subscribe(channelContext, method, resource, callback) {
     var session = channelContext["coap.Session"];  
     
    if (resource in session["coap.Subscriptions"])
        session["coap.Subscriptions"][resource].push(callback)
    else
        session["coap.Subscriptions"][resource] = [callback];
  
    var context = channelContext["server.CreateRequest"](resource, "GET");
    context["iopa.Headers"]["Observe"] = new Buffer('0');
    context["iopa.Events"].on("response", this._client_invokeOnParentResponse.bind(this, channelContext, context));
    
    return context.send();
};

/**
 * @method bye
 * @this CoAPClientSubscriber IOPA context dictionary
 * @param channelContext IOPA context
 */
CoAPClientSubscriber.prototype.bye = function CoAPClientSubscriber_bye(channelContext) {
      channelContext["server.RawStream"].end();
      channelContext.log.info("[COAP-SESSION-CLIENT] BYE ");    
  //    channelContext["iopa.Events"].removeListener("disconnect", channelContext["coapSubscriptionClient._DisconnectListener"]);
 //     delete channelContext["coapSubscriptionClient._DisconnectListener"];
  
      var session = channelContext["coap.Session"];
      var client =  session["coap.ClientID"]; 
      
      if (session["coap.Clean"])
      {
        if (client in db_Clients)
           {
              delete db_Clients[client] ;
          } else {
          // silently ignore
         }
  
          session["coap.Subscriptions"] = {};
      };
}

module.exports = CoAPClientSubscriber;