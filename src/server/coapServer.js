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

const util = require('util')

const iopa = require('iopa')
  , Coap = require('iopa-coap-packet')
  , IopaServer = require('iopa-server');

const constants = require('iopa').constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  COAP = constants.COAP

const CoAPClientSubscriber = require('../middleware/coapClientSubscriber.js')
  , CoAPServerAutoAck = require('../middleware/coapServerAutoAck.js')
  , CoAPServerPublisher = require('../middleware/coapServerPublisher.js')
  , iopaMessageConfirmableSend = require('../middleware/iopaMessageConfirmableSend.js')

const iopaMessageLogger = require('iopa-common-middleware').MessageLogger

const COAPMIDDLEWARE = require('../common/constants.js').COAPMIDDLEWARE,
  packageVersion = require('../../package.json').version

/* *********************************************************
 * IOPA CoAP SERVER / CLIENT WITH MIDDLEWARE CONSTRUCTED
 * ********************************************************* */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * CoAP IOPA Server includes CoAP Client
 * 
 * @class CoAPServer
 * @param {object} options  
 * @param {appFunc} appFunc  Server callback in IOPA AppFunc format
 * @constructor
 */
function CoAPServer(options, appFunc) {
  _classCallCheck(this, CoAPServer);

  if (typeof options === 'function') {
    appFunc = options;
    options = {};
  }
  
  /**
    * Call Parent Constructor to ensure the following are created
    *   this.serverPipeline
    *   this.clientPipeline
    */
  IopaServer.call(this, options, appFunc);
        
  // INIT COAP SERVER
  this._coap = Coap.createServer(options, this._serverRequestPipeline, this.clientPipeline);
}

util.inherits(CoAPServer, IopaServer);

/* ****************************************************** */

/**
 * SERVER CHANNEL PIPELINE SETUP
 * @InheritDoc
 */
CoAPServer.prototype._serverChannelPipelineSetup = function (serverApp) {
};

/**
 * SERVER MESSAGE PIPELINE SETUP
 * @InheritDoc
 */
CoAPServer.prototype._serverMessagePipelineSetup = function (app) {
  app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
  app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][IOPA.Protocol] = COAPMIDDLEWARE.PROTOCOLVERSION;

  //   app.use(iopaMessageConfirmableSend);
  app.use(CoAPServerPublisher);
  app.use(CoAPServerAutoAck); 
};

/**
 * CLIENT CONNECT PIPELINE
 * @InheritDoc
 */
CoAPServer.prototype._clientConnectPipelineSetup = function (clientConnectApp) {

  clientConnectApp.use(CoAPClientSubscriber);
};

/**
 * CLIENT MESSAGE SEND PIPELINE
 * @InheritDoc
 */
CoAPServer.prototype._clientMessageSendPipelineSetup = function (clientMessageApp) {
  
  //  clientMessageApp.use(iopaMessageConfirmableSend);
  clientMessageApp.use(CoAPServerAutoAck);  
};

/* ****************************************************** */
// OVERRIDE METHODS

/**
 * CoAPServer.listen()  Begin accepting connections on the specified port and hostname. 
 * If the hostname is omitted, the server will accept connections directed to any IPv4 address (INADDR_ANY).
 * 
 * @method listen
 * @param {integer} port  
 * @param {string} address (IPV4 or IPV6)
 * @returns promise completes when listening
 * @public
 */
CoAPServer.prototype._listen = function CoAPServer_listen(port, address) {
  return this._coap.listen(port, address);
};

Object.defineProperty(CoAPServer.prototype, "port", { get: function () { return this._coap.port; } });
Object.defineProperty(CoAPServer.prototype, "address", { get: function () { return this._coap.address; } });

/**
 * CoAPServer.connect() Create CoAP Session over UDP Channel to given Host and Port
 *
 * @method connect
 * @this CoAPServer instance
 * @parm {string} urlStr url representation of Request coap://127.0.0.1/hello
 * @returns {Promise(context)}
 * @public
 */
CoAPServer.prototype._connect = function CoAPServer_connect(urlStr) {
  return this._coap.connect(urlStr);
};

/**
 * CoAPServer.close() Close UDP Socket 
 *
 * @method connect
 * @this CoAPServer instance
 * @returns {Promise()}
 * @public
 */
CoAPServer.prototype._close = function CoAPServer_close() {
  return this._coap.close();
};

module.exports = CoAPServer;