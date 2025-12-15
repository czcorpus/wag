export default {
    setup: (conf) => { return null },
    createSound: (conf) => {
        return {
            play: () => {},
            url: () => ''
        }
    },
    destroySound: (playSessionId) => {},
    stop: (playSessionId) => {},
    play: (playSessionId) => {},
    pause: (playSessionId) => {},
    ontimeout: (status) => {},
    setPosition: (playSessionId,offset) => {}
}