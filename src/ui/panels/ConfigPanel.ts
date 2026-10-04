import { AbstractPanel } from "../../Types";
import { MoveSerializer } from "../../helpers";
import { ccBus } from "../../services/CommandBus";


class ConfigPanel extends AbstractPanel {
    private stateInput!: HTMLInputElement;
    private moveInput!: HTMLInputElement;

    protected override setupDOM(): void {
        const stateRow = document.createElement('div');
        stateRow.className = 'panel-row';
        stateRow.innerHTML = `<label>State:</label>`;
        this.stateInput = document.createElement('input');
        this.stateInput.type = 'text';
        this.stateInput.className = 'panel-input input-color-config';
        this.stateInput.maxLength = 54
        this.stateInput.value = this.controller.getColorConfig();
        stateRow.appendChild(this.stateInput);

        const moveRow = document.createElement('div');
        moveRow.className = 'panel-row';
        moveRow.innerHTML = `<label>Move:</label>`;
        this.moveInput = document.createElement('input');
        this.moveInput.type = 'text';
        this.moveInput.className = 'panel-input input-move-config';
        this.moveInput.placeholder = "eg. R U2 F' D L2 B";
        moveRow.appendChild(this.moveInput);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'panel-row button-row';
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.onclick = () => this.onApply();

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = this.onDismiss;

        btnGroup.append(applyBtn, cancelBtn);
        this.element.append(stateRow, moveRow, btnGroup);
    }

    override destroy(): void {}

    private onApply = () => {
        const stateStr = this.stateInput.value.trim();
        const moveStr = this.moveInput.value.trim();
        if(stateStr && stateStr !== this.controller.getColorConfig()) {
            if(stateStr.length !== 54) {
                alert('error: only length 54 supported');
                return;
            }
            ccBus.dispatch({ type: 'config', colors: stateStr });
            this.onDismiss();
        }
        if(moveStr) {
            const ms = MoveSerializer.deserialize(moveStr);
            if(!ms) { 
                alert('error: invalid move sequence'); 
                return; 
            }
            ccBus.dispatch({ type: 'move', move: ms });
            this.onDismiss();
        } else {
            alert('error: no state or move specified');
            return;
        }
    }
}

export default ConfigPanel;