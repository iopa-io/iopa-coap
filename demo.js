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

global.Promise = require('bluebird');

const iopa = require('iopa')
  , coap = require('./index.js')
  , udp = require('iopa-udp')
  , IOPA = iopa.constants.IOPA

const iopaMessageLogger = require('iopa-logger').MessageLogger

var app = new iopa.App();
app.use(udp);
app.use(coap);
app.use(iopaMessageLogger);

app.use(function (context, next) {
  context.log.info("[DEMO] CoAP APP USE " + context["iopa.Method"] + " " + context["iopa.Path"]);

  if (context["iopa.Method"] === "GET") {

    setTimeout(function () {
      server[IOPA.PUBSUB.Publish]("/projector", new Buffer("Hello World"));
    }, 50);
  }
  return next();
});

var server = app.createServer("udp:");
var clientSocket = app.createServer("udp:");

server[IOPA.PUBSUB.Publish] = app[IOPA.PUBSUB.Publish];

if (!process.env.PORT)
  process.env.PORT = iopa.constants.IOPA.PORTS.COAP;

server.listen(process.env.PORT, process.env.IP)
  .then(function () {
    app.log.info("[DEMO] Server is on port " + server.port);
    return clientSocket.listen();
  })
  .then(function(){
    return clientSocket.connect("coap://127.0.0.1", "CLIENTID-1", false);
  })
  .then(function (coapClient) {
    coapClient.log.info("[DEMO] Client is on port " + coapClient["server.LocalPort"]);
    coapClient[IOPA.PUBSUB.Subscribe]('/projector', function (pubsub) {
      pubsub.log.info("[DEMO] CoAP /projector RESPONSE " + pubsub["iopa.Body"].toString());
    });
    setTimeout(function () {
      server[IOPA.PUBSUB.Publish]("/projector", new Buffer("Hello World 2"));
    }, 1000);
    setTimeout(function () {
      server.close()
      .then(function () {return clientSocket.close();})
      .then(function(){ app.log.info("[DEMO] CoAP DEMO Closed"); })
    }, 5000);
  });
    