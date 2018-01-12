const Replay  = require('replay');

const ChatEngineCore = require('../../src/index.js');
const assert = require('chai').assert;

const pubkey = 'pub-c-df1f983b-8334-44aa-b32b-2fa23eff1f8f';
const subkey = 'sub-c-bf3164ba-f737-11e7-b8a6-46d99af2bb8c';

let ChatEngine;
let ChatEngineYou;
let ChatEngineClone;
let globalChannel = 'global2';

let username = 'ian';
let yousername = 'stephen';

let ceConfig = {
    globalChannel,
    throwErrors: true
};

function createChatEngine(done) {

    this.timeout(15000);

    ChatEngine = ChatEngineCore.create({
        publishKey: pubkey,
        subscribeKey: subkey,
        logVerbosity: false
    }, ceConfig);
    ChatEngine.connect(username, { works: true }, username);
    ChatEngine.on('$.ready', () => {
        done();
    });

}

function createChatEngineClone(done) {

    this.timeout(15000);

    ChatEngineClone = ChatEngineCore.create({
        publishKey: pubkey,
        subscribeKey: subkey,
        logVerbosity: false
    }, ceConfig);
    ChatEngineClone.connect(username, { works: true }, username);
    ChatEngineClone.on('$.ready', () => {
        done();
    });

}

function createChatEngineYou(done) {

    this.timeout(15000);

    ChatEngineYou = ChatEngineCore.create({
        publishKey: pubkey,
        subscribeKey: subkey
    }, ceConfig);
    ChatEngineYou.connect(yousername, { works: true }, yousername);
    ChatEngineYou.on('$.ready', () => {
        done();
    });

}

describe('import', () => {

    it('ChatEngine should be imported', () => {
        assert.isObject(ChatEngineCore, 'was successfully created');
    });

});

let examplePlugin = () => {

    class extension {
        construct() {
            this.parent.constructWorks = true;
        }
        newMethod() {
            return this.parent.constructWorks;
        }
    }

    return {
        namespace: 'testPlugin',
        extends: {
            Chat: extension
        },
        middleware: {
            send: {
                message: (payload, next) => {
                    payload.send = true;
                    next(null, payload);
                }
            },
            broadcast: {
                message: (payload, next) => {
                    payload.broadcast = true;
                    next(null, payload);
                }
            }
        }
    };

};

let createdEventChat1;
let createdEventChat2;
describe('connect', () => {

    beforeEach(createChatEngine);

    it('should be identified as new user', function beIdentified() {

        this.timeout(16000);

        assert.isObject(ChatEngine.me);

    });

    it('should notify chatengine on created', function join(done) {

        this.timeout(6000);

        let newChat = 'chatengine-created';
        let a = false;

        ChatEngine.on('$.created.chat', (data, source) => {

            let lookingFor = globalChannel + '#chat#public.#' + newChat;

            if (source.channel === lookingFor) {
                done();
            }

        });

        a = new ChatEngine.Chat(newChat);

        setTimeout(() => {
            a.leave();
        }, 1000);

    });

    it('should notify chatengine on connected', function join(done) {

        this.timeout(10000);

        ChatEngine.on('$.connected', (data, source) => {

            assert.isObject(source);
            if (source.channel === createdEventChat1.channel) {
                done();
            }
        });

        createdEventChat1 = new ChatEngine.Chat('chatengine-connected');

    });

    it('should notify chatengine on disconnected', function disconnected(done) {

        this.timeout(4000);

        ChatEngine.on('$.disconnected', (data, source) => {

            assert.isObject(source);

            if (source.channel === createdEventChat2.channel) {
                done();
            }
        });

        createdEventChat2 = new ChatEngine.Chat('chatengine-disconnected');

        createdEventChat2.on('$.connected', () => {
            createdEventChat2.leave();
        });

    });

});

let chat;

describe('chat', () => {

    beforeEach(createChatEngine);

    it('should get me as join event', function getMe(done) {

        this.timeout(10000);

        chat = new ChatEngine.Chat('chatengine-join');

        chat.once('$.online.*', (p) => {

            if (p.user.uuid === ChatEngine.me.uuid) {
                done();
            }

        });

    });

    it('should get connected callback', function getReadyCallback(done) {

        this.timeout(5000);

        let chat2 = new ChatEngine.Chat('chatengine-connected-cb');
        chat2.on('$.connected', () => {

            done();

        });

    });

    it('should get message', function shouldGetMessage(done) {

        this.timeout(12000);

        chat.once('something', (payload) => {

            assert.isObject(payload);
            done();

        });

        setTimeout(() => {

            chat.emit('something', {
                text: 'hello world'
            });

        }, 1000);

    });

    it('should bind a plugin', () => {

        chat.plugin(examplePlugin());

        assert(chat.constructWorks, 'bound to construct');
        assert(chat.testPlugin.newMethod(), 'new method added');

    });

    it('should bind a prototype plugin', () => {

        ChatEngine.proto('Chat', examplePlugin());

        let newChat = new ChatEngine.Chat('some-other-chat');

        assert(newChat.constructWorks, 'bound to construct');
        assert(newChat.testPlugin.newMethod(), 'new method added');

    });

});

