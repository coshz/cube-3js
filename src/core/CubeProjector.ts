import { Pos4 } from "../Defs";
import { AbstractCubeView, ICubeProjector, StickerId, StickerType } from "../Types";
import * as THREE from 'three';


class CubeProjector implements ICubeProjector {
    constructor(
        private camera: THREE.Camera,
        private canvas: HTMLCanvasElement,
        private cube: AbstractCubeView
    ){}

    raycastToSticker(screenX: number, screenY: number): StickerId | null {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(this.toNdc(screenX,screenY), this.camera);
        const hits = raycaster.intersectObject(this.cube,false);
        if(hits.length === 0) return null;

        const hit = hits[0];
        const sticker = hit.object as StickerType;
        return sticker.userData.id;
    }

    raycastToStickerPos(screenX: number, screenY: number): Pos4 | null {
        const stickerId = this.raycastToSticker(screenX,screenY);
        if(!stickerId) return null;
        return this.cube.pos4OfSticker(stickerId);
    }

    projectToScreen(vec: THREE.Vector3, isDirection?: boolean): THREE.Vector2 {
        const v = vec.clone();
        if(isDirection) {
            const worldQuat = new THREE.Quaternion();
            this.cube.getWorldQuaternion(worldQuat);
            v.applyQuaternion(worldQuat);
            const origin = new THREE.Vector3(0,0,0).applyMatrix4(this.cube.matrixWorld).project(this.camera);
            const target = new THREE.Vector3(0,0,0).applyMatrix4(this.cube.matrixWorld).add(v).project(this.camera);
            return this.toScreen(target.x, target.y).sub(this.toScreen(origin.x, origin.y));
        } else {
            v.applyMatrix4(this.cube.matrixWorld).project(this.camera);
            return this.toScreen(v.x, v.y);
        }
    }

    promoteToArcball(screenX: number, screenY: number): THREE.Vector3 {
        const [x,y] = this.toNdc(screenX,screenY).toArray();
        const sq = x * x + y * y;
        const nz = sq >= 1 ? 0 : Math.sqrt(1-sq);
        return new THREE.Vector3(x,y,nz).normalize();
    }

    protected toNdc(x:number, y:number): THREE.Vector2 {
        const rect = this.canvas.getBoundingClientRect();
        return new THREE.Vector2(
            +2 * (x- rect.left) / rect.width - 1,
            -2 * (y - rect.top) / rect.height + 1
        );
    }

    protected toScreen(ndcX: number, ndcY: number): THREE.Vector2 {
        const rect = this.canvas.getBoundingClientRect();
        return new THREE.Vector2(
            rect.left + rect.width * (ndcX + 1) / 2,
            rect.top + rect.height * (-ndcY + 1) / 2
        );
    }
}

interface ICubeProjectorFactory {
    create(
        camera: THREE.Camera, 
        canvas: HTMLCanvasElement,
        cube: AbstractCubeView
    ): ICubeProjector
}

const cubeProjectorFactory: ICubeProjectorFactory = {
    create: (camera: THREE.Camera, canvas: HTMLCanvasElement, cube: AbstractCubeView) => {
        return new CubeProjector(camera, canvas, cube);
    }
};

export { CubeProjector, cubeProjectorFactory};