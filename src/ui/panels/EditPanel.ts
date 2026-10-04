import { AbstractPanel, ICubeController, ICubeEditor, InteractionState, StickerId } from "../../Types";
import { ORDERED_LAYERS, COLOR_OF_LAYER, Layer } from "../../Defs";
import { CubeEditor } from "../../core/CubeEditor";
import { ccBus, EditCommand, EditFaceCommand } from "../../services/CommandBus";


const layer2color = (layer: Layer) => '#' + COLOR_OF_LAYER[layer as Layer].toString(16).padStart(6,'0');

class EditPanel extends AbstractPanel {
    private colorBtns: Map<Layer,HTMLButtonElement> = new Map();
    private countBadges: Map<Layer,HTMLSpanElement> = new Map();
    private cubeEditor!: ICubeEditor;
    private onColorChanged: (color?: Layer) => void;

    constructor(
        controller: ICubeController, 
        private state: InteractionState,
        onDismiss: () => void,
    ) {
        super(controller, onDismiss);
        this.onColorChanged = (color?: Layer) => {
            this.updateColorCounts();
            if(!color) return;
            this.state.activeColor = color;
            this.colorBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.color === color);
            });
        };
        this.cubeEditor = new CubeEditor(controller);
        const is_center_id = (id: StickerId) => {
                const n = Number(id.slice(1));
                const D = this.controller.getDim();
                return D % 2 == 1 && n === Math.floor(D*D/2);
        };
        ccBus.register('edit', (cmd: EditCommand) => {
            if(is_center_id(cmd.stickerId)) return;
            this.cubeEditor.paintSticker(cmd.stickerId, cmd.color);
            this.onColorChanged(cmd.color);
        });
        ccBus.register('edit-face', (cmd: EditFaceCommand) => {
            if(!is_center_id(cmd.stickerId)) return;
            console.log('id: ', cmd.stickerId);
            this.cubeEditor.paintFace(cmd.stickerId);
            this.onColorChanged();
        });
        this.state.enterEdit();
    }

    protected override setupDOM(): void {
        const palette = document.createElement('div');
        palette.className = 'palette-group panel-row';
        
        ORDERED_LAYERS.forEach(layer => {
            const btn = document.createElement('button');
            btn.className = 'color-palette-btn';
            btn.dataset.color = layer;
            btn.style.backgroundColor = layer2color(layer as Layer);

            const badge = document.createElement('span');
            badge.className = 'color-count-badge';
            btn.append(badge);

            this.colorBtns.set(layer, btn);
            this.countBadges.set(layer, badge);
            
            btn.addEventListener('click', () => this.onColorChanged(layer));
            palette.appendChild(btn);

            if(layer === 'U') btn.classList.add('active');
            return btn;
        });

        const btnGroup = document.createElement('div');
        btnGroup.className = 'panel-row button-row';
        
        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
            const success = this.cubeEditor?.commit() ?? false;
            if(success) {
                this.onDismiss();
            } else {
                const dialog = document.createElement('dialog');
                dialog.textContent = 'Invalid Color Config';
                document.body.append(dialog);
                dialog.showModal();
                setTimeout(() => {
                    dialog.close();
                    dialog.remove();
                },2000);
            }
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            this.cubeEditor?.cancel();
            this.onColorChanged();
            this.onDismiss();
        };

        btnGroup.append(okBtn, cancelBtn);
        this.element.append(palette, btnGroup);

        this.updateColorCounts();
    }

    override destroy(): void {
        this.state.exitEdit();
    }

    public updateColorCounts(): void {
        const configStr = this.controller.getColorConfig(); 
        const counts: Record<string, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
        
        for (const char of configStr) {
            if (counts[char] !== undefined) counts[char]++;
        }

        this.countBadges.forEach((badge, layer) => {
            const count = counts[layer] || 0;
            badge.textContent = `${count}`;
            badge.classList.toggle('invalid', count !== 9);
        });
    }
}

export default EditPanel;