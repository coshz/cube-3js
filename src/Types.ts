import { cartesianConcat, cartesianConcatPower, numRange } from "./helpers";
import { ORDERED_LAYERS, MoveHint, Axis, Layer, Slot, Pos3, Pos4, indexOfSlot, indexToSlot, MoveExt } from './Defs';
import * as THREE from 'three';

type StickerId = `${Layer}${number}`;
type StickerType = THREE.Mesh & { userData: { id: StickerId, layer: Layer } };

/**
 * @desc Abstract class for N-cube's layout
 */
abstract class AbstractCubeLayout {
    /**
    @desc the isomorphic mapping from Pos4 to Slot
    @details 
     (* Note: We adopt stickers of 1-based index in the following comments 
              and 0-based in the actual code  *)

     A. Diagram: the ordering in each layer (taking dim=3 as an example)
           (* Y = 1 *)
             U1 U2 U3   (* Z = 1 *)
             U4 U5 U6  /
             U7 U8 U9 /
    L1 L2 L3 F1 F2 F3 R1 R2 R3 B1 B2 B3             
    L4 L5 L6 F4 F5 F6 R4 R5 R6 B4 B5 B6 
    L7 L8 L9 F7 F8 F9 R7 R8 R9 B7 B8 B9
             D1 D2 D3  (* X = 1 *)
             D4 D5 D6
             D7 D8 D9 

     B. Slots mapping:
        R9 -z -3y   L7 +z -3y
        U1 +x +3z   D7 +x -3z
        F7 +x -3y   B9 -x -3y
    */
    protected static pos4ToSlotHelper(pos: Pos4, dim: number): Slot | null {
        const [x,y,z,w] = pos;
        if(w === 0 && x === dim-1)  return [ 'R', -z -dim*y +dim*dim-1  ];
        if(w === 1 && x === 0)      return [ 'L', +z -dim*y +dim*(dim-1)];
        if(w === 2 && y === dim-1)  return [ 'U', +x +dim*z +0          ];
        if(w === 3 && y === 0)      return [ 'D', +x -dim*z +dim*(dim-1)];
        if(w === 4 && z === dim-1)  return [ 'F', +x -dim*y +dim*(dim-1)];
        if(w === 5 && z === 0)      return [ 'B', -x -dim*y +dim*dim-1  ];
        return null;
    }

    /**
     * @desc inverse of `pos4ToSlotHelper` 
     */
    protected static slotToPos4Helper(slot: Slot, dim: number): Pos4 | null {
        const [layer, idx] = slot;
        if(idx < 0 || idx >= dim * dim) return null;
        const row = Math.floor(idx / dim);
        const col = idx % dim;
        switch(layer) {
            case 'R': {
                const rem = dim * dim - 1 - idx;
                const [y,z] = [ Math.floor(rem / dim), rem % dim ];
                return [ dim - 1, y, z, 0 ];
            }
            case 'L': {
                const [y,z] = [ dim - 1 - row, col ];
                return [0, y, z, 1];
            }
            case 'U': {
                const [x,z] = [ col, row ];
                return [x, dim - 1, z, 2];
            }
            case 'D': {
                const [x,z] = [ col, dim - 1 - row ];
                return [x, 0, z, 3];
            }
            case 'F': {
                const [x,y] = [ col, dim - 1 - row ];
                return [x, y, dim - 1, 4];
            }
            case 'B': {
                const rem = dim * dim - 1 - idx;
                const [x,y] = [ Math.floor(rem / dim), rem % dim ];
                return [x, y, 0, 5];
            }
            default: return null;
        }
    }

    /* Obtain all Pos3 locates surface of the cube */
    public static allCubiesHelper(dim: number): Pos3[] {
        return cartesianConcatPower(3)(numRange(dim)).filter(
            pos => AbstractCubeLayout.hasSlotsHelper(pos as Pos3, dim)
        ) as Pos3[];
    }

    public static allSlotsHelper(dim: number): Slot[] {
        return cartesianConcat(ORDERED_LAYERS, numRange(dim*dim));
    }

    /** 
     * @desc Obtain all Pos3 involved in a slice 
     * @param axis  x | y | z
     * @param index 0 <= index < dim
     * @return a collection of Pos3 that make up a slice (axis, index)
     */
    public static sliceCubiesHelper(axis: Axis, index: number, dim: number): Pos3[] {
        return this.allCubiesHelper(dim).filter( pos => this.isInSlice(pos, axis, index) );
    }

    /* check if a pos is in a slice */
    public static isInSlice(pos: Pos3 | Pos4, axis: Axis, index: number): boolean {
        return pos.slice(0,3)["xyz".indexOf(axis)] === index;
    }

