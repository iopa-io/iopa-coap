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
  COAP = constants.COAP,
  SESSION = require('../common/constants.js').COAPSESSION
  
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
    if (!app.properties[SERVER.Capabilities]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

   app.properties[SERVER.Capabilities]["CoAPClientSubscriber.Version"] = "1.0";
   this.app = app;
   
  this.server = app.server;
  this.server.connect = this._connect.bind(this, this.server.connect);
}

/**
 * @method connect
 * @this MQTTSessionClient IOPA context dictionary
 *  @param nextConnect bound to next server.connect in chain 
 * @param string clientid  
 * @param bool clean   use clean (persistent) session
 */
CoAPClientSubscriber.prototype._connect = function CoAPClientSubscriber_connect(nextConnect, urlStr, clientid, clean){
  
  return nextConnect(urlStr).then(function (client) {
    if (client[IOPA.Scheme] !== IOPA.SCHEMES.COAP && client[IOPA.Scheme] !== IOPA.SCHEMES.COAPS)
      return client;

    var session;
    clientid = clientid || client[IOPA.Seq];

    if (!clean && (clientid in db_Clients)) {
      session = db_Clients[clientid];
    } else {
      session = {}
      session[SESSION.Subscriptions] = {};
      session[SESSION.PendingMessages] = [];
    }

    session[SESSION.ClientId] = clientid;
    session[SESSION.Clean] = clean;
    session[SERVER.ParentContext] = client;

    client[SESSION.Session] = session;
    db_Clients[clientid] = session;
    
    return client;
  });
}

/**
 * @method invoke
 * @this CoAPClientSubscriber
 * @param channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPClientSubscriber.prototype.invoke = function CoAPClientSubscriber_invoke(channelContext, next) {
    channelContext.subscribe = this.subscribe.bind(this, channelContext);
    channelContext.disconnect = this.disconnect.bind(this, channelContext);
    return next();
};

/**
 * @method subscribe
 * @this CoAPSubscriptionClient 
 * @param string topic   IOPA Path of  CoAP resource
 * @param appFunc callback  callback to for published responses
 */
CoAPClientSubscriber.prototype.subscribe = function CoAPClientSubscriber_subscribe(channelContext, topic, callback) {
  var session = channelContext[SESSION.Session];

  if (topic in session[SESSION.Subscriptions])
    session[SESSION.Subscriptions][topic].push(callback)
  else
    session[SESSION.Subscriptions][topic] = [callback];

  var defaults = {};
  defaults[IOPA.Method] = "GET";
  defaults[IOPA.Headers] = { "Observe":  new Buffer('0')};

  return channelContext.observe(topic, defaults, function (childContext) {
    if (childContext[COAP.Code] === "2.05" && childContext[IOPA.Headers]["Observe"] > 0) {
      callback(childContext);
    }
  });
};


/**
 * @method bye
 * @this CoAPClientSubscriber IOPA context dictionary
 * @param channelContext IOPA context
 */
CoAPClientSubscriber.prototype.disconnect = function CoAPClientSubscriber_disconnect(channelContext) {
      channelContext[SERVER.RawStream].end();
   
      var session = channelContext[SESSION.Session];
      var client =  session[SESSION.ClientId]; 
      
      if (session[SESSION.Clean])
      {
        if (client in db_Clients)
           {
              delete db_Clients[client] ;
          } else {
          // silently ignore
         }
  
          session[SESSION.Subscriptions] = {};
      };
}

module.exports = CoAPClientSubscriber;