let chatHistory;
describe('history', () => {

    beforeEach(createChatEngine);

    it('should get 50 messages', function get50(done) {

        let count = 0;

        this.timeout(30000);

        chatHistory = new ChatEngine.Chat('chat-history-8', false);

        // for (let i = 0; i < 200; i++) {

        //     chatHistory.emit('tester', {
        //         text: 'hello world ' + i
        //     });
        //     chatHistory.emit('not-tester', {
        //         text: 'hello world ' + i
        //     });

        // }

        chatHistory.on('$.connected', () => {

            setTimeout(() => {

                chatHistory.search({
                    event: 'tester',
                    limit: 50
                }).on('tester', (a) => {

                    assert.equal(a.event, 'tester');

                    count += 1;

                }).on('$.search.finish', () => {
                    assert.equal(count, 50, 'correct # of results');
                    done();
                });

            }, 5000);

        });

    });

    it('should get 200 messages', function get200(done) {

        let count = 0;

        this.timeout(60000);

        let chatHistory2 = new ChatEngine.Chat('chat-history-3', false);

        // for (let i = 0; i < 200; i++) {

        //     chatHistory2.emit('tester', {
        //         text: 'hello world ' + i
        //     });
        //     chatHistory2.emit('not-tester', {
        //         text: 'hello world ' + i
        //     });

        // }

        chatHistory2.on('$.connected', () => {

            setTimeout(() => {

                chatHistory2.search({
                    event: 'tester',
                    limit: 200
                }).on('tester', (a) => {

                    assert.equal(a.event, 'tester');
                    count += 1;

                }).on('$.search.finish', () => {
                    assert.equal(count, 200, 'correct # of results');
                    done();
                });

            }, 5000);

        });

    });

    it('should get messages without event', function get50(done) {

        this.timeout(30000);

        chatHistory.search({
            limit: 10
        }).on('tester', (a) => {

            assert.equal(a.event, 'tester');

        }).on('$.search.finish', () => {
            done();
        });

    });

});

let syncChat;

let newChannel = 'sync-chat';

describe('remote chat list', () => {

    beforeEach(createChatEngine);
    beforeEach(createChatEngineClone);

    it('should be get notified of new chats', function getNotifiedOfNewChats(done) {

        this.timeout(10000);

        // first instance looking or new chats
        ChatEngine.me.on('$.session.chat.join', (payload) => {

            assert.isObject(ChatEngine.me.session.system);
            assert.isObject(ChatEngine.me.session.custom);

            if (payload.chat.channel.indexOf(newChannel) > -1) {
                done();
            }

        });

        syncChat = new ChatEngineClone.Chat(newChannel, true, true);

    });

    it('should get delete event', function deleteSync(done) {

        this.timeout(10000);

        ChatEngine.me.on('$.session.chat.leave', (payload) => {

            if (payload.chat.channel.indexOf(newChannel) > -1) {

                done();
            }

        });

        setTimeout(() => {
            syncChat.leave();
        }, 3000);


    });

});

let myChat;

let yourChat;

let privChannel = 'secret-channel-';

describe('invite', () => {

    beforeEach(createChatEngine);
    beforeEach(createChatEngineYou);

    it('two users are able to talk to each other in private channel', function shouldInvite(done) {

        this.timeout(60000);

        yourChat = new ChatEngineYou.Chat(privChannel, false, false);

        yourChat.on('$.connected', () => {

            // me is the current context
            yourChat.invite(ChatEngine.me);

        });

        yourChat.on('message', (payload) => {

            assert.equal(payload.data.text, 'sup?');
            done();

        });

        ChatEngine.me.direct.on('$.invite', (payload) => {

            myChat = new ChatEngine.Chat(payload.data.channel);

            let emit = () => {

                myChat.emit('message', {
                    text: 'sup?'
                });

            };

            if (myChat.connected) {
                emit();
            } else {
                // it's already in our session
                myChat.connect();
                myChat.on('$.connected', () => {
                    emit();
                });
            }

        });

        yourChat.connect();

    });

});
