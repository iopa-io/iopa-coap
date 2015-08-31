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
 
 var db_Clients = {};
 var db_Subscriptions = {};
 
/**
 * CoAP IOPA Middleware for Server PubSub including Auto Subscribing Client Subscribe Requests
 *
 * @class CoapServerPublisher
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoapServerPublisher(app) {
    if (!app.properties["server.Capabilities"]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

   app.properties["server.Capabilities"]["CoapServerPublisher.Version"] = "1.0";
   this.app = app;
   this.server = app.server;
   
   this.server.publish = this.publish.bind(this);
}

/**
 * Local utility function to create a unique persistent client ID for each incoming client
 * 
 * @method clientKey
 * @param context IOPA context dictionary
 * @return string unique client id generated from incoming context
 * @private
 */
 function clientKey(context){
    return context["server.RemoteAddress"] + ":" + context["server.RemotePort"];
}

/**
 * @method invoke
 * @this CoapServerPublisher
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoapServerPublisher.prototype.invoke = function CoapServerPublisher_invoke(context, next) {
     
     if ((context['iopa.Method'] == 'GET') && ('Observe' in context['iopa.Headers']))
     {
       var clientId =  clientKey(context);
       var client;
       var resource = context["iopa.Path"];
           console.log("[CoAPSERVERPUBSUB] SUBSCRIBING " + resource +  " FOR " +  clientId);
     
         if (clientId in db_Clients) 
           {
              client =  db_Clients[clientId];
           } else
           {
              client = {}
              client["coap.Subscriptions"] = {};
              db_Clients[clientId] = client;
           }
           
           var subscription =  {
              "server.RemoteAddress": context["server.RemoteAddress"] 
            , "server.RemotePort": context["server.RemotePort"]
            , "iopa.Body": context.response["iopa.Body"]
            , "iopa.Headers": context.response["iopa.Headers"]
            , "coap.Observe": 1
            };
            
            client["coap.Subscriptions"][resource] = subscription;
   
         // Add to global subscriptions
         if (resource in db_Subscriptions){
             if (db_Subscriptions[resource].indexOf(clientId) > -1)
             {
                 // SILENTLY IGNORE ALREADY SUBSCRIBED
             } else
             {
                 db_Subscriptions[resource].push(clientId);
             }
             
         } else
         {
             db_Subscriptions[resource] = [clientId];
         }
   
       }
 
    return next();
};

/**
 * @method unsubsubscribe
 * TODO:  CALL THIS METHOD WHEN UDP ERRORS OCCUR FOR GIVEN CLIENT
 * @param context IOPA context dictionary
 * @public
 */
CoapServerPublisher.prototype.unsubsubscribe = function CoapServerPublisher_unsubsubscribe(context) {
    
   var clientId =  clientKey(context);
         
    if (clientId in db_Clients)
    {
        db_Clients[clientId].forEach(function(client){
            client["coap.Subscriptions"].forEach(function(resource){
                if (resource in db_Subscriptions){
                   for(var i = db_Subscriptions[resource].length; i--;) {
                          if(db_Subscriptions[resource][i] === clientId) {
                              db_Subscriptions[resource].splice(i, 1);
                          }
                      }    
                 } else
                 {
                      // SILENTLY IGNORE NOT SUBSCRIBED FOR ANY CLIENT ON THIS TOPIC
                 }
            });
            delete db_Clients[clientId];
        });
    }
};
    
/**
 * @method publish
 * @param string resource   IOPA Path of  CoAP resource
 * @param buffer payload  payload to publish to all subscribed clients
 */
CoapServerPublisher.prototype.publish = function CoapServerPublisher_publish(resource, payload) {
    if (resource in db_Subscriptions)
    {
        
        var client;
        db_Subscriptions[resource].forEach(function(clientId){
           if (clientId in db_Clients)
             {
                  console.log("[CoAPSERVERPUBSUB] PUBLISHING " + payload.toString() + " FOR " + clientId + resource);
                  client = db_Clients[clientId];
                  var subscription = client["coap.Subscriptions"][resource];
                  subscription["iopa.Headers"]["Observe"] = new Buffer((subscription["coap.Observe"]++).toString(), 'utf8');
                  subscription["iopa.Body"].write(payload);
             }
             else 
             {
                 // missing client, ignore
             }
        });
        
    } else
    {
        // no subscriptions, ignore
    }
};

module.exports = CoapServerPublisher;