import { ReqOptions } from "src";
import { BaseReqData, MessageType, ReqInfo } from "./types";
import { getValidStringProperty, isSameValue } from "./utils/index";

type FindOptions = Partial<Pick<ReqInfo, "scope" | "requestId">>;

export default class DataStore<T extends ReqInfo<BaseReqData, ReqOptions>> {
    private map = new Map<MessageType, T[]>();

    add(type: MessageType, reqInfo: T) {
        const infos = this.map.get(type);
        if (!infos) {
            this.map.set(type, []);
        }

        this.map.get(type)!.push({
            ...reqInfo,
            requestTime: Date.now(),
        } as T);
    }

    remove(type: MessageType, reqInfo: Partial<T>) {
        const infos = this.map.get(type);
        if (!infos || infos.length === 0) {
            return undefined;
        }

        const index = infos.findIndex((info) => {
            // TODO:: 有沒有必要严格比较每个字段
            return (
                info === reqInfo ||
                (info.callback === reqInfo.callback &&
                    info.scope === reqInfo.scope &&
                    info.callback === reqInfo.callback)
            );
        });

        if (index >= 0) {
            infos.splice(index, 1);
            this.removeTypeIfNoReqInfos(type);
        }
    }

    private removeTypeIfNoReqInfos(type: MessageType) {
        const infos = this.getByType(type);
        if (!Array.isArray(infos)) return;
        if (infos.length === 0) this.removeByType(type);
    }

    removeOneByOptions(type: MessageType, options: FindOptions = {}) {
        const infos = this.get(type, options);
        if (!infos) return;
        this.remove(type, infos[0]);
    }

    removeByType(type: MessageType) {
        this.map.delete(type);
    }

    getByType(type: MessageType) {
        return this.map.get(type);
    }

    get(messageType: MessageType, options: FindOptions = {}) {
        const { requestId, scope } = options;

        let reqInfos = this.map.get(messageType);
        if (!reqInfos || reqInfos.length === 0) {
            return undefined;
        }

        // 过滤scope
        reqInfos = reqInfos.filter((c) => isSameValue(c.scope, scope));

        // 过滤 requestId
        reqInfos = reqInfos.filter((c) => isSameValue(c.requestId, requestId));

        return reqInfos;
    }

    getOne(messageType: MessageType, options: FindOptions = {}) {
        const infos = this.get(messageType, options);
        return infos ? infos[0] : undefined;
    }

    has(messageType: MessageType, options: FindOptions = {}) {
        const result = this.get(messageType, options);
        return !!result && result.length > 0
    }

    hasType(messageType: MessageType) {
        return this.map.has(messageType);
    }

    clear() {
        this.map.clear();
    }
}
