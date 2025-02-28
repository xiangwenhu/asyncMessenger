import { BaseAsyncMessenger, BaseReqData, BaseResData, GlobalReqOptions } from "../src/index";
import { EventEmitter } from "events";
import { listener } from "../src/decorator"

const eventEmitter = new EventEmitter();

class EmitterAsyncMessenger extends BaseAsyncMessenger<EventEmitter> {

    private name = "mayName";

    constructor(options: GlobalReqOptions = {}) {
        super(options);
    }

    protected subscribe() {
        const emitter = this.ctx!;

        console.log("EmitterAsyncMessenger: subscribe");
        emitter.on("message", this.onMessage);
        return () => {
            emitter.off("message", this.onMessage);
        }
    }

    protected request(data: BaseReqData) {
        const emitter = this.ctx!;
        emitter.emit("message-request", data);
    }

    @listener({
        type: "time"
    })
    timeListener(data: BaseResData) {
        console.log("this.name", this.name);
        console.log("time:data", data)
    }
}

const emitterAsyncMessenger = new EmitterAsyncMessenger({
    autoGenerateRequestId: true,
});
emitterAsyncMessenger.setContext(eventEmitter);
emitterAsyncMessenger.activate();



setInterval(() => {
    eventEmitter.emit('message', {
        type: 'time',
        data: new Date().toISOString()
    })
}, 3000)


eventEmitter.on("message-request", (data: BaseResData) => {

    // 单向的，不回发消息
    if (data.method === "oneway") {
        return;
    }

    setTimeout(() => {
        eventEmitter.emit("message", {
            method: data.method,
            data: `${data.method}--- data`
        })
    }, 3000)

})


emitterAsyncMessenger.invoke({
    method: "cccc",
    data: 111
}).then(res => console.log("res:", res))


emitterAsyncMessenger.invoke({
    method: "oneway",
    data: 111
}, {
    sendOnly: true,
}).then(res => console.log("oneway request res:", res))



