import { ICubeEditor, StickerId, IStickerAccessor, CubeCodec } from '../Types';
import { Layer } from '../Defs';
import { textSpanIsEmpty } from 'typescript';


type EditorState = 'draft' | 'committed' | 'cancelled';

/** 
 * An interface for cube color editing
 * 
 * @remark Operations on cube and their combinations
 *  1. Edit * ColorPaint * cubeRotate * exitEdit = (Edit * ColorPaint * exitEdit) * cubeRotate
 *  2. layerRotate is disabled since snapshot should be invariant
 */
class CubeEditor implements ICubeEditor {
    private readonly snapshot = new Map<StickerId, Layer>();
    private state_: EditorState = 'draft';

    constructor(protected readonly sa: IStickerAccessor) {
        this.takeSnapshot();
    }

    paintSticker(id: StickerId, color: Layer): void {
        if(this.state_ === 'committed') return;
        this.sa.setLayerOfSticker(id, color);
    }

    paintFace(id: StickerId): void {
        const colorOf = (id: StickerId) => this.sa.currentSlotOfSticker(id)[0];
        const colorBase = colorOf(id);
        const idsOnFace = [...this.sa.allStickerIds()].filter(
            id_ => colorOf(id_) === colorBase
        );
        this.sa.transaction(self => {
            for(const id_ of idsOnFace) {
                self.setLayerOfSticker(id_, self.getLayerOfSticker(id));
            }
        });
    }

    commit(validator?: (color: string) => boolean): boolean {
        if(this.state_ !== 'draft') return this.state_ === 'committed';
        if(validator && !validator(CubeCodec.exportString(this.sa))) {
            this.cancel();
            return false;
        }
        this.state_ = 'committed';
        return true; 
    }

    cancel(): void {
        if(this.state_ !== 'draft') return;
        this.restoreSnapshot();
        this.state_ = 'cancelled';
    }

    private takeSnapshot(): void {
        for(const id of this.sa.allStickerIds()) {
            this.snapshot.set(id,this.sa.getLayerOfSticker(id));
        }
    }

    private restoreSnapshot(): void {
        for(const id of this.sa.allStickerIds()) {
            this.sa.setLayerOfSticker(id, this.snapshot.get(id)!); 
        }
    }
}

export { CubeEditor };