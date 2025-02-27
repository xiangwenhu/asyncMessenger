(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.AsyncMessenger = {}));
})(this, (function (exports) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    const { hasOwnProperty: hasOwn } = Object.prototype;
    function isFunction$1(fn) {
        return typeof fn === 'function';
    }
    const noop = function noop() { };
    /**
     * 延时执行函数
     * @param fn
     * @param delay
     * @param context
     * @returns
     */
    function delay(fn = () => { }, delay = 5000, context = null) {
        if (!isFunction$1(fn)) {
            return {
                run: () => Promise.resolve(),
                cancel: noop
            };
        }
        let ticket;
        let executed = false;
        return {
            run(...args) {
                return new Promise((resolve, reject) => {
                    if (executed === true) {
                        return;
                    }
                    executed = true;
                    ticket = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const res = yield fn.apply(context, args);
                            resolve(res);
                        }
                        catch (err) {
                            reject(err);
                        }
                    }), delay);
                });
            },
            cancel: () => {
                clearTimeout(ticket);
            }
        };
    }
    function hasOwnProperty(obj, property) {
        return hasOwn.call(obj, property);
    }
    function isSameScope(scope1, scope2) {
        // TODO:
        return scope1 == scope2;
    }
    function uuid() {
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    class DataStore {
        constructor() {
            this.map = new Map();
        }
        add(type, reqInfo) {
            const infos = this.map.get(type);
            if (!infos) {
                this.map.set(type, []);
            }
            this.map.get(type).push({
                requestId: reqInfo.requestId,
                reqTime: Date.now(),
                callback: reqInfo.callback,
                scope: reqInfo.scope,
            });
        }
        remove(type, reqInfo) {
            const infos = this.map.get(type);
            if (!infos || infos.length === 0) {
                return undefined;
            }
            const index = infos.findIndex((info) => {
                // TODO:: 有沒有必要严格比较每个字段
                return (info === reqInfo ||
                    (info.callback === reqInfo.callback &&
                        info.scope === reqInfo.scope &&
                        info.callback === reqInfo.callback));
            });
            if (index >= 0) {
                infos.splice(index, 1);
                this.removeTypeIfNoReqInfos(type);
            }
        }
        removeTypeIfNoReqInfos(type) {
            const infos = this.getByType(type);
            if (!Array.isArray(infos))
                return;
            if (infos.length === 0)
                this.removeByType(type);
        }
        removeOneByOptions(type, options = {}) {
            const infos = this.get(type, options);
            if (!infos)
                return;
            this.remove(type, infos[0]);
        }
        removeByType(type) {
            this.map.delete(type);
        }
        getByType(type) {
            return this.map.get(type);
        }
        get(messageType, options = {}) {
            const { requestId, scope } = options;
            let reqInfos = this.map.get(messageType);
            if (!reqInfos || reqInfos.length === 0) {
                return undefined;
            }
            const hasRequestId = typeof requestId === "string" && requestId.trim() !== "";
            const hasScope = typeof scope === "string" && scope.trim() !== "";
            // 过滤scope
            if (hasScope) {
                reqInfos = reqInfos.filter((c) => isSameScope(c === null || c === void 0 ? void 0 : c.scope, scope));
            }
            // 过滤 requestId
            if (hasRequestId) {
                reqInfos = reqInfos.filter((c) => c.requestId === requestId);
            }
            return reqInfos;
        }
        getOne(messageType, options = {}) {
            const infos = this.get(messageType, options);
            return infos ? infos[0] : undefined;
        }
        has(messageType, options = {}) {
            return !!this.get(messageType, options);
        }
        hasType(messageType) {
            return this.map.has(messageType);
        }
        clear() {
            this.map.clear();
        }
    }

    class PEventMessenger {
        constructor() {
            this.store = new DataStore();
            /**
             * 可以处理多种类型的事件
             * @param type
             * @returns
             */
            this.on = (type, listener, options = {}) => {
                if (typeof listener !== "function") {
                    return console.error(`PEventMessenger::on: fn 必须是一个函数`);
                }
                this.store.add(type, {
                    callback: listener,
                    scope: options.scope,
                });
            };
            this.off = (type, listener, options = {}) => {
                this.store.remove(type, {
                    scope: options.scope,
                    callback: listener,
                });
            };
            this.emit = (type, data, options = {}) => {
                const infos = this.store.get(type, options);
                if (!Array.isArray(infos)) {
                    return;
                }
                const bInfos = [...infos];
                bInfos.forEach((info) => {
                    info.callback(data);
                });
            };
        }
        has(type, options = {}) {
            return this.store.has(type, options);
        }
        clear() {
            this.store.clear();
        }
    }

    const DEFAULT_GLOBAL_OPTIONS = {
        timeout: 5000,
        clearTimeoutReq: true,
        enableLog: true,
        logUnhandledEvent: true,
    };
    class BaseAsyncMessenger {
        constructor(options = DEFAULT_GLOBAL_OPTIONS) {
            this.useOptions = false;
            this.statistics = {
                reqCount: 0,
                resCount: 0,
                timeOutCount: 0,
            };
            this.store = new DataStore();
            this.events = new PEventMessenger();
            this.isActivated = false;
            this.getMethod = (name) => {
                const optMethod = this.options[name];
                const classMethod = this[name];
                const method = this.useOptions
                    ? optMethod || classMethod
                    : classMethod || optMethod;
                if (!method) {
                    console.error(`${method} 查找失败，请确保在Class或者options上已定义`);
                }
                return method;
            };
            this.onMessage = (data = {}) => {
                const messageType = this.getMethod("getResMsgType")(data);
                const responseId = this.getMethod("getResponseId")(data);
                const scope = this.getMethod("getResScope")(data);
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
                    console.warn(`未找到category为${messageType},requestId${responseId}的回调信息`);
                    return;
                }
                if (!reqInfo)
                    return;
                this.store.remove(messageType, reqInfo);
                this.onSuccess(messageType, data);
                if (reqInfo) {
                    reqInfo.callback(data);
                }
            };
            this.onTimeout = () => {
                this.statistics.timeOutCount++;
            };
            this.onError = () => { };
            this.onSuccess = (_messageType, _data) => {
                this.statistics.resCount++;
            };
            this.addListener = this.events.on;
            this.removeListener = this.events.off;
            this.options = Object.assign(Object.assign({}, DEFAULT_GLOBAL_OPTIONS), options);
            if (this.options.subscribe && isFunction$1(this.options.subscribe)) {
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
        activate() {
            if (this.isActivated)
                return console.warn("已激活，无需再激活");
            this.unSubscribe = this.subscribe();
            this.isActivated = true;
        }
        deActivate() {
            if (this.unSubscribe) {
                this.unSubscribe();
            }
            this.isActivated = false;
        }
        subscribe() {
            throw new Error("not implemented");
        }
        request(_data) {
            throw new Error("not implemented");
        }
        /**
         * 获取请求的唯一标识
         * @param data
         * @returns
         */
        getRequestId(_data) {
            return this.options.autoGenerateRequestId ? uuid() : undefined;
        }
        getReqMsgType(data) {
            return data.method || data.type;
        }
        getResMsgType(data) {
            return data.method || data.type;
        }
        getResponseId(data) {
            return data.responseId;
        }
        getResScope(data) {
            return data.scope;
        }
        onResponse(_messageType, data) {
            return data;
        }
        invoke(data, reqOptions, ...args) {
            this.statistics.reqCount++;
            const { timeout = 5000, sendOnly = false, defaultRes = {
                message: "请求超时",
            }, } = reqOptions || {};
            const tout = timeout || this.options.timeout;
            const messageType = this.getMethod("getReqMsgType")(data);
            if (messageType == undefined) {
                return Promise.reject(new Error(`messageType is undefined`));
            }
            // 获得请求唯一ID
            if (!hasOwnProperty(data, "requestId")) {
                data.requestId = this.getMethod("getRequestId").apply(this, [data]);
            }
            const requestId = data.requestId;
            // 只发不收
            if (sendOnly) {
                this.getMethod("request")(data, requestId, ...args);
                return Promise.resolve(undefined);
            }
            return new Promise((resolve, reject) => {
                const { run, cancel } = delay(undefined, tout);
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
                    reject(Object.assign({ message: "请求超时" }, (defaultRes || {})));
                });
                this.store.add(messageType, {
                    requestId: requestId,
                    callback: (msg) => {
                        // 取消超时回调
                        cancel();
                        resolve(msg);
                    },
                    scope: data.scope,
                });
                // 调用
                this.getMethod("request")(data, ...args);
            });
        }
        invokeOnly(data, reqOptions, ...args) {
            return this.invoke(data, Object.assign(Object.assign({}, (reqOptions || {})), { sendOnly: true }), ...args);
        }
        onBuiltInResponse(messageType, data, options) {
            if (messageType == undefined) {
                return data;
            }
            // TODO:: 这里可能被串改数据
            this.events.emit(messageType, data, options);
            return data;
        }
        getStatistics() {
            return {
                total: this.statistics.reqCount,
                success: this.statistics.resCount,
                timeout: this.statistics.timeOutCount,
            };
        }
        clear() {
            this.store.clear();
            this.events.clear();
        }
    }

    const toString = Object.prototype.toString;
    function isType(obj, type) {
        return toString.call(obj) === `[object ${type}]`;
    }

    function isFunction(obj) {
        return typeof obj === "function" || isType(obj, "Function");
    }
    const AsyncFunctionConstructor = (function fn() {
        return __awaiter(this, void 0, void 0, function* () { });
    }).constructor;
    function isAsyncFunction(fn) {
        if (!isFunction(fn))
            return false;
        return fn.constructor === AsyncFunctionConstructor;
    }
    function isArrowFunction(fn) {
        if (!isFunction(fn))
            return false;
        // 箭头函数没有 prototype 属性，或者它不是对象类型
        if (fn.hasOwnProperty('prototype') && typeof fn.prototype === 'object') {
            return false;
        }
        // 检查函数定义字符串是否以括号开始，这是箭头函数的特点之一
        const fnString = fn.toString().trim();
        // 检查是否为箭头函数定义（以括号开始，但不是 function 关键字）
        return /^[(]/.test(fnString) && !/^function/.test(fnString);
    }
    function isNormalFunction(fn) {
        if (!isFunction(fn))
            return false;
        // 如果函数的构造器是普通的 Function 构造器，则继续检查
        if (fn.constructor === Function) {
            // 不是箭头函数
            if (isArrowFunction(fn)) {
                return false;
            }
            // 如果到达这里，则认为是普通函数
            return true;
        }
        // 对于其他已知的特殊类型的构造器，默认认为不是普通函数
        return false;
    }

    function listener(options = {}) {
        return function (target, context) {
            // target: method
            // context: demo {"kind":"method","name":"eat","static":false,"private":false,"access":{}}
            if (!(isNormalFunction(target) && isAsyncFunction(target))) {
                throw new Error("listener Decorator 只能用于装饰class的方法");
            }
            if (context.kind !== "method" || !!context.static) {
                throw new Error("listener Decorator 只能用于装饰class的实例方法");
            }
            if (context.private) {
                throw new Error(`listener Decorator 不能用于装饰class的private 方法: ${String(context.name)}`);
            }
            context.addInitializer(function () {
                const { type = target.name } = options;
                // this: class instance
                const classInstance = this;
                classInstance.addListener(type, target.bind(classInstance));
            });
        };
    }

    exports.BaseAsyncMessenger = BaseAsyncMessenger;
    exports.listener = listener;

}));
