import { isAsyncFunction } from "util/types";
import { isNormalFunction } from "../utils/function";
import { hasOwnProperty } from "../utils";
import { ListenerOptions } from "src/types";

interface Options {
    type?: string;
    scope?: string;
    context?: any
}

interface Messenger {
    addListener: Function;
}

const SymbolHasProxyMethod = Symbol("HasProxyMethod")

export function listener(options: Options = {}) {
    return function (
        target: Function,
        context: ClassMethodDecoratorContext<any>
    ) {
        // target: method
        // context: demo {"kind":"method","name":"eat","static":false,"private":false,"access":{}}

        if (!isNormalFunction(target) && !isAsyncFunction(target)) {
            throw new Error("listener Decorator 只能用于装饰class的普通方法和异步方法");
        }

        if (context.kind !== "method" || !!context.static) {
            throw new Error("listener Decorator 只能用于装饰class的实例方法");
        }
        if (context.private) {
            throw new Error(
                `listener Decorator 不能用于装饰class的private 方法: ${String(
                    context.name
                )}`
            );
        }
        context.addInitializer(function () {
            const { type = target.name } = options;
            // this: class instance
            const classInstance: Messenger = this;
            if (hasOwnProperty(target, SymbolHasProxyMethod)) {
                return console.warn(`${target?.name} 已添加装饰listener, 无需重复添加`);
            }
            // 
            Object.defineProperty(target, SymbolHasProxyMethod, {
                value: true,
                enumerable: false
            })


            const listenerOptions: ListenerOptions = {
                scope: options.scope,
                context: ('context' in options) ? options.context : classInstance
            };

            classInstance.addListener(type, target, listenerOptions);
        });
    };
}
