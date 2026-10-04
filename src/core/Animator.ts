import * as THREE from 'three';
import { AbstractCubeView, IAnimator, AxisHelper } from '../Types';

/**
 * @desc rotate an object with animation
 * 
 * @param 
 *  - pivot: Object3D to rotate
 *  - axis: axis to rotate (in pivot space)
 *  - angle: angle to rotate 
 *  - duration: animation duration
 *  - easingInOut: yes - easing; no - linear
 *  - onFrame: (optional) callback on each frame
 *  - onComplete: (optional) callback on complete
 * 
 * @returns 
 *  a promise that resolves when the animation is complete
 * 
 * @note 
 *  this function **mutates** pivot object. 
 */
const animateRotation = (
    pivot: THREE.Object3D,
    axis: THREE.Vector3,
    angle: number,
    duration: number, 
    easingInOut: boolean = true,
    onFrame?: () => void,
    onComplete?: () => void
) => new Promise<void> ( (resolve) => {
    const rotateQuat = new THREE.Quaternion().setFromAxisAngle(axis,angle);
    const begQuat = pivot.quaternion.clone();
    const endQuat = begQuat.clone().multiply(rotateQuat);
    const startTime = performance.now();
    const step = (now: number) => {
        const easing = (t:number) => easingInOut 
            ? (t < 0.5 ? 2*t*t : 1-2*(1-t)*(1-t)) 
            : t
        ;
        const t = Math.min(1, (now - startTime) / duration);
        const tt = easing(t);
        pivot.quaternion.slerpQuaternions(begQuat, endQuat, tt);

        onFrame?.();
        if(t < 1) {
            requestAnimationFrame(step);
        } else {
            pivot.quaternion.copy(endQuat);
            pivot.updateMatrixWorld(true);
            onComplete?.();
            resolve();
        }
    };
    requestAnimationFrame(step);
});

class RotationAnimator implements IAnimator {
    // Animate duration (unit: ms)
    static readonly defaultDuration = 150;

    constructor(readonly cube: AbstractCubeView) {}

    rotateLayer(axis:'x'|'y'|'z', indices:number[], clockwise: boolean): Promise<void> {
        const pivot = new THREE.Group;
        this.cube.add(pivot);
        const cubiesToRotate = indices.flatMap(index => this.cube.pivotFromSlice(axis, index));
        cubiesToRotate.forEach(cubie => pivot.add(cubie));

        return animateRotation(
            pivot, 
            AxisHelper.vectorOf(axis), 
            clockwise ? -Math.PI/2 : +Math.PI/2,
            RotationAnimator.defaultDuration, 
            true, 
            this.cube.onCubeUpdate,
            () => {
                pivot.updateMatrixWorld(true);
                cubiesToRotate.forEach( cubie => this.cube.attach(cubie) );
                this.cube.gridSnap(cubiesToRotate);
                this.cube.remove(pivot);
            }
        );
    }

    rotateCube(arg0:[number,number,number,number]|THREE.Vector3, arg1?:number): Promise<void> {
        const axis = Array.isArray(arg0) ? new THREE.Vector3(...arg0.slice(0,3)) : arg0;
        const angle = Array.isArray(arg0) ? arg0[3] : arg1 ? arg1 : 0;

        return animateRotation(
            this.cube, axis, angle, RotationAnimator.defaultDuration, true, 
            this.cube.onCubeUpdate
        );
    }

    rotateCubeToDefault(): Promise<void> {
        const getAxisAngle = (quaternion:THREE.Quaternion) => {
            const q = quaternion;
            // ? I'm confused why q.w > 1 happens here which causes the cube disappears after rotationCube.
            const w = Math.max(-1,Math.min(1,q.w));
            const angle = 2 * Math.acos(w);
            const s = Math.sqrt(1-w*w);
            let axis = new THREE.Vector3();
            if(s < 1e-3) { axis.set(1,0,0); }
            else { axis.set(q.x/s, q.y/s, q.z/s); }
            return {axis, angle};
        };
        const {axis, angle} = getAxisAngle(this.cube.quaternion);
        return this.rotateCube(axis,-angle);
    }
}

export { animateRotation, RotationAnimator };