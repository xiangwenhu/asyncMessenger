
## 现存在的问题
- [x] 区分addListener和异步invoke的回调函数
- [x] 属性键支持 number 和 Symbol
- [x] 装饰器，支持class (2025-02-26)
```typescript
// 初始化异步Messenger
const Messenger = new BaseAsyncMessenger({
    // logUnhandledEvent: false,
    subscribe(onMessage) {
        emitter.on("message", onMessage as any);
        return () => {
            emitter.off("message", onMessage as any);
        }
    },

    request(data: BaseReqData, key?: string) {
        emitter.emit("message-request", data);
    }

    /**
     * 监听被动的消息, type默认取方法名
     */
    @listener({type: "GetInit"})
    onGetInit(data: BaseResData){
        this.invoke({
            type: GetInit,
            data: {

            }
        })
    }
});
``` 
- [x] 支持ctx?，方便与外面搭建桥梁
    异步中心可以通过构造函的第二个参数传递ctx，也可以通过实例方法setContext设置，可以通过 getContext方法获取。    
    每个方法
- [x] 支持once
  无需实现，实现本身就是每次调用添加回调。
- [x] 支持scope，仅仅支持一个callback响应
- [ ] 支持scope的多个响应
- [ ] 重写统计，独立出来
- [ ] 分离callbacks的存储，支持ES5
