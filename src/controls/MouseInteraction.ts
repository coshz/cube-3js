import * as THREE from 'three';
import { MoveHint, Axis, Pos4 } from '../Defs';
import { AbstractInteraction, ICubeProjector, InteractionMode, AxisHelper } from '../Types';
import { ccBus } from '../services/CommandBus';


class MouseInteraction extends AbstractInteraction {
    private dragState = {
        active: false,
        screenStart: new THREE.Vector2(),
        screenEnd: new THREE.Vector2(),
        stickerPos4: null as Pos4 | null, 
    }
    private pendingMove_: MouseEvent | null = null;
    private rafId_: number = 0;

    constructor(
        target: EventTarget,
        private projector: ICubeProjector,
        protected state: { readonly mode: InteractionMode }
    ) { 
        super(target); 
    }

    override onMouseDown(event: MouseEvent) {
        if(event.button !== 0) return; // only left click is allowed
        this.dragState.active = true;
        this.dragState.screenStart.set(event.offsetX, event.offsetY);
        this.dragState.stickerPos4 = this.projector.raycastToStickerPos(event.offsetX, event.offsetY);
    }

    override onMouseMove(event: MouseEvent) {
        if(!this.dragState.active) return;
        this.pendingMove_ = event;
        if(this.rafId_) return;
        this.rafId_ = requestAnimationFrame(() => {
            this.rafId_ = 0;
            const e = this.pendingMove_;
            this.pendingMove_ = null;
            if(e) this.processMove(e);
        });
    }

    private processMove(event: MouseEvent) {
        const DRAG_EXACT_THRESHOLD = 0.9;
        const DRAG_PIXIL_THRESHOLD = 30;

        if(this.dragState.active === false) return;
        if(this.dragState.stickerPos4) /* layer rotation */ {
            // layer rotation is allowed in view mode only 
            if(this.state.mode !== 'View') return;

            const dx = event.offsetX - this.dragState.screenStart.x;
            const dy = event.offsetY - this.dragState.screenStart.y;
            
            const drag = new THREE.Vector2(dx,dy);
            // ignore tiny drag
            if(drag.lengthSq() < DRAG_PIXIL_THRESHOLD * DRAG_PIXIL_THRESHOLD) return;

            const w = this.dragState.stickerPos4[3];
            const [wAxis, wSign] = ["xxyyzz"[w], w % 2 == 0 ? 1 : -1] as [Axis,number];

            const tangents: Record<Axis,[[Axis,Axis,number],[Axis,Axis,number]]> = {
                x: [['y','z',+1],['z','y',-1]],
                y: [['z','x',+1],['x','z',-1]],
                z: [['x','y',+1],['y','x',-1]],
            };
            let move = null as MoveHint | null;
            for(const [dragAxis, rotAxis, signMult] of tangents[wAxis]) {
                const dProj = this.projector.projectToScreen(AxisHelper.vectorOf(dragAxis), true).normalize();
                const dot = dProj.dot(drag.clone().normalize());
                const [dotAbs, dotSign] = [ Math.abs(dot), Math.sign(dot) ];
                if(dotAbs > DRAG_EXACT_THRESHOLD) {
                    move = {
                        axis: rotAxis,
                        ori: signMult * dotSign * wSign,
                        indices: [this.dragState.stickerPos4["xyz".indexOf(rotAxis)]]
                    };
                    break;
                }
            }

            if(!move) return;
            ccBus.dispatch({ type: 'move', move });
            // mark current drag ends
            this.dragState.active = false;
        } else /* continuous cube rotation */ {
            ccBus.dispatch({
                type: 'arcball',
                src: this.projector.promoteToArcball(...this.dragState.screenStart.toArray()),                                                                                                                                                                                                                    
                tgt: this.projector.promoteToArcball(event.offsetX, event.offsetY),  
            });
            this.dragState.screenStart.set(event.offsetX, event.offsetY);
        }
    }

    override onMouseUp(event: MouseEvent) {
        this.dragState.active = false;
    }
}

export { MouseInteraction };