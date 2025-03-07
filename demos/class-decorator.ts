import { BaseAsyncMessenger, BaseReqData, BaseResData, GlobalReqOptions } from "../src/index";
import EventEmitter from "events";
import { listener } from "../src/decorator"

const emitter = new EventEmitter();

class EmitterAsyncMessenger extends BaseAsyncMessenger {

    private name = "mayName";

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

    @listener({
        type: "time",
        context: {
            name: "MyName is listener context"
        }
    })
    timeListener(data: BaseResData) {
        console.log("this.name", this.name);
        console.log("time:data", data)
    }


    @listener({
        type: "time",
        scope: "scope2",
        context: {
            name: "MyName is listener context scope2"
        }
    })
    timeListenerScope2(data: BaseResData) {
        console.log("scope2 this.name", this.name);
        console.log("scope2 time:data", data)
    }

}

const emitterAsyncMessenger = new EmitterAsyncMessenger({
    autoGenerateRequestId: true
});

emitterAsyncMessenger.activate();


setInterval(() => {
    emitter.emit('message', {
        type: 'time',
        data: new Date().toISOString()
    })
}, 2000)


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


// 取消监听
setTimeout(()=> {
    emitterAsyncMessenger.removeListener('time', emitterAsyncMessenger.timeListener)
}, 5 * 1000)


// 重复添加监听
setTimeout(()=> {
    emitterAsyncMessenger.addListener('time', emitterAsyncMessenger.timeListener, {
        context: emitterAsyncMessenger
    })
}, 10* 1000)




