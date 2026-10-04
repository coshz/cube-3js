import * as THREE from 'three';
import { COLOR_OF_LAYER, Pos3, Pos4, Slot, Axis, Layer } from '../Defs';
import { AxisHelper, AbstractCubeView, StickerId, StickerType } from '../Types';
import { makeCubeLayout } from './CubeLayout';
import { WithDimCached } from '../helpers';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


class CubeView extends AbstractCubeView {
    /* DimMixin required */
    static dim: number;
    static initWithDim() {
        this.L = makeCubeLayout(this.dim);
    }

    getDim() { return this.ctor.dim; }

    public static L: ReturnType<typeof makeCubeLayout<any>>;

    // used to access static data in non-static method
    protected ctor = this.constructor as typeof CubeView;

    // initial states: used to reset states
    protected initialStates = new Map<THREE.Object3D, {
        position: THREE.Vector3;
        quaternion: THREE.Quaternion;
    }>();

    // shared Geometries & materials
    private cubieGeo?: THREE.BufferGeometry;
    private stickerGeo?: THREE.BufferGeometry;
    private cubieMat?: THREE.Material;
    private layerMaterials!: Record<Layer, THREE.Material>;

    // sticker (PlaneGeometry)'s default direction
    private static readonly DEFAULT_DIR_= new THREE.Vector3(0,0,1);

    // ! the coeff_ should be consistent with the multi-coefficient in AbstractCubeView.indexToCoord
    static readonly coeff_ = 2 as const;
    static readonly CONST = {
        CUBIE_SIZE: CubeView.coeff_,
        STICKER_SIZE: 0.9*CubeView.coeff_,
        STICKER_OFFSET: CubeView.coeff_/2+0.001
    } as const;

    constructor(size: number = 1){ super(); this.setSize(size); this.init(); }

    public init() {
        const [csize, ssize] = [CubeView.CONST.CUBIE_SIZE, CubeView.CONST.STICKER_SIZE];
        this.cubieGeo = new RoundedBoxGeometry(csize, csize, csize, 3, 0.1);
        this.stickerGeo = new THREE.PlaneGeometry(ssize, ssize);
        this.cubieMat = new THREE.MeshLambertMaterial({ color: 0x050505 });
        this.layerMaterials = {
            U: new THREE.MeshLambertMaterial({ color: COLOR_OF_LAYER.U }),
            R: new THREE.MeshLambertMaterial({ color: COLOR_OF_LAYER.R }),
            F: new THREE.MeshLambertMaterial({ color: COLOR_OF_LAYER.F }),
            D: new THREE.MeshLambertMaterial({ color: COLOR_OF_LAYER.D }),
            L: new THREE.MeshLambertMaterial({ color: COLOR_OF_LAYER.L }),
            B: new THREE.MeshLambertMaterial({ color: COLOR_OF_LAYER.B }),
        };

        // create cubies
        for(const [x,y,z] of this.ctor.L.allCubies()) {
            const cubie = this.createCubie([x,y,z]);
            this.cubies_.push(cubie);
            this.add(cubie);
        }  

        // aggregate stickers
        for(const cubie of this.cubies_) {
            for(const child of cubie.children) {
                if(this.isStickerMesh(child)) {
                    this.stickers_.set(child.userData.id, child);
                }
            }
        }

        // cache initial states
        for(const cubie of this.cubies_) {
            this.initialStates.set(cubie, {
                position: cubie.position.clone(),
                quaternion: cubie.quaternion.clone(),
            });
        }
    }

    public dispose() {
        this.cubieGeo?.dispose();
        this.stickerGeo?.dispose();
        this.cubieMat?.dispose();
        if(this.layerMaterials) {
            Object.values(this.layerMaterials).forEach(mat => mat.dispose());
        }
        this.cubies_.length = 0;
        this.stickers_.clear();
        this.initialStates.clear();
    }

    /// :- abstract methods impl

    override setSizeImpl(size: number): AbstractCubeView {
        this.scale.setScalar(size / 2 / this.ctor.dim);
        return this;
    }

    override resetImpl() {
        this.quaternion.set(0,0,0,1);
        this.updateMatrixWorld();
        for(const cubie of this.cubies_) {
            const state = this.initialStates.get(cubie)!;
            cubie.position.copy(state.position);
            cubie.quaternion.copy(state.quaternion);
        }
        for(const [id,sticker] of this.stickers_) {
            const initLayer = id[0] as Layer;
            sticker.userData.layer = initLayer;
            sticker.material = this.layerMaterials[initLayer];
        }
    }

    override onStickerLayerChanged(id: StickerId, layer: Layer) {
        const sticker = this.requireSticker(id);
        sticker.material = this.layerMaterials[layer];
    }

    /// :- Helper methods impl 

    override posOfCubie(cubie:THREE.Object3D): Pos3 
    { 
        return cubie.position.toArray().map(idx => this.ctor.coordToIndex(idx,this.ctor.dim)) as Pos3;
    }

    override pivotFromSlice(axis: Axis, index: number): THREE.Group[] {
        return this.cubies_.filter(cubie => 
            this.ctor.L.isInSlice(
                cubie.position.toArray().map(idx => this.ctor.coordToIndex(idx,this.ctor.dim)) as Pos3, 
                axis, 
                index
            )
        );
    }

    override slotOfSticker(stickerId: StickerId): Slot {
        const sticker = this.requireSticker(stickerId);
        const cubie = sticker.parent as THREE.Group;

        const dirInCubie = CubeView.DEFAULT_DIR_.clone().applyQuaternion(sticker.quaternion);
        const dirInCube = dirInCubie.clone().applyQuaternion(cubie.quaternion);

        const w = AxisHelper.indexOf(dirInCube.round());
        const [x,y,z] = this.posOfCubie(cubie);
        const slot = this.ctor.L.defaultPos4ToSlot([x,y,z,w])!;
        return slot;
    }

    override pos4OfSticker(stickerId: StickerId): Pos4 {
        return this.ctor.L.slotToPos4(this.slotOfSticker(stickerId));
    }

    /// :- Creation methods

    protected createSticker(slot: Slot, dir: THREE.Vector3): THREE.Mesh {
        const initLayer = slot[0];
        const sticker = new THREE.Mesh(
            this.stickerGeo!,
            this.layerMaterials[initLayer]
        );
        sticker.position.copy(dir).multiplyScalar(CubeView.CONST.STICKER_OFFSET);
        sticker.quaternion.setFromUnitVectors(CubeView.DEFAULT_DIR_, dir);
        this.decorateStickerMesh(sticker, slot);
        return sticker;
    }

    protected createCubie(pos: Pos3): THREE.Group {
        const [x,y,z] = pos;
        const [px,py,pz] = pos.map(idx => this.ctor.indexToCoord(idx,this.ctor.dim));
        
        const group = new THREE.Group();
        group.position.set(px,py,pz);

        const cubie = new THREE.Mesh(this.cubieGeo, this.cubieMat);
        group.add(cubie);

        for (let w of [0,1,2,3,4,5]) {
            const slot = this.ctor.L.defaultPos4ToSlot([x,y,z,w]);
            if(!slot) continue;
            const dir = AxisHelper.vectorOf(w);
            const sticker = this.createSticker(slot,dir);
            group.add(sticker);
        }
        return group;
    }
}

const makeCubeView = <D extends number> (d: D) => WithDimCached(CubeView, d);

export { makeCubeView };