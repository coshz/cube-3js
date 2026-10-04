// type TupleType = readonly [] | readonly [unknown,...unknown[]];
// type TupleListType = readonly TupleType[];

// T[][] => never
// [] => [][]
// T | T[] => [T][]
// [T1,...,Tn] => [T1|...|Tn][]
// [T1,...,Tn][] => [T1,...,Tn][]
type MakeTupleListType<T> = T extends readonly any[]
    ? T extends readonly [] 
        ? [[]]
        : T[number] extends readonly any[] 
            ? T 
            : [T[number]][]
    : [T][];

// [T1,...,Tn][] * [S1,...,Sm][] => [T1,...,Tn,S1,...,Sm][]
type ConcatTwoTupleListType<A,B> = 
    MakeTupleListType<A> extends (infer EA extends readonly any[])[] 
        ? MakeTupleListType<B> extends (infer EB extends readonly any[])[]
            ? [...EA,...EB][]
            : never
        : never;

// map types with MakeTupleListType and then 
// reduce them with ConcatTwoTupleListType
type ConcatTupleListType<List extends readonly any[]> = 
    List extends readonly [infer Only]
        ? MakeTupleListType<Only>
        : List extends readonly [infer First,...infer Rest]
            ? ConcatTwoTupleListType<First,ConcatTupleListType<Rest>>
            : [[]];

type ConcatTupleTypeImpl<
    Row extends readonly any [],
    N extends number, 
    Acc extends readonly any[] = [],
    Counter extends readonly any[] = []
> = number extends N
    ? Row[number][]
    : Counter['length'] extends N 
        ? Acc
        : ConcatTupleTypeImpl<Row,N,[...Row,...Acc],[...Counter,0]>;

type ConcatTupleTypeWithDim<T,N extends number> = 
    MakeTupleListType<T> extends (infer Row extends readonly any[])[]
        ? ConcatTupleTypeImpl<Row,N>[]
        : never;

const normalize_impl = (val: any): any[][] => {
    if(!Array.isArray(val)) return [[val]];
    if(val.length === 0) return [[]];
    return val.map(item => Array.isArray(item) ? item : [item]);
};

const cartesianConcat = <T extends any[]>(...arrays: T): ConcatTupleListType<T> => 
    arrays.reduce(
        (acc: any[][], curr: any) => 
            acc.flatMap(x => normalize_impl(curr).map(y => x.concat(y))),
        [[]]
    ) as any;

const cartesianConcatPower = <N extends number>(n: N) => 
    <T>(array: T): ConcatTupleTypeWithDim<T,N> => n <= 0 
        ? [[]] as any
        : cartesianConcat(...Array(n).fill(array)) as any;

type RangeTypeFromZero<N extends number, Acc extends number[] = []> = 
    Acc['length'] extends N
        ? Acc
        : RangeTypeFromZero<N, [...Acc,Acc['length']]>;

type DropHeads<T extends any[], N extends number, Acc extends any[] = []> = 
    Acc['length'] extends N 
    ? T 
    : T extends readonly [any,...infer Rest]
        ? DropHeads<Rest,N,[...Acc,0]>
        : [];

type RangeType<Start extends number, End extends number> =
    number extends Start | End 
    ? number[]
    : DropHeads<RangeTypeFromZero<End>,Start>;

function numRange<E extends number>(end: E): RangeType<0,E>;
function numRange<S extends number, E extends number>(start: S, end: E): RangeType<S,E>;
function numRange(startOrEnd: number, endOrUndef?: number): any {
    const start = endOrUndef === undefined ? 0 : startOrEnd;
    const end = endOrUndef === undefined ? startOrEnd : endOrUndef;
    const result: number[] = [];
    for(let i = start; i < end; i++) { result.push(i); }
    return result as any;
};

export type { ConcatTupleListType, ConcatTupleTypeWithDim, RangeType };
export { cartesianConcat, cartesianConcatPower, numRange };