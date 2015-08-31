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
    , Promise = require('bluebird')
    , util = require('util')
    , Events = require('events')
    , coap = require('../index.js');
    
var should = require('should');

var numberConnections = 0;

describe('#CoAP Server()', function() {
  
  var server, coapClient;
  var events = new Events.EventEmitter();
  
  before(function(done){
     var app = new iopa.App();
      
      app.use(function(context, next){
         context.log.info("CoAP DEMO " + context["iopa.Method"]); 
         events.emit("data", context);  
         return next();
          });
          
      var serverOptions = {};
      server = coap.createServer(serverOptions, app.build());
      
      if (!process.env.PORT)
        process.env.PORT = 5683;
      
       server.listen(process.env.PORT, process.env.IP).then(function(){
            done();
            setTimeout(function(){ events.emit("SERVER-UDP");}, 50);
             });
    });
    
   it('should listen via UDP', function(done) {   
           server.port.should.equal(5683);
           done();
    });
    
         
   it('should connect via UDP', function (done) {
     server.connect("coap://127.0.0.1")
       .then(function (cl) {
         coapClient = cl;
         coapClient["server.RemotePort"].should.equal(5683);
         done();
       });
   });
    
    it('should connect via CoAP', function(done) {
        coapClient.connect("CLIENTID-1", false).then(function(response){
           numberConnections ++;
            response["iopa.Method"].should.equal('CONNACK');
           events.emit("CLIENT-CONNACK");
           done();
           });
    });
    
    it('should publish / subscribe via CoAP', function(done) {
         coapClient.subscribe("/projector", function(publet){
         if (numberConnections == 1)
         {
           console.log("/projector RESPONSE " + publet["iopa.Body"].toString());
           publet["iopa.Body"].toString().should.equal('Hello World');
           done();
         }
           else
             events.emit("CLIENT-PUB", publet);
           }).then(function(response){
              response["iopa.Method"].should.equal('SUBACK');
              server.publish("/projector", new Buffer("Hello World"));
           });
    });
    
    it('should disconnect client', function(done) {
        coapClient.disconnect();
        done();
    });
    
    it('should restablish connectionion via CoAP', function(done) {
        events.on("CLIENT-PUB", function(publet){
           console.log("/projector RESPONSE2 " + publet["iopa.Body"].toString());
           publet["iopa.Body"].toString().should.equal('Hello World 2');
           done();
         });
         
       server.connect("coap://127.0.0.1")
       .then(function (cl) {
         coapClient = cl;
         coapClient["server.RemotePort"].should.equal(1883);
        return  coapClient.connect("CLIENTID-1", false)})
         .then(function(response){
          numberConnections ++;
            response["iopa.Method"].should.equal('CONNACK');
            events.emit("CLIENT-CONNACK");
             })
          .then(function(){
             return coapClient.subscribe("/projector", function(publet){
             console.log("/projector RESPONSE " + publet["iopa.Body"].toString());
             publet["iopa.Body"].toString().should.equal('Hello World 2');
             })
           })
          .then(function(response){
              response["iopa.Method"].should.equal('SUBACK');
              server.publish("/projector", new Buffer("Hello World 2"));
             });
    });
    
    it('should close', function(done) {
       server.close().then(function(){
         server.log.info("CoAP DEMO Closed");
         done();});
    });
    
});