    /* check if a pos has slots (false if pos3 locates inside the cube) */
    protected static hasSlotsHelper(pos: Pos3 | Pos4, dim: number): boolean {
        return pos.slice(0,3).some( val => val === 0 || val === dim-1 );
    }
}

/**
 * @desc Abstract class for N-cube's threejs-based view
 * 
 * @remark
 *  StickerId vs Slot 
 *  - Slot is the actual location of a (Object3D) sticker;
 *  - StickerId is the (immutable) identifier of a sticker;
 *  - a sticker's StickerId is dervied by its inital Slot (`${Slot[0]}${Slot[1]}`)
 */
abstract class AbstractCubeView extends THREE.Object3D {
    abstract getDim(): number

    public static L: typeof AbstractCubeLayout;

    // cubie: the actomic unit for rotation
    protected cubies_ = [] as THREE.Group[]; 

    // sticker: for coloring & raycast 
    protected stickers_ = new Map<StickerId, StickerType>();

    get stickerIds(): Iterable<StickerId> { return this.stickers_.keys(); }
    
    protected requireSticker(id: StickerId): StickerType {
        const sticker = this.stickers_.get(id); 
        if(!sticker) throw new Error(`sticker ${id} not found`);
        return sticker;
    }

    private static readonly STICKER_TAG = Symbol('sticker');

    /**
     * @brief Attach with metadata for convenience
     *  - id, type: immutable, fixed at creation;
     *  - layer: mutable, used for color editing / rendering.
     */
    protected decorateStickerMesh(sticker:THREE.Mesh, slot:Slot): StickerType {
        sticker.userData.id = `${slot[0]}${slot[1]}`;
        sticker.userData.layer = slot[0];
        sticker.userData.type = AbstractCubeView.STICKER_TAG; 
        return sticker as StickerType;
    }

    protected isStickerMesh(child: THREE.Object3D): child is StickerType {
        return child.userData.type === AbstractCubeView.STICKER_TAG; 
    }

    // external hook to cube updating (eg. notify renderer to redraw)
    public onCubeUpdate?: () => void;

    private dirty_: boolean = false;

    protected markDirty(): void { this.dirty_ = true; }

    // caller should call this method to notify cube update
    public flush(): void {
        if(!this.dirty_) return;
        this.dirty_ = false;
        this.onCubeUpdate?.();
    }

    /// :- @final methods and their overridable impl

    // the size of the cube in world space (default: L.dim)
    public setSize(size: number): AbstractCubeView { 
        this.setSizeImpl(size); 
        this.markDirty();
        return this;
    }

    public abstract setSizeImpl(size: number): AbstractCubeView;

    // reset cube to initial state
    public reset(): AbstractCubeView { 
        this.resetImpl(); 
        this.markDirty();
        return this;
    }

    public abstract resetImpl(): void;

    public setLayerOfSticker(id: StickerId, layer: Layer): void {
        const sticker = this.requireSticker(id);
        sticker.userData.layer = layer;
        this.onStickerLayerChanged(id, layer);
        this.markDirty();
    }

    public getLayerOfSticker(id: StickerId): Layer {
        const sticker = this.requireSticker(id);
        return sticker.userData.layer;
    }

    protected abstract onStickerLayerChanged(id: StickerId, layer: Layer): void;

    /* Snap cubies to grid, used for layer rotation */ 
    public gridSnap(cubies?: THREE.Group[]): void {
        if(!cubies) cubies = this.cubies_;
        cubies.forEach( cubie => {
            cubie.position.round();
            cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI/2)) * (Math.PI/2);
            cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI/2)) * (Math.PI/2);    
            cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI/2)) * (Math.PI/2);
        });
    }

    /* frame rotation, used for arcball rotation */
    rotateFrame(q: THREE.Quaternion) {
        this.applyQuaternion(q);
        this.markDirty();
    }

    /// :- Overriden methods

    override raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
        for(const sticker of this.stickers_.values()) {
            sticker.raycast(raycaster,intersects);
        }
        intersects.sort((a, b) => a.distance - b.distance);
    }

    /// :- Helper methods

    // obtain the index-based position (x,y,z) of a cubie
    public abstract posOfCubie(cubie:THREE.Object3D): Pos3;

    // evaluate the slot of a given sticker
    public abstract slotOfSticker(stickerId: StickerId): Slot;

    // obtain the pos4 of a given sticker
    public abstract pos4OfSticker(stickerId: StickerId): Pos4;
    
    /* the group of cubies that make up a slice */
    public abstract pivotFromSlice(axis: Axis, index: number): THREE.Group[];

    /// :- Helper static methods

    /* Convert layer index to axis coordinate ( 0 <= index <= dim - 1 ) */
    protected static indexToCoord(index: number, dim: number) {
        // linear map from [0,dim) to (-U,+U); `2` is chosen to preserve integer 
        return 2 * index + 1 - dim
    };
    
    /* inverse function of `indexToCoord` */
    protected static coordToIndex(coord: number, dim: number) {
        return Math.round((coord + dim - 1) / 2);
    }
}

