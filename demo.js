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

const iopa = require('iopa')
    , coap = require('./index.js')      
    , Promise = require('bluebird')
    , util = require('util');


var app = new iopa.App();


app.use(function(context, next){
   context.log.info("[DEMO] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   
   if (context["iopa.Method"] === "GET")
   {
  
     setTimeout(function() {
                server.publish("/projector", new Buffer("Hello World"));
            }, 2500);
   }

   return next();
    });
    
var serverOptions = {
    "server.LocalPortReuse" : true
  , "server.IsGlobalClient" : false
};

var clientOptions = { "server.IsGlobalClient" : true
                    , "server.LocalPortReuse" : false};
                    
var server = coap.createServer(serverOptions, app.build());

if (!process.env.PORT)
  process.env.PORT = 5683;

var context;
var coapClient;
server.listen(process.env.PORT, process.env.IP)
  .then(function(){
    server.log.info("[DEMO] Server is on port " + server.port );
    return server.connect("coap://127.0.0.1");
  })
  .then(function(cl){
    coapClient = cl;
    server.log.info("[DEMO] Client is on port " + coapClient["server.LocalPort"]);
    return coapClient.hello("CLIENTID-1", false);
  })
  .then(function(){
       return coapClient.subscribe('/projector', function(context){
           console.log("[DEMO] CoAP /projector RESPONSE " + context["iopa.Body"].toString());
           });
        })
  .then(function(response){
       server.log.info("[DEMO] CoAP DEMO Response " + response["iopa.Method"] + " " + response["iopa.Body"].toString());
       setTimeout(function() {
                server.publish("/projector", new Buffer("Hello World 2"));
            }, 1000);
    })
  .then(function(response){
    //   server.log.info("CoAP DEMO Response " + response["iopa.Method"]);
    //   server.close().then(function(){server.log.info("CoAP DEMO Closed");});
    });
    