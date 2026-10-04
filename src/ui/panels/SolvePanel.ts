import { AbstractPanel } from "../../Types";
import { ccBus } from "../../services/CommandBus";
import { CubeID, Solver } from "../../services/SolverService";


class SolvePanel extends AbstractPanel {
    private srcInput!: HTMLInputElement;
    private tgtInput!: HTMLInputElement;
    private solveBtn!: HTMLButtonElement;
    private outputArea!: HTMLTextAreaElement;
    private applyBtn!: HTMLButtonElement;

    protected override setupDOM(): void {
        // Src Cube
        const srcRow = document.createElement('div');
        srcRow.className = 'panel-row';
        srcRow.innerHTML = `<label>Src:</label>`;
        this.srcInput = document.createElement('input');
        this.srcInput.className = 'panel-input input-color-config';
        this.srcInput.value = this.controller.getColorConfig();
        this.srcInput.maxLength = 54;
        this.srcInput.spellcheck = false;
        srcRow.appendChild(this.srcInput);

        // Tgt Cube
        const tgtRow = document.createElement('div');
        tgtRow.className = 'panel-row';
        tgtRow.innerHTML = `<label>Tgt:</label>`;
        this.tgtInput = document.createElement('input');
        this.tgtInput.className = 'panel-input input-color-config';
        this.tgtInput.placeholder = "Default to Solved State";
        this.tgtInput.maxLength = 54;
        this.tgtInput.spellcheck = false;
        tgtRow.appendChild(this.tgtInput);

        // Buttons
        const btnGroup = document.createElement('div');
        btnGroup.className = 'panel-row button-row';
        
        this.solveBtn = document.createElement('button');
        this.solveBtn.textContent = 'Solve';
        this.solveBtn.onclick = () => this.handleSolve();

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = this.onDismiss;

        this.applyBtn = document.createElement('button');
        this.applyBtn.textContent = 'Apply Solution';
        this.applyBtn.style.display = 'none';
        this.applyBtn.onclick = () => {
            ccBus.dispatch({ type: 'move', move: this.outputArea.value.trim() });
            this.onDismiss();
        };

        btnGroup.append(this.solveBtn, cancelBtn, this.applyBtn);

        // Output Sequence
        this.outputArea = document.createElement('textarea');
        this.outputArea.className = 'panel-output';
        this.outputArea.readOnly = true;
        this.outputArea.rows = 3;
        this.outputArea.style.display = 'none';

        this.element.append(srcRow, tgtRow, btnGroup, this.outputArea);
    }

    private async handleSolve(): Promise<void> {
        this.solveBtn.disabled = true;
        this.outputArea.style.display = 'block';
        this.outputArea.value = 'Solving...';
        this.applyBtn.style.display = 'none';

        const src = this.srcInput.value;
        const tgt = this.tgtInput.value || CubeID;
        try {
            const res = await Solver.solveAsync(src, tgt);
            if(res.ok) {
                this.outputArea.value = res.solution;
                this.applyBtn.style.display = 'inline-block';
            } else {
                this.outputArea.value = `Solver Error: ${res.error}`;
                // this.applyBtn.style.display = 'none';
            }
        } catch(err) {
            this.outputArea.value = `Worker Error: ${(err as Error).message ?? String(err)}`;
            // this.applyBtn.style.display = 'none';
        } finally {
            this.solveBtn.disabled = false;
        }
    }

    override destroy(): void {}
}

export default SolvePanel;