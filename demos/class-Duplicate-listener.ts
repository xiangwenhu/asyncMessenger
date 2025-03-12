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
    // @listener({
    //     type: "time",
    //     context: {
    //         name: "MyName is listener context"
    //     }
    // })
    timeListener(data: BaseResData) {
        console.log("this.name", this.name);
        console.log("time:data", data)
    }    
}

const emitterAsyncMessenger = new EmitterAsyncMessenger({
    autoGenerateRequestId: true
});

emitterAsyncMessenger.removeListener("time", emitterAsyncMessenger.timeListener);
emitterAsyncMessenger.addListener("time", emitterAsyncMessenger.timeListener);

const emitterAsyncMessenger2 = new EmitterAsyncMessenger({
    autoGenerateRequestId: true
});

