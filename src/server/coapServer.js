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

const iopaCoAPPacket = require('iopa-coap-packet')
 
const constants = require('iopa').constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  COAP = constants.COAP

const coapClientSubscriber = require('../middleware/coapClientSubscriber.js')
  , coapServerAutoAck = require('../middleware/coapServerAutoAck.js')
  , coapServerPublisher = require('../middleware/coapServerPublisher.js')
  , iopaMessageConfirmableSend = require('../middleware/iopaMessageConfirmableSend.js')

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* *********************************************************
 * IOPA CoAP SERVER / CLIENT WITH MIDDLEWARE CONSTRUCTED
 * ********************************************************* */

const COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap", PROTOCOLVERSION: "RFC 7252"},
       packageVersion = require('../../package.json').version;

/**
 * CoAP IOPA Server includes CoAP Client
 * 
 * @class CoAPServer
 * @param {object} options  
 * @param {appFunc} appFunc  Server callback in IOPA AppFunc format
 * @constructor
 */
module.exports = function CoAPServer(app) {
   _classCallCheck(this, CoAPServer);
      
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][IOPA.Protocol] = COAPMIDDLEWARE.PROTOCOLVERSION;

    app.use(iopaCoAPPacket);
    app.use(coapClientSubscriber);
    app.use(coapServerAutoAck);
    app.use(coapServerPublisher);
    app.use(iopaMessageConfirmableSend);
}