const ORDERED_LAYERS = ['U','R','F','D','L','B'] as const;

type Layer = typeof ORDERED_LAYERS[number];
type Face = `${Layer}${1|2|3|4|5|6|7|8|9}`;
type Move = `${Layer}x${1|2|3}`;
type Axis = 'x' | 'y' | 'z';
type Slot = [Layer,number]; 
type Pos3 = [x:number,y:number,z:number];
type Pos4 = [x:number,y:number,z:number,w:number];

const indexOfSlot = (slot: Slot, dim: number): number => 
    ORDERED_LAYERS.indexOf(slot[0]) * dim * dim + slot[1];

const indexToSlot = (index: number, dim: number): Slot => {
    const squareDim = dim * dim;
    const layer = ORDERED_LAYERS[Math.floor(index / squareDim)];
    const pos = index % squareDim;
    return [ layer, pos ] as Slot;
}

const COLOR_OF_LAYER: Record<Layer, number> = {
    U: 0xffffff,    // white
    R: 0xb90000,    // red
    F: 0x009b48,    // green
    D: 0xffd500,    // yellow
    L: 0xff5900,    // orange
    B: 0x0045ad,    // blue
} as const;

const COLOR_TO_LAYER = Object.fromEntries(
    Object.entries(COLOR_OF_LAYER).map(([layer, color]) => [color, layer])
) as Record<number, Layer>;

type MoveHint = {
    axis: Axis, 
    ori: number, // -1 clockwise (-Math.PI/2); +1 counter-clockwise (+Math.PI/2)
    indices: number[];      
}

/* extended layers: for dim=3 only */

const LAYERS_EXT = [...ORDERED_LAYERS, 'u','r','f','d','l','b','M','E','S','X','Y','Z'] as const;
type LayerExt = typeof LAYERS_EXT[number];
type MoveExt = `${LayerExt}x${1|2|3}`;
const isLayerExt = ( () => {
    const s = new Set(LAYERS_EXT);
    return (l:string):l is LayerExt => s.has(l as LayerExt);
})();

const LayerHintMap_: Record<LayerExt, MoveHint> = {
    // layer turn
    'R': { axis: 'x', ori: -1, indices: [2] },
    'U': { axis: 'y', ori: -1, indices: [2] },
    'F': { axis: 'z', ori: -1, indices: [2] },
    'L': { axis: 'x', ori: +1, indices: [0] },
    'D': { axis: 'y', ori: +1, indices: [0] },
    'B': { axis: 'z', ori: +1, indices: [0] },
    // slice turn
    'M': { axis: 'x', ori: +1, indices: [1] },
    'E': { axis: 'y', ori: +1, indices: [1] },
    'S': { axis: 'z', ori: -1, indices: [1] },
    // double-layer turn
    'r': { axis: 'x', ori: -1, indices: [1,2] },
    'u': { axis: 'y', ori: -1, indices: [1,2] },
    'f': { axis: 'z', ori: -1, indices: [1,2] },
    'l': { axis: 'x', ori: +1, indices: [0,1] },
    'd': { axis: 'y', ori: +1, indices: [0,1] },
    'b': { axis: 'z', ori: +1, indices: [0,1] },
    // the whole cube turn around X, Y, Z
    'X': { axis: 'x', ori: -1, indices: [0,1,2] },
    'Y': { axis: 'y', ori: -1, indices: [0,1,2] },
    'Z': { axis: 'z', ori: -1, indices: [0,1,2] }
};

const MoveHintMap = (() => {
    const M = {} as Record<MoveExt, MoveHint>;
    for(const [k,v] of Object.entries(LayerHintMap_)) {
        M[`${k}x1` as MoveExt] = { ...v };
        M[`${k}x2` as MoveExt] = { ...v, ori: 2*v.ori };
        M[`${k}x3` as MoveExt] = { ...v, ori: -v.ori };     
    }
    return Object.freeze(M);
})();

export { ORDERED_LAYERS, COLOR_OF_LAYER, COLOR_TO_LAYER, MoveHintMap, isLayerExt, indexOfSlot, indexToSlot };
export type { Face, Layer, Axis, Slot, Pos3, Pos4, MoveExt, MoveHint };