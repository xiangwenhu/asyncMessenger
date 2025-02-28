import PEventMessenger from "./PEventMessenger";
import DataStore from "./DataStore";
import {
    BaseReqData,
    BaseResData,
    GlobalReqOptions,
    ListenerOptions,
    MessageType,
    RequestOptions,
    Unsubscribe,
} from "./types";
import * as utils from "./utils/index";

const DEFAULT_GLOBAL_OPTIONS: GlobalReqOptions = {
    timeout: 5000,
    clearTimeoutReq: true,
    enableLog: true,
    logUnhandledEvent: true,
};

type ExtensibleMethod =
    | "subscribe"
    | "getRequestId"
    | "getReqMsgType"
    | "getResponseId"
    | "getResMsgType"
    | "request"
    | "getResScope"
    | "onResponse";

export default class BaseAsyncMessenger<C = any> {
    private useOptions: boolean = false;

    private statistics = {
        reqCount: 0,
        resCount: 0,
        timeOutCount: 0,
    };

    private options: GlobalReqOptions;

    private store = new DataStore();

    private events = new PEventMessenger();

    protected unSubscribe?: Unsubscribe;

    private isActivated: boolean = false;


    constructor(options: GlobalReqOptions = DEFAULT_GLOBAL_OPTIONS, protected ctx?: C) {
        this.options = { ...DEFAULT_GLOBAL_OPTIONS, ...options };

        if (this.options.subscribe && utils.isFunction(this.options.subscribe)) {
            // 绑定参数 this.onMessage， 以方便options使用
            this.subscribe = this.options.subscribe.bind(this, this.onMessage);
            // this.unsubscribe = this.subscribe(this.onMessage)
            // 定义了 subscribe，即可认为是 useOptions
            this.useOptions = true;
        }

        if (!!options.autoActive) {
            this.activate();
        }
    }

    getContext(): C | undefined {
        return this.ctx
    }

    setContext(ctx: C | undefined = undefined) {
        this.ctx = ctx
    }

    activate() {
        if (this.isActivated) return console.warn("已激活，无需再激活");
        this.unSubscribe = this.subscribe();
        this.isActivated = true;
    }

    deActivate() {
        if (this.unSubscribe) {
            this.unSubscribe();
        }
        this.isActivated = false;
    }

    protected subscribe(this: BaseAsyncMessenger): Unsubscribe {
        throw new Error("not implemented");
    }

    protected request<D>(_data: BaseReqData<D>): any {
        throw new Error("not implemented");
    }

    /**
     * 获取请求的唯一标识
     * @param data
     * @returns
     */
    protected getRequestId<D>(_data: BaseReqData<D>): string | undefined {
        return this.options.autoGenerateRequestId ? utils.uuid() : undefined;
    }

    protected getReqMsgType<D>(data: BaseReqData<D>): MessageType | undefined {
        return data.method || data.type;
    }

    protected getResMsgType<RD>(
        data: BaseResData<RD>
    ): MessageType | undefined {
        return data.method || data.type;
    }

    protected getResponseId<RD>(data: BaseResData<RD>): string | undefined {
        return data.responseId;
    }

    protected getResScope<RD>(data: BaseResData<RD>) {
        return data.scope;
    }

    protected onResponse<RD>(_messageType: MessageType, data: BaseResData<RD>) {
        return data;
    }

    private getMethod = <R>(name: ExtensibleMethod) => {
        const optMethod = this.options[name as keyof GlobalReqOptions];
        const classMethod = this[name as keyof this];

        const method = this.useOptions
            ? optMethod || classMethod
            : classMethod || optMethod;
        if (!method) {
            console.error(
                `${method} 查找失败，请确保在Class或者options上已定义`
            );
        }
        return method as (...args: any[]) => R;
    };

