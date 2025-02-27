import { isAsyncFunction } from "util/types";
import { isNormalFunction } from "../utils/function";

interface Options {
    type?: string;
}

interface Messenger {
    addListener: Function;
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
            classInstance.addListener(type, target.bind(classInstance));
        });
    };
}
