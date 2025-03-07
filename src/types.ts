
export type MessageType = Symbol | string | number;

interface BaseReqInfo {
    /**
     * scope，区分多个渠道
     * 比如页面打开多个iframe，我们监听的是window的message的事件，
     * 当多个iframe发送出消息时，屏蔽消息
     */
    scope?: string;
    /**
     * 执行上下文，影响方法的this
     */
    context?: any;
}

export type ListenerOptions = BaseReqInfo;

export interface BaseReqData<R = any> {
    /**
     * 请求的唯一标记
     */
    requestId?: string;
    /**
     * scope，区分多个渠道
     * 比如页面打开多个iframe，我们监听的是window的message的事件，
     * 当多个iframe发送出消息时，屏蔽消息
     */
    scope?: string;
    /**
     * 区分类型的字段，默认是type|method 
     */
    type?: MessageType;
    /**
     * 区分类型的字段，默认是type|method 
     */
    method?: MessageType;
    /**
     * 数据部分
     */
    data?: R;
}


export type BaseResData<S = any> = Omit<BaseReqData<S>, "requestId"> & {
    responseId?: string;
}


/**
 * 请求信息
 */
export interface ReqInfo<RD = any, RO = any> extends BaseReqInfo {
    /**
     * 请求的唯一ID
     */
    requestId?: string;
    /**
     * 回调函数
     */
    callback: Function;
    /**
     * 请求的原始数据，外层的scope和requestID可能与其不一致
     */
    requestData: RD;
    /**
     * 请的原始选项
     */
    requestOptions: RO | undefined;
    /**
     * 请的时间
     */
    requestTime?: number;
}

export type Unsubscribe = () => void;

export interface GlobalReqOptions<R = any, S = any> {
    /**
     * 请求超时时间
     */
    timeout?: number;
    /**
     * 是否自动激活
     */
    autoActive?: boolean;
    /**
     * 自动生成请求ID, 如果自定义，内置的无效
     */
    autoGenerateRequestId?: boolean;
    /**
     * 是否清理过期的请求
     */
    clearTimeoutReq?: boolean;
    /**
     * 启用日志
     */
    enableLog?: boolean;
    /**
     *  允许使用默认返回值，请求超时会使用请求参数中的默认返回值
     */
    enableDefaultResponse?: boolean;
    /**
     * 输出未处理的事件回调
     */
    logUnhandledEvent?: boolean;

    /**
     * 订阅, 即处理收到的消息
     */
    subscribe?(onMessage?: Function): Unsubscribe;
    /**
     * 获得请求的ID
     * @param data 
     */
    getRequestId?<R>(data: BaseReqData<R>): string;
    /**
     * 获取请求的 type
     * @param data 
     */
    getReqMsgType?(data: BaseReqData<R>): MessageType;
    /**
     * 获得响应的唯一标识
     * @param data 
     */
    getResponseId?(data: BaseResData<S>): string
    /**
     * 打开多个被请求方， 比如多个webview
     */
    getResScope?: (data: BaseResData<S>) => string | string[];
    /**
     * 提供返回后，再处理数据的能力
     */
    onResponse?: (data: BaseResData<S>) => BaseResData<S>;
    /**
     * 获取响应的 type
     * @param data 
     */
    getResMsgType?(data: BaseResData<S>): MessageType;
    /**
     * 真正的请求
     * @param data 
     * @param key 
     */
    request?(data: BaseResData<S>): any;
}


export interface RequestOptions {
    timeout?: number;
    defaultRes?: any;
    sendOnly?: boolean;
}