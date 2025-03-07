import { BaseAsyncMessenger, BaseReqData, BaseResData, GlobalReqOptions } from "../src/index";
import EventEmitter from "events";

const emitter = new EventEmitter();

class EmitterAsyncMessenger extends BaseAsyncMessenger {

    constructor(options: GlobalReqOptions = {}) {
        super(options);
    }

    protected subscribe() {
        console.log("EmitterAsyncMessenger: subscribe");
        emitter.on("message", this.onMessage);
        return () => {
            emitter.off("message", this.onMessage);
        }
    }

    protected request(data: BaseReqData) {
        emitter.emit("message-request", data);
    }
}

const emitterAsyncMessenger = new EmitterAsyncMessenger({
    autoActive: true
});

emitterAsyncMessenger.activate();


emitter.on("message-request", (data: BaseResData) => {

    // 单向的，不回发消息
    if (data.method === "oneway") {
        return;
    }

    setTimeout(() => {
        emitter.emit("message", {
            method: data.method,
            data: `${data.method}--- data`
        })
    }, 3000)

})


emitterAsyncMessenger.invoke({
    method: "cccc",
    data: 111,
    scope: 'a'
}).then(res => console.log("res scope a:", res))


emitterAsyncMessenger.invoke({
    method: "cccc",
    data: 111,
}).then(res => console.log("res scope:", res))


emitterAsyncMessenger.invoke({
    method: "oneway",
    data: 111
}, {
    sendOnly: true,
}).then(res => console.log("oneway request res:", res))


// emitterAsyncMessenger.addListener("continuous-event", function onEvent(data) {
//     console.log("continuous-event:", data);
// })


