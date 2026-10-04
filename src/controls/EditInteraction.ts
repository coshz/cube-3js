import { AbstractInteraction, ICubeProjector, InteractionMode } from '../Types';
import { ccBus } from '../services/CommandBus';
import { Layer } from '../Defs';

/**
 * Hanles interactive sticker painting
 */
class EditInteraction extends AbstractInteraction {
    constructor(
        target: EventTarget,
        private projector: ICubeProjector,
        protected state: { 
            readonly mode: InteractionMode,
            readonly activeColor: Layer
        }
    ) {
        super(target);
    }

    override onMouseDown(event: MouseEvent) {
        if(this.state.mode !== 'Edit') return;
        const id = this.projector.raycastToSticker(event.clientX, event.clientY);
        if(!id) return;
        if(event.detail >= 2) {
            ccBus.dispatch({ type: 'edit-face', stickerId: id });
        } else {
            ccBus.dispatch({ type: 'edit', stickerId: id, color: this.state.activeColor });
        }
    }
}

export { EditInteraction };