import * as THREE from 'three';
import { MoveHint, Axis, Pos4 } from '../Defs';
import { AbstractInteraction, ICubeProjector, InteractionMode, AxisHelper, AbstractCubeLayout } from '../Types';
import { ccBus } from '../services/CommandBus';


class MouseInteraction extends AbstractInteraction {
    private dragState = {
        active: false,
        screenStart: new THREE.Vector2(),
        screenEnd: new THREE.Vector2(),
        stickerPos4: null as Pos4 | null, 
    }
    private pendingMove_: PointerEvent | null = null;
    private rafId_: number = 0;

    constructor(
        target: EventTarget,
        private projector: ICubeProjector,
        protected state: { readonly mode: InteractionMode }
    ) { 
        super(target); 
    }

    override onPointerDown(event: PointerEvent) {
        if(!event.isPrimary) return;
        if(event.button !== 0) return; // only left click is allowed
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

        this.dragState.active = true;
        this.dragState.screenStart.set(event.offsetX, event.offsetY);
        this.dragState.stickerPos4 = this.projector.raycastToStickerPos(event.offsetX, event.offsetY); 
    }

    override onPointerMove(event: PointerEvent) {
        if(!event.isPrimary) return;
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

    private processMove(event: PointerEvent) {
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
            // nearest direction 
            let dW: number | null = null;
            drag.normalize();
            for(const w of [0,1,2,3,4,5]) {
                if(w << 1 === this.dragState.stickerPos4[3] << 1) continue;
                const wProj = this.projector.projectToScreen(AxisHelper.vectorOf(w),true).normalize();
                if(wProj.dot(drag) > DRAG_EXACT_THRESHOLD) {
                    dW = w;
                    break;
                }
            }
            if(dW === null) return;
            const layerMove = AbstractCubeLayout.layerMoveFromSD(this.dragState.stickerPos4, dW);
            if(!layerMove) return;
            const move: MoveHint = {
                axis: layerMove.axis,
                ori: layerMove.ori,
                indices: [layerMove.index],
            };
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

    override onPointerUp(event: PointerEvent) {
        this.dragState.active = false;
    }

    override onPointerCancel(event: PointerEvent) {
        this.dragState.active = false;
    }
}

export { MouseInteraction };