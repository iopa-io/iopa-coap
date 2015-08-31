# [![IOPA](http://iopa.io/iopa.png)](http://iopa.io)<br> iopa-coap

[![Build Status](https://api.shippable.com/projects/55e4c26e1895ca4474111b91/badge?branchName=master)](https://app.shippable.com/projects/55e4c26e1895ca4474111b91) 
[![IOPA](https://img.shields.io/badge/iopa-middleware-99cc33.svg?style=flat-square)](http://iopa.io)
[![limerun](https://img.shields.io/badge/limerun-certified-3399cc.svg?style=flat-square)](https://nodei.co/npm/limerun/)

[![NPM](https://nodei.co/npm/iopa-coap.png?downloads=true)](https://nodei.co/npm/iopa-coap/)

## About
`iopa-coap` is a lightweight Constrained Application Protocol (CoAP) protocol server, based on the Internet of Protocols Association (IOPA) open standard  

It servers CoAP messages in standard IOPA format and allows existing middleware for Connect, Express and limerun projects to consume/send each mesage.

It is an open-source, standards-based, drop-in replacement for CoAP servers such as [`node-coap`](https://github.com/mcollina/node-coap).   

It uses the standards based ['iopa-coap-packet'](https://github.com/iopa-source/iopa-coap-packet) for protocol formatting, which in turn is based on the widely used library ['coap-packet'](https://github.com/mcollina/coap-packet).

Written in plain javascript for maximum portability to constrained devices

Makes CoAP messages look to an application just like an HTTP message so little or no application changes required to support multiple REST protocols

## Status

Fully working prototype include server and client.

Includes:


### Server Functions

  * Layered protocol based on native UDP sockets
  * Translation from UDP Raw Message to CoAP Packet in standard IOPA format, compatible with all HTTP and COAP applications including those written for Express, Connect, etc!
  * Optional logging middleware for each inbound message
  * Server and Client Request caching middleware
  * Confirmable send middleware that keeps retrying until acknowledgements received
  * Auto-Acknowledge middleware that automatically takes care of sending acknowledgements to inbound confirmable requests/responses
  * Observable messages (publish/subscribe)
  
### Client Functions
  * Layered protocol based on native UDP sockets
  * Translation from CoAP Packet in standard IOPA
   format to CoAP Raw Message
  * Optional logging middleware 
  * Client Request caching middleware
  * Confirmable send middleware that keeps retrying until acknowledgements received
  * Auto-Acknowledge middleware that automatically takes care of sending acknowledgements to inbound confirmable responses
  * Observable messages (publish/subscribe)
  
## Installation

    npm install iopa-coap

## Usage
    
### Simple Hello World Server and Client with Pub/Sub
``` js
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
         setTimeout(function() {
                server.close().then(function(){server.log.info("CoAP DEMO Closed"); })
            }, 2000);
    });

``` 

  
## Roadmap

Next steps are to build a reference framework to link together server, client, discovery and other protocol functions.

Adding additional features of the protocol such as Type 2 Blocks, is as simple as adding a new middleware function (10-30 lines of javascript)  

 