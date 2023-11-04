const mqtt = require('mqtt');
const ws = require('websocket-stream');

module.exports = function ({ request, browser, utils, client, api, log }) {
    async function getSeqID(callback) {
        try {
            if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
            var response = await browser.post('https://www.facebook.com/api/graphqlbatch/', utils.getForm('3336396659757871', {
                "limit": 1,
                "before": null,
                "tags": ["INBOX"],
                "includeDeliveryReceipts": false,
                "includeSeqID": true
            }));
            if (!Array.isArray(response)) throw new Error('Not logged in.');
            client.irisSeqID = response[0].o0.data.viewer.message_threads.sync_sequence_id;
            return callback();
        } catch (error) {
            return callback(error);
        }
    }

    return async function listen(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var sessionID = Math.floor(Math.random() * 9007199254740991) + 1;
        var cookies = request.jar.getCookies('https://www.facebook.com').concat(request.jar.getCookies('https://www.messenger.com')).join('; ');
        var host = client.wssEndPoint ? client.wssEndPoint + '&sid=' + sessionID : client.region ? `wss://edge-chat.facebook.com/chat?region=${client.region.toLocaleLowerCase()}&sid=${sessionID}` : `wss://edge-chat.facebook.com/chat?sid=${sessionID}`;
        var options = {
            clientId: "mqttwsclient",
            protocolId: 'MQIsdp',
            protocolVersion: 3,
            username: JSON.stringify({
                u: client.userID,
                s: sessionID,
                chat_on: client.configs.onlineStatus,
                fg: false,
                d: utils.getGUID(),
                ct: "websocket",
                aid: client.appID,
                mqtt_sid: "",
                cp: 3,
                ecp: 10,
                st: [],
                pm: [],
                dc: "",
                no_auto_fg: true,
                gas: null,
                pack: []
            }),
            clean: true,
            wsOptions: {
                headers: {
                    'Cookie': cookies,
                    'Origin': 'https://www.facebook.com',
                    'User-Agent': client.configs.userAgent,
                    'Referer': 'https://www.facebook.com/',
                    'Host': new URL(host).hostname
                },
                origin: 'https://www.facebook.com',
                protocolVersion: 13
            },
            keepalive: 10,
            reschedulePings: false
        };

        if (!client.irisSeqID) await getSeqID();

        client.mqtt = new mqtt.Client(_ => ws(host, options.wsOptions), options);
        
        client.mqtt.on('error', function (error) {
            client.mqtt.removeAllListeners();
            if (client.configs.autoReconnect) {
                log('LISTENER', 'Got an error. AutoReconnect is enable, starting reconnect...', 'warn');
                return getSeqID(function(error) {
                    return error ? callback(error) : listen(callback);
                });
            }
            return callback(error, null);
        });

        client.mqtt.on('connect', function () {
            client.mqtt.subscribe('#');
            var queue = {
                sync_api_version: 10,
                max_deltas_able_to_process: 1000,
                delta_batch_size: 500,
                encoding: "JSON",
                entity_fbid: client.userID,
                initial_titan_sequence_id: client.irisSeqID,
                device_params: null
            };
            
            client.mqtt.publish('/messenger_sync_create_queue', JSON.stringify(queue), { qos: 1 });
            client.mqtt.publish("/foreground_state", JSON.stringify({ foreground: client.configs.onlineStatus }), { qos: 1 });
            client.mqtt.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });

            var reconnectTimeout = setTimeout(function() {
                client.mqtt.end();
                return getSeqID(function(error) {
                    return error ? callback(error) : listen(callback);
                });
            }, 5000);

            client.tmsWait = function() {
                clearTimeout(reconnectTimeout);
                if (client.configs.emitReady) log('LISTENER', 'Listener is connected.', 'warn');
                delete client.tmsWait;
                api.disconnect = function(callback) {
                    client.mqtt.unsubscribe("#");
                    client.mqtt.publish("/browser_close", "{}");
                    client.removeAllListeners();
                    client.mqtt.end();
                    delete client.mqtt;
                    delete api.disconnect;
                    if (client.configs.emitReady) log('LISTENER', 'Listener is disconnected.', 'warn');
                    return callback();
                }
            }
        });

        client.mqtt.on('message', async function(topic, message, _packet) {
            let data = await utils.buffer2json(message);
            
            if (data.type === 'jewel_requests_add') {
                callback(null, {
                    type: "friend_request_received",
                    actorFbId: data.from.toString(),
                    timestamp: Date.now().toString()
                })
            }
            if (data.type === 'jewel_requests_remove_old') {
                callback(null, {
                    type: "friend_request_cancel",
                    actorFbId: data.from.toString(),
                    timestamp: Date.now().toString()
                })
            }
            if (topic === '/t_ms') {
                if (client.tmsWait && Function.isFunction(client.tmsWait)) client.tmsWait();
                for (let i in data.deltas) utils.parseDelta({ browser, api, callback, deltas: data.deltas[i] });
            }
            if ((topic === '/thread_typing' || topic === '/orca_typing_notifications') && client.configs.listenTyping) {
                callback(null, {
                    type: "typ",
                    isTyping: !!data.state,
                    from: data.sender_fbid.toString(),
                    threadID: utils.formatID((data.thread || data.sender_fbid).toString())
                });
            }
            if (topic === '/orca_presence' && client.configs.updatePresence) {
                callback(null, {
                    type: 'presence',
                    list: data.list.map(value => {
                        return {
                            userID: value['u'].toString(),
                            timestamp: value['u'] * 1000,
                            statuses: value['p']
                        }
                    })
                });
            }
        });

        client.mqtt.on('close', function () {
            client.mqtt.removeAllListeners();
            if (client.configs.emitReady) log('LISTENER', 'Listener is disconnected.', 'warn');
            if (client.configs.autoReconnect) {
                if (client.configs.emitReady) log('LISTENER', 'Starting reconnect...', 'warn');
                return getSeqID(function(error) {
                    return error ? callback(error) : listen(callback);
                });
            }
        });
    }
}