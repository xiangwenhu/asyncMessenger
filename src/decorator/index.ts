import PEventMessenger from "../PEventMessenger";
import { ListenerOptions } from "../types";
import { isAsyncFunction, isNormalFunction } from "../utils/function";

interface Options {
    type?: string;
    scope?: string;
    context?: any
}

interface Messenger {
    addListener: Function;
    events: PEventMessenger
}

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

            const listenerOptions: ListenerOptions = {
                scope: options.scope,
                context: ('context' in options) ? options.context : classInstance
            };

            if (classInstance.events.has(type, {
                scope: options.scope
            })) {
                return console.warn(`${target?.name} 已添加装饰listener, 无需重复添加`);
            }

            classInstance.addListener(type, target, listenerOptions);
        });
    };
}
