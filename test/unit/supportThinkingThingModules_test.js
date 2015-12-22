/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-mqtt
 *
 * iotagent-mqtt is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-mqtt is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-mqtt.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotagentMqtt = require('../../'),
    mqtt = require('mqtt'),
    config = require('../config-test.js'),
    nock = require('nock'),
    request = require('request'),
    utils = require('../utils'),
    contextBrokerMock,
    mqttClient;

describe('Support for Thinking Things Modules', function() {
    beforeEach(function(done) {
        var provisionOptions = {
            url: 'http://localhost:' + config.iota.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/deviceProvisioning/provisionDevice1.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        nock.cleanAll();

        mqttClient = mqtt.connect('mqtt://' + config.mqtt.host, {
            keepalive: 0,
            connectTimeout: 60 * 60 * 1000
        });

        contextBrokerMock = nock('http://10.11.128.16:1026')
            .matchHeader('fiware-service', 'smartGondor')
            .matchHeader('fiware-servicepath', '/gardens')
            .post('/v1/updateContext')
            .reply(200, utils.readExampleFile('./test/contextResponses/multipleMeasuresSuccess.json'));

        iotagentMqtt.start(config, function() {
            request(provisionOptions, function(error, response, body) {
                done();
            });
        });
    });

    afterEach(function(done) {
        nock.cleanAll();
        mqttClient.end();
        iotagentMqtt.stop(done);
    });

    describe('When a new measure with Thinking Thing module P1 arrives', function() {
        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/updateContext', utils.readExampleFile('./test/contextRequests/TTModuleP1.json'))
                .reply(200, utils.readExampleFile('./test/contextResponses/TTModuleP1Success.json'));
        });
        it('should send its value to the Context Broker', function(done) {
            var values = {
                humidity: '32',
                P1: '214,7,d22,b00,-64,'
            };

            mqttClient.publish('/1234/MQTT_2/attributes', JSON.stringify(values), null, function(error) {
                setTimeout(function() {
                    contextBrokerMock.done();
                    done();
                }, 100);
            });
        });
    });

    describe('When a new measure with Thinking Thing module B arrives', function() {
        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/updateContext', utils.readExampleFile('./test/contextRequests/TTModuleB.json'))
                .reply(200, utils.readExampleFile('./test/contextResponses/TTModuleBSuccess.json'));
        });
        it('should send its value to the Context Broker', function(done) {
            var values = {
                humidity: '32',
                B: '4.70,1,1,1,1,0,'
            };

            mqttClient.publish('/1234/MQTT_2/attributes', JSON.stringify(values), null, function(error) {
                setTimeout(function() {
                    contextBrokerMock.done();
                    done();
                }, 100);
            });
        });
    });
});
