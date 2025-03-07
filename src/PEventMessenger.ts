import DataStore from "./DataStore";
import { ListenerOptions, MessageType, ReqInfo } from "./types";

export interface IPEventMessenger<T = MessageType> {
    on<D = any>(type: T, fun: (data: D) => any, options?: ListenerOptions): any;
    off<D = any>(
        type: T,
        fun: (data: D) => any,
        options?: ListenerOptions
    ): any;
    emit<D = any>(type: T, data: D, options?: ListenerOptions): any;
    has(type: T, options?: ListenerOptions): boolean;
}

interface PReqInfo extends ReqInfo {
    context?: any;
}

export default class PEventMessenger implements IPEventMessenger {
    private store = new DataStore<PReqInfo>();
    /**
     * 可以处理多种类型的事件
     * @param type
     * @returns
     */
    on = <D = any, RD = any>(
        type: MessageType,
        listener: (data: D) => RD,
        options: ListenerOptions = {}
    ) => {
        if (typeof listener !== "function") {
            return console.error(`PEventMessenger::on: fn 必须是一个函数`);
        }
        this.store.add(type, {
            callback: listener,
            scope: options.scope,
            context: options.context
        });
    };

    off = (
        type: MessageType,
        listener: Function,
        options: ListenerOptions = {}
    ) => {
        this.store.remove(type, {
            scope: options.scope,
            callback: listener,
        });
    };

    has(type: MessageType, options: ListenerOptions = {}) {
        return this.store.has(type, options);
    }

    emit = <D = any>(
        type: MessageType,
        data: D,
        options: ListenerOptions = {}
    ) => {
        const infos = this.store.get(type, options);
        if (!Array.isArray(infos) || infos.length === 0) {
            return;
        }

        const bInfos = [...infos];
        bInfos.forEach((info) => {
            info.callback.call(info.context, data);
        });
    };

    clear() {
        this.store.clear();
    }
}
