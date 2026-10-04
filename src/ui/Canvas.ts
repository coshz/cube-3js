import * as THREE from 'three';
import { AbstractInteraction, AbstractCubeView } from '../Types';    
import { cubeProjectorFactory } from '../core/CubeProjector';

class CanvasView {
    public renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private viewport: HTMLElement;
    private interactions: AbstractInteraction[] = [];

    constructor(container: HTMLElement) {
        this.camera = this.make_camera_();
        this.scene = this.make_scene_()
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.viewport = container;

        this.viewport.appendChild(this.renderer.domElement); 
        window.addEventListener('resize', this.onResize);  
        this.onResize()
    }

    public add(object: THREE.Object3D) {
        this.scene.add(object);
    }

    public domElement() { return this.renderer.domElement; }

    public makeCubeProjector(cube: AbstractCubeView) {
        return cubeProjectorFactory.create(this.camera, this.renderer.domElement, cube);
    }

    public addInteractions(interactions: AbstractInteraction[]) {
        this.interactions.push(...interactions);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
    }

    private make_camera_(): THREE.PerspectiveCamera {
        const camera = new THREE.PerspectiveCamera(60,1,0.1,100);
        camera.position.set(5,5,5);
        camera.lookAt(0,0,0); 
        camera.up.set(0,1,0);
        return camera;
    }

    private make_scene_(): THREE.Scene {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xababab);
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = false;
        scene.add(dirLight);
        return scene;
    }

    private onResize = () => {
        const width = this.viewport.clientWidth;
        const height = this.viewport.clientHeight;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width,height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.render();
    }
}

export default CanvasView;