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


const iopa = require('iopa')
  , coap = require('./index.js')

const iopaMessageLogger = require('iopa-common-middleware').MessageLogger

var app = new iopa.App();
app.use(iopaMessageLogger);

app.use(function (context, next) {
  context.log.info("[DEMO] CoAP APP USE " + context["iopa.Method"] + " " + context["iopa.Path"]);

  if (context["iopa.Method"] === "GET") {

    setTimeout(function () {
      server.publish("/projector", new Buffer("Hello World"));
    }, 23);
  }
  return next();
});

var server = coap.createServer(app.build());
server.connectuse(iopaMessageLogger.connect);

if (!process.env.PORT)
  process.env.PORT = iopa.constants.IOPA.PORTS.COAP;

server.listen(process.env.PORT, process.env.IP)
  .then(function () {
    server.log.info("[DEMO] Server is on port " + server.port);
    return server.connect("coap://127.0.0.1", "CLIENTID-1", false);
  })
  .then(function (coapClient) {
    server.log.info("[DEMO] Client is on port " + coapClient["server.LocalPort"]);
    coapClient.subscribe('/projector', function (pubsub) {
      pubsub.log.info("[DEMO] CoAP /projector RESPONSE " + pubsub["iopa.Body"].toString());
    });
    setTimeout(function () {
      server.publish("/projector", new Buffer("Hello World 2"));
    }, 1000);
    setTimeout(function () {
      server.close().then(function () { server.log.info("[DEMO] CoAP DEMO Closed"); })
    }, 2000);
  });
    