/**
 * @desc Abstract panel class 
 */
abstract class AbstractPanel {
    protected element: HTMLElement;
    protected controller: ICubeController;
    
    protected onDismiss: () => void;

    constructor(controller: ICubeController, onDissmiss: () => void) {
        this.controller = controller;
        this.onDismiss = onDissmiss;
        this.element = document.createElement('div');
        this.element.className = 'cube-panel';
    }

    public getElement(): HTMLElement { return this.element; }

    public init(): this { 
        this.setupDOM(); 
        return this; 
    }

    public deinit() { this.destroy(); }
    
    protected abstract setupDOM(): void; 

    protected abstract destroy(): void;
}

type EventMethod = 'onKeyDown' | 'onKeyUp' | 'onMouseDown' | 'onMouseMove' | 'onMouseUp';

type InteractionMode = 'Edit' | 'View';

class InteractionState {
    private mode_: InteractionMode = 'View';
    private activeColor_: Layer = 'U';

    get mode() { return this.mode_; }

    get activeColor() { return this.activeColor_; }
    set activeColor(layer: Layer) { this.activeColor_ = layer; }

    enterEdit = () => { this.mode_ = 'Edit'; }
    exitEdit  = () => { this.mode_ = 'View'; }
}

/**
 * @desc Base class for interactions on cube
 * 
 * @remark
 *  The base class does bindings (constructor) & unbindings (dispose) only; 
 *  the derived classes can override the event handlers if needed. 
 *  Handlers forward cube commands through the global command bus. 
 */
class AbstractInteraction {
    protected onKeyDown?(event: KeyboardEvent): void;
    protected onKeyUp?(event: KeyboardEvent): void;
    protected onMouseDown?(event: MouseEvent): void;
    protected onMouseMove?(event: MouseEvent): void;
    protected onMouseUp?(event: MouseEvent): void;

    private handlers: Array<[string,EventListener]> = [];

    constructor(
        private target: EventTarget
    ) {
        queueMicrotask(() => this.init());
    }

    private init() {
        const eventMap: Array<[string, EventMethod]> = [
            ['keydown', 'onKeyDown'],
            ['keyup', 'onKeyUp'],
            ['mousedown', 'onMouseDown'],
            ['mousemove', 'onMouseMove'],
            ['mouseup', 'onMouseUp'],
        ];

        for(const [eventName, methodName] of eventMap) {
            const method = this[methodName];
            const baseMethod = AbstractInteraction.prototype[methodName];
            if(typeof method === 'function' && method !== baseMethod) {
                const handler = method.bind(this) as EventListener;
                this.target.addEventListener(eventName, handler);
                this.handlers.push([eventName, handler]);
            }
        }
    }

    protected dispose() {
        for(const [eventName, handler] of this.handlers) {
            this.target.removeEventListener(eventName, handler);
        }
        this.handlers = [];
    }
}

/**
 * @desc animator interface for cube rotation
 */
interface IAnimator {
    readonly cube: AbstractCubeView;

    /**
     * @desc 
     *  The layer is expected to rotate by axis of x,y,z and angle of 
     *  multipliers of 90 degrees.
     * @param 
     *  - axis: rotation axis
     *  - clockwise: rotation angle is PI/2 if clockwise is false
     *  - indices: indices of layers in the direction of axis to rotate
     * @returns 
     *  a promise that resolves when the animation is complete
     * @note 
     *  the local frame is fixed in world space.
     */
    rotateLayer(axis:'x'|'y'|'z', indices:number[], clockwise: boolean): Promise<void>;

    /**
     * @desc 
     *  The cube is expected to rotate by any axis and any angle.
     * @param 
     *  - axis: rotation axis 
     *  - angle: rotation angle
     * @returns
     *  a promise that resolves when the rotation animation is completed
     * @note 
     *  the local frame rotates with the cube. 
     */
    rotateCube(axis: THREE.Vector3, angle: number): Promise<void>;
    rotateCube(axis_angle:[number,number,number,number]): Promise<void>;

    /**
     * @desc make the cube align XYZ again as does initially
     * @returns 
     *  a promise that resolves when the animation is complete
     */
    rotateCubeToDefault(): Promise<void>;
}

