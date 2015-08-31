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

// CoAP parameters
var p = {
    ackTimeout: 2 // seconds
  , ackRandomFactor: 1.5
  , maxRetransmit: 4
  , nstart: 1
  , defaultLeisure: 5
  , probingRate: 1 // byte/seconds

  // MAX_LATENCY is the maximum time a datagram is expected to take
  // from the start of its transmission to the completion of its
  // reception.
  , maxLatency: 100 // seconds
}

// MAX_TRANSMIT_SPAN is the maximum time from the first transmission
// of a Confirmable message to its last retransmission.
p.maxTransmitSpan = p.ackTimeout * ((Math.pow(2, p.maxRetransmit)) - 1) * p.ackRandomFactor

// MAX_TRANSMIT_WAIT is the maximum time from the first transmission
// of a Confirmable message to the time when the sender gives up on
// receiving an acknowledgement or reset.
p.maxTransmitWait = p.ackTimeout * (Math.pow(2, p.maxRetransmit + 1) - 1) * p.ackRandomFactor


// PROCESSING_DELAY is the time a node takes to turn around a
// Confirmable message into an acknowledgement.
p.processingDelay = p.ackTimeout

// MAX_RTT is the maximum round-trip time
p.maxRTT = 2 * p.maxLatency + p.processingDelay

//  EXCHANGE_LIFETIME is the time from starting to send a Confirmable
//  message to the time when an acknowledgement is no longer expected,
//  i.e.  message layer information about the message exchange can be
//  purged
p.exchangeLifetime = p.maxTransmitSpan + p.maxRTT

// default port for CoAP
p.coapPort = 5683

// default max packet size
p.maxPacketSize = 1280

p.coapMulticastIPV4 = "224.0.1.187"
p.coapMulticastIPV6 = "FF0X::FD"

module.exports = p


