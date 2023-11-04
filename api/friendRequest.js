module.exports = function friendRequest({ browser, utils, client, Language }) {
    function getForm(userID, requestType) {
        var getType = {
            accept: { type: 'FriendingCometFriendRequestConfirmMutation', doc_id: '6368093549870401' },
            delete: { type: 'FriendingCometFriendRequestDeleteMutation', doc_id: '9537754982908835' },
            cancel: { type: 'FriendingCometFriendRequestCancelMutation', doc_id: '5247084515315799' },
            send: { type: 'FriendingCometFriendRequestSendMutation', doc_id: '5858881354228304' }
        }
        var { type, doc_id } = getType[requestType];
        var formData = {
            doc_id: doc_id,
            fb_api_caller_class: 'RelayModern',
            fb_api_req_friendly_name: type,
            server_timestamps: true
        }
        if (requestType === 'accept') formData.variables = JSON.stringify({
            input: {
                friend_requester_id: userID,
                source: '/profile.php',
                actor_id: client.userID,
                client_mutation_id: Math.round(Math.random() * 19).toString()
            },
            scale: 1
        });
        if (requestType === 'delete') formData.variables = JSON.stringify({
            input: {
                friend_requester_id: userID,
                source: "/profile.php",
                actor_id: client.userID,
                client_mutation_id: Math.round(Math.random() * 19).toString()
            },
            scale: 1,
            refresh_num: 0,
            __relay_internal__pv__StoriesRingrelayprovider: false
        });
        if (requestType === 'cancel') formData.variables = JSON.stringify({
            input: {
                cancelled_friend_requestee_id: userID,
                source: "profile",
                actor_id: client.userID,
                client_mutation_id: Math.round(Math.random() * 19).toString()
            },
            scale: 1
        });
        if (requestType === 'send') formData.variables = JSON.stringify({
            input: {
                friend_requestee_ids: [userID],
                refs: [null],
                source: "profile_button",
                warn_ack_for_ids: [],
                actor_id: client.userID,
                client_mutation_id: Math.round(Math.random() * 19).toString()
            },
            scale: 1
        });
        return formData;
    }
    return async function(userID, type, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!userID || !utils.includes(userID, 'String', 'Number')) return callback(Language('friendRequest', 'needUserID'));
        if (!type || !['accept', 'delete', 'send', 'cancel'].includes(type)) return callback(Language('friendRequest', 'needRequestType'));
        let form = getForm(userID, type);
        var response = await browser.post('https://www.facebook.com/api/graphql/', form);
        return !response || response.error ? callback(response) : callback(null);
    }
}