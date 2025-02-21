export default {
    setup: (conf) => { return null },
    createSound: (conf) => {
        return {
            play: () => {},
            url: () => ''
        }
    },
    destroySound: (playSessionId:string) => {},
    stop: (playSessionId:string) => {},
    play: (playSessionId:string) => {},
    pause: (playSessionId:string) => {},
    ontimeout: (status:{success:boolean;error:any}) => {},
    setPosition: (playSessionId:string,offset:number) => {}
}