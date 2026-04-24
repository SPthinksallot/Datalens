const { EventEmitter } = require('events');

const appEvents = new EventEmitter();

appEvents.on('file:uploaded', (info) => {
    console.log(`[EVENT] File uploaded: ${info.filename} (${info.size} bytes)`);
});

appEvents.on('analysis:done', (info) => {
    console.log(`[EVENT] Analysis complete for session: ${info.sessionId}`);
});

module.exports = appEvents;