/**
 * @brief An interface for cube color editing
 */
interface ICubeEditor {
    /* paint a sticker */
    paintSticker(id: StickerId, color: Layer): void;

    /* paint a face with a sticker's color */
    paintFace(id: StickerId): void;

    /** 
     * Finalize the edit session.
     * 
     * Runs `validator` (if provided) over the current color config. 
     * On failure, calls {@link cancel} and return `false`.
     * On success, marks the session as committed and return `true`.
     * No-op if the session is already committed.
     * 
     * @return Whether the session ends up committed.
     */
    commit(validator?: (color: string) => boolean): boolean;

    /* rollback all paintings */
    cancel(): void;
}

/**
 * Projector between screen and cube view. 
 */
interface ICubeProjector {
    /* obtain the hit sticker through a raycaster from a screen position */
    raycastToSticker(screenX: number, screenY: number): StickerId | null;

    /* obtain the pos4 of hit sticker through a raycaster from a screen position */
    raycastToStickerPos(screenX: number, screenY: number): Pos4 | null;

    /* promote a screen position to cube arcball unit */
    promoteToArcball(screenX: number, screenY: number): THREE.Vector3;

    /* project a point or vector of cube-space to screen-space */
    projectToScreen(pointOrVector: THREE.Vector3, isVector?: boolean): THREE.Vector2;
}

interface IStickerAccessor {
    getLayerOfSticker(id: StickerId): Layer;
    setLayerOfSticker(id: StickerId, layer: Layer): void;

    currentSlotOfSticker(id: StickerId): Slot;

    allStickerIds(): Iterable<StickerId>;

    transaction<T>(fn: (tx: IStickerAccessor) => T): T;
}

interface ICubeController extends IStickerAccessor {
    getDim(): number;
    /// -: Geometry Operations on CubeView

    /* apply moves to the cube */
    applyMove(move: MoveHint | MoveExt[] | string): void;

    /* reset the cube */
    resetCube():void;
    
    /* reset the cube frame to default quaternion */
    resetCubeFrame(): void;

    /* continuous arcball rotation */
    arcballRotate(src: THREE.Vector3, tgt: THREE.Vector3):void;

    getColorConfig(): string;
    setColorConfig(colors: string): void;
}

class CubeCodec {
    static export(cube: IStickerAccessor): Layer[] {
        const allIds = [...cube.allStickerIds()];
        const len = allIds.length;
        const dim = Math.sqrt(len / 6);
        let colors: Layer[] = new Array(len);
        for(const id of allIds) {
            const idx = indexOfSlot(cube.currentSlotOfSticker(id), dim);
            colors[idx] = cube.getLayerOfSticker(id);
        }
        return colors;
    }
    
    static import(cube: IStickerAccessor, colors: Layer[]): void {
        const dim = Math.sqrt(colors.length / 6);
        if(dim * dim * 6 !== colors.length) throw new Error("colors: mismatch length");
        for(const id of cube.allStickerIds()) {
            const idx = indexOfSlot(cube.currentSlotOfSticker(id), dim);
            cube.setLayerOfSticker(id, colors[idx]);
        }
    }

    static exportString(cube: IStickerAccessor): string {
        return CubeCodec.export(cube).join("");
    }

    static importString(cube: IStickerAccessor, colors: string): void {
        CubeCodec.import(cube, colors.split("") as Layer[]);
    }
}

class AxisHelper {
    /* directions of axes */
    private static readonly axisDirections = Object.freeze([
        [+1,0,0], // +X
        [-1,0,0], // -X
        [0,+1,0], // +Y
        [0,-1,0], // -Y
        [0,0,+1], // +Z
        [0,0,-1], // -Z
    ]);

    private static readonly axisVectors = Object.freeze(
        AxisHelper.axisDirections.map( v => new THREE.Vector3(...v) )
    );

    public static indexOf(axis: THREE.Vector3):number {
        const normalized = axis.clone().normalize();
        for(const w of [0,1,2,3,4,5]) {
            if(normalized.equals(AxisHelper.axisVectors[w])) { return w; }
        }
        throw new Error("invalid axis vector");
    }

    public static vectorOf(axis: Axis | number): THREE.Vector3 {
        const idx = typeof axis === "string" ? "xyz".indexOf(axis) * 2: axis;
        return AxisHelper.axisVectors[idx];
    }
}

export type { ICubeController, IAnimator, ICubeProjector, ICubeEditor, IStickerAccessor, StickerId, StickerType };
export { AbstractCubeLayout, AbstractCubeView, AbstractInteraction, AbstractPanel, InteractionMode, InteractionState, CubeCodec, AxisHelper };