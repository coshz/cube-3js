import { isLayerExt, MoveExt, MoveHintMap } from '../Defs';
import { AbstractInteraction } from '../Types';
import { ccBus } from '../services/CommandBus';


class KeyInteraction extends AbstractInteraction {
    override onKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if(
            target.tagName === 'INPUT' || 
            target.tagName === 'TEXTAREA' || 
            target.isContentEditable
        ) return;
        
        let move = '' as string;
        if(event.key == " ") {
            ccBus.dispatch({
                'type': 'reorient',
            });
        }
        switch(event.key) {   
            case "ArrowRight":  move = "Rx1"; break;
            case "ArrowUp":     move = "Ux1"; break;
            case "ArrowDown":   move = "Fx1"; break;
            case "ArrowLeft":   move = "Yx1"; break;
            default:
                if(!isLayerExt(event.key)) return;
                move = (event.shiftKey) ? `${event.key}x3` : `${event.key}x1`;
        }
        ccBus.dispatch({
            'type': 'move',
            'move': MoveHintMap[move as MoveExt]
        });
    }
}

export { KeyInteraction };