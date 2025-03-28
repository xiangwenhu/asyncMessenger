
## 摘要
传统基于事件通信转Promise通用方案。

支持模式：
* 有发有收
* 只发不收
* 只收不发

支持场景：
* EventEmitter 等
* MQTT, socket.io 等
* iframe
* webview
* 各种 **端** 到 **端** 场景。


## 依赖
其依赖了ES6的Map, 如果项目已经使用了[core-js](https://www.npmjs.com/package/core-js)，直接引用其map就行。

如果仅仅单独引入Map, 建议[es6-map](https://github.com/medikoo/es6-map)


## 流程和原理图
![流程和原理图](./docs/images/process.png)

## 源码结构说明
```
    src
        decorator
            index.ts             监听装饰器
        utils
            index                工具方法
            function             函数相关的工具方法
        BaseAsyncMessenger.ts    核心，基础异步消息处理类，包含：流程控制，主动的Promise类型的通讯
        DataStore                数据存储
        index.ts                 入口文件
        PEventMessenger.ts       消息中心，BaseAsyncMessenger继承于他，处理被动的消息。
        types.ts                 类型定义
```


## 示例代码
[示例代码源码地址](./demos)


### EventEmitter


events.js
```js
import EventEmitter from "events";
import { BaseReqData } from "async-messenger-js"

const emitter = new EventEmitter();

setInterval(() => {
    emitter.emit('message', {
        method: 'continuous-event',
        data: new Date().toLocaleTimeString()
    })
}, 3000)

emitter.on("message-request", (data: BaseReqData) => {
    // 单向的，不回发消息
    if (data.method === "oneWay") {
        return;
    }
    setTimeout(() => {
        emitter.emit("message", {
            method: data.method,
            data: `${data.method}--- data`
        })
    }, 3000)
})

export default emitter;
```

messenger.js
```js
import { BaseAsyncMessenger, BaseReqData, BaseResData, GlobalReqOptions, listener } from "async-messenger-js";
import emitter from "./events";

class EmitterAsyncMessenger extends BaseAsyncMessenger {
    constructor(options: GlobalReqOptions = {}) {
        super(options);
    }
    override subscribe() {
        console.log("WebViewBridge: subscribe");
        emitter.on("message", this.onMessage);
        return () => {
            emitter.off("message", this.onMessage);
        }
    }

    protected request(data: BaseReqData) {
        emitter.emit("message-request", data);
    }

    /**
     * 被动监听
     * @param data 
     */
    @listener({ type: "continuous-event" })
    continuousEvent(data: BaseResData) {
        console.log("continuous-event:", data)
    }
}

export default new EmitterAsyncMessenger();
```


index.js
```js
import messenger from "./messenger";

messenger.activate();

messenger.invoke({
    method: "cccc",
    data: 111
}).then(res => console.log("res:", res))


messenger.invoke({
    method: "oneWay",
    data: 111
}, {
    sendOnly: true,
}).then(res => console.log("oneWay request res:", res))

// 输出：
// WebViewBridge: subscribe
// oneWay request res: undefined
// continuous-event: { method: 'continuous-event', data: '20:35:29' }
// res: { method: 'cccc', data: 'cccc--- data' }
// continuous-event: { method: 'continuous-event', data: '20:35:32' }
// continuous-event: { method: 'continuous-event', data: '20:35:35' }
// continuous-event: { method: 'continuous-event', data: '20:35:38' }

```

### iframe

```html
    <iframe src="./iframe1.html" id="ifr"></iframe>
    <script src="../../dist/umd/asyncMessenger.js"></script>
    <script>

        function sendMessage(msg) {
            iframe1.contentWindow.postMessage(msg)
        }
        const iframe1 = document.getElementById("ifr");

        const asyncMessenger = new AsyncMessenger.BaseAsyncMessenger({
            // logUnhandledEvent: false,
            subscribe(onMessage) {
                function onIframeMessage(msg) {
                    onMessage(msg.data);
                }
                window.addEventListener("message", onIframeMessage);
                return () => {
                    window.removeEventListener("message", onIframeMessage);
                }
            },
            request(data, key) {
                sendMessage(data);
            }
        });

        asyncMessenger.activate();

        iframe1.contentWindow.onload = () => {
            // 异步Promise调用
            asyncMessenger.invoke({
                method: "init",
                data: {
                    user: 123456,
                    token: "blabla......"
                }
            }).then(res => console.log("index.html:", res, res))
        }
        // 传统的回调调用
        asyncMessenger.addListener("timeInfo", function(data){
            console.log("index.html:timeInfo", data);
        })


    </script>
```

## socket.io

不到20行代码，就实现了异步编程。

```js
const socket = io("http://localhost:3000");

function sendMessage(msg) {
    socket.emit("message", msg)
}

const asyncMessenger = new AsyncMessenger.BaseAsyncMessenger({
    // logUnhandledEvent: false,
    subscribe(onMessage) {
        function onSocketMessage(msg) {
            onMessage(msg);
        }
        socket.on("message", onSocketMessage);
        return () => {
            socket.off("message", onSocketMessage);
        }
    },    
    request(data, key) {
        sendMessage(data);
    }
});
asyncMessenger.activate();
socket.on("connect", () => {
    console.log("connect")
    asyncMessenger.invoke({
        method: "getUsers",
        data: {
            user: 123456,
            token: "blabla......"
        }
    }).then(res => console.log("index.html:", res, res))
});

asyncMessenger.addListener("timeInfo", function (data) {
    console.log("index.html:timeInfo", data);
});

```
