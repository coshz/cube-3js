type Constructor = { new(...args: any[]): {} };

type DimMixin<D extends number> = {
    dim: D;
    initWithDim?(this: { dim: D }): void
}

type DimStatic<D extends number> = Constructor & DimMixin<D>;

/**
 * @desc A class factory to embed dimension
 */
function WithDim<
    D extends number, 
    Base extends DimStatic<number>
>(BaseClass: Base, d: D) {
    class cls extends BaseClass {
        static override readonly dim: D = d;
        static override initWithDim() { super.initWithDim?.call(this); }
    }
    cls.initWithDim();
    return cls as Base & DimMixin<D>;
}

const withDimCache = new WeakMap<Function, Map<number,any>>();

/**
 * @desc Cache enabled `WithDim` 
 */
function WithDimCached<
    D extends number, 
    Base extends DimStatic<number>
>(BaseClass: Base, d: D): Base & DimMixin<D> {
    let cache = withDimCache.get(BaseClass);
    if(!cache) {
        cache = new Map<number, any>();
        withDimCache.set(BaseClass, cache);
    }
    if(cache.has(d)) return cache.get(d)!;
    class cls extends BaseClass {
        static override readonly dim: D = d;
        static override initWithDim() { super.initWithDim?.call(this); }
    }
    cls.initWithDim();
    cache.set(d, cls);
    return cls;
}

export { WithDim, WithDimCached };