    protected onMessage = <RD>(data: BaseResData<RD> = {}) => {
        const messageType = this.getMethod<MessageType>("getResMsgType")(data);
        const responseId = this.getMethod<string | undefined>("getResponseId")(
            data
        );
        const scope = this.getMethod<string>("getResScope")(data);

        // 提供自定义助力数据的能力
        data = this.onResponse(messageType, data);

        // 内置的成功处理
        this.onBuiltInResponse(messageType, data, {
            scope,
        });

        const reqInfo = this.store.getOne(messageType, {
            scope,
            requestId: responseId,
        });

        const isInHandlers = this.events.has(messageType);
        //  AsyncMessenger中没有，PEventMessenger中也没有, 并且开启相关的日志输出
        if (!reqInfo && !isInHandlers && this.options.logUnhandledEvent) {
            this.onError();
            console.warn(
                `未找到category为${messageType},requestId${responseId}的回调信息`
            );
            return;
        }
        if (!reqInfo) return;
        this.store.remove(messageType, reqInfo);
        this.onSuccess(messageType, data);
        if (reqInfo) {
            reqInfo.callback(data);
        }
    };

    invoke<D = any, RD = any>(
        data: BaseReqData<D>,
        reqOptions?: RequestOptions,
        ...args: any[]
    ): Promise<BaseResData<RD> | undefined> {
        this.statistics.reqCount++;
        const {
            timeout = 5000,
            sendOnly = false,
            defaultRes = {
                message: "请求超时",
            },
        } = reqOptions || {};

        const tout = timeout || this.options.timeout;
        const messageType = this.getMethod<MessageType | undefined>(
            "getReqMsgType"
        )(data);

        if (messageType == undefined) {
            return Promise.reject(new Error(`messageType is undefined`));
        }
        // 获得请求唯一ID
        if (!utils.hasOwnProperty(data, "requestId")) {
            data.requestId = this.getMethod<string>("getRequestId").apply(
                this,
                [data]
            );
        }
        const requestId = data.requestId;
        const request = this.getMethod("request");
        // 只发不收
        if (sendOnly) {
            request.call(this, data, requestId, ...args);
            return Promise.resolve(undefined);
        }

        return new Promise((resolve, reject) => {
            const { run, cancel } = utils.delay(undefined, tout);
            // 超时
            run().then(() => {
                console.log("请求超时:", messageType, data, requestId);
                this.onTimeout();
                if (this.options.clearTimeoutReq) {
                    this.store.removeOneByOptions(messageType, {
                        requestId,
                        scope: data.scope,
                    });
                }
                reject({
                    message: "请求超时",
                    ...(defaultRes || {}),
                });
            });

            this.store.add(messageType, {
                requestId: requestId,
                callback: (msg: any) => {
                    // 取消超时回调
                    cancel();
                    resolve(msg);
                },
                scope: data.scope,
            });
            // 调用
            request.call(this, data, ...args);
        });
    }

    invokeOnly<D = any, RD = any>(
        data: BaseReqData<D>,
        reqOptions?: Omit<RequestOptions, "sendOnly">,
        ...args: any[]
    ) {
        return this.invoke<D, RD>(
            data,
            {
                ...(reqOptions || {}),
                sendOnly: true,
            },
            ...args
        );
    }

    private onTimeout = () => {
        this.statistics.timeOutCount++;
    };

    private onError = () => { };

    private onSuccess = <RD>(
        _messageType: MessageType,
        _data: BaseResData<RD>
    ) => {
        this.statistics.resCount++;
    };

    protected onBuiltInResponse<RD>(
        messageType: MessageType,
        data: BaseResData<RD>,
        options: ListenerOptions
    ) {
        if (messageType == undefined) {
            return data;
        }
        // TODO:: 这里可能被串改数据
        this.events.emit(messageType, data, options);
        return data;
    }

    public getStatistics() {
        return {
            total: this.statistics.reqCount,
            success: this.statistics.resCount,
            timeout: this.statistics.timeOutCount,
        };
    }

    addListener = this.events.on;

    removeListener = this.events.off;

    clear() {
        this.store.clear();
        this.events.clear();
    }
}
