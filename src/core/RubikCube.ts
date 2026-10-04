import { MoveHint, Layer, Slot, MoveExt } from '../Defs';
import { MoveSerializer } from '../helpers';
import { RotateExecutor } from './Executor';
import { AbstractCubeView, CubeCodec, ICubeController, IStickerAccessor, StickerId } from '../Types';
import { RotationAnimator } from './Animator';
import * as THREE from 'three';


function arcballQuaternion(
    src: THREE.Vector3, 
    tgt: THREE.Vector3, 
    sensitivity: number = 1.0
): THREE.Quaternion | null {
    let q = new THREE.Quaternion().setFromUnitVectors(src,tgt);
    const halfAngle = Math.acos(Math.min(1,Math.max(-1,q.w)));
    if(halfAngle < 1e-6) return null;
    
    const axis = new THREE.Vector3(q.x,q.y,q.z).normalize();
    const scaledAngle = halfAngle * 2 * sensitivity;
    return new THREE.Quaternion().setFromAxisAngle(axis, scaledAngle);
}

class CubeController implements ICubeController, IStickerAccessor {
    private executor: RotateExecutor;
    constructor(
        private cubeView: AbstractCubeView,
    ){
        this.executor = new RotateExecutor(new RotationAnimator(this.cubeView));
    }

    applyMove(move: MoveHint | MoveExt[] | string): void {
        if(typeof move === 'object') this.executor.rotate(move as MoveHint);
        else this.executor.rotate(typeof move === 'string'
            ? MoveSerializer.deserialize(move)! as MoveExt[]
            : move as MoveExt[]
        );
    }

    arcballRotate(src: THREE.Vector3, tgt: THREE.Vector3, sensitivity = 1.0): void {
        const q = arcballQuaternion(src, tgt);
        if(!q) return;
        this.cubeView.rotateFrame(q);
        this.cubeView.flush();
    }

    resetCubeFrame(): void { this.executor.rotateToDefault(); }

    resetCube(): void { 
        this.cubeView.reset();
        this.cubeView.flush();
    }

    getColorConfig(): string {
        return CubeCodec.exportString(this);
    }

    setColorConfig(colors: string): void {
        CubeCodec.importString(this, colors);
        this.cubeView.flush();
    }

    setLayerOfSticker(sticker: StickerId, color: Layer): void {
        this.cubeView.setLayerOfSticker(sticker, color);
        if (this.batchDepth_ === 0) this.cubeView.flush();
    }

    getLayerOfSticker(sticker: StickerId): Layer {
        return this.cubeView.getLayerOfSticker(sticker);
    }

    currentSlotOfSticker(id: StickerId): Slot {
        return this.cubeView.slotOfSticker(id);
    }

    allStickerIds(): Iterable<StickerId> {
        return this.cubeView.stickerIds;
    }

    private batchDepth_ = 0;
    transaction<T>(fn: (tx: IStickerAccessor) => T): T {
        this.batchDepth_++;
        try {
            return fn(this);
        } finally {
            this.batchDepth_--;
            if (this.batchDepth_ === 0) this.cubeView.flush();
        }
    }

    getDim() { return this.cubeView.getDim() }
}

export { CubeController };