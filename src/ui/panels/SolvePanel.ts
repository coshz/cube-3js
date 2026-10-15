import { MoveExt } from "../../Defs";
import { AbstractPanel } from "../../Types";
import { MoveSerializer } from "../../helpers";
import { ccBus } from "../../services/CommandBus";
import { Solver } from "../../services/SolverService";


class SolvePanel extends AbstractPanel {
    private tgtInput!: HTMLInputElement;
    private solveBtn!: HTMLButtonElement;
    private playBtn!: HTMLButtonElement;
    private stepsContainer!: HTMLDivElement;

    private srcCube!: string;
    private currentMoves: MoveExt[] = [];
    private activeStepIndex: number = -1;
    private isPlaying: boolean = false;
    private playTimer: number | null = null;

    protected override setupDOM(): void {
        this.srcCube = this.controller.getColorConfig();

        // Tgt Cube
        const tgtRow = document.createElement('div');
        tgtRow.className = 'panel-row';
        tgtRow.innerHTML = `<label>Tgt:</label>`;
        this.tgtInput = document.createElement('input');
        this.tgtInput.className = 'panel-input input-color-config';
        this.tgtInput.placeholder = "UUUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
        this.tgtInput.maxLength = 54;
        this.tgtInput.spellcheck = false;
        tgtRow.appendChild(this.tgtInput);

        // Buttons
        const btnGroup = document.createElement('div');
        btnGroup.className = 'panel-row button-row';
        
        this.solveBtn = document.createElement('button');
        this.solveBtn.textContent = 'Solve';
        this.solveBtn.onclick = () => {
            this.handleSolve();
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            this.stopPlayback();
            this.onDismiss();
        };

        this.playBtn = document.createElement('button');
        this.playBtn.textContent = 'Play';
        this.playBtn.style.display = 'none';
        this.playBtn.onclick = () => {
            this.togglePlay();
        };

        btnGroup.append(this.solveBtn, cancelBtn, this.playBtn);

        this.stepsContainer = document.createElement('div');
        this.stepsContainer.className = 'panel-steps-grid';
        this.stepsContainer.style.display = 'none';

        this.element.append(tgtRow, btnGroup, this.stepsContainer);
    }

    private async handleSolve(): Promise<void> {
        this.stopPlayback();
        this.solveBtn.disabled = true;
        this.stepsContainer.style.display = 'grid';
        this.stepsContainer.innerHTML = '<span style="color: #888; grid-column: span 8; text-align: center; padding: 10px;">Solving...</span>';
        this.playBtn.style.display = 'none';

        const tgt = this.tgtInput.value || "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
        try {
            const res = await Solver.solveAsync(this.srcCube, tgt);
            if(res.ok) {
                this.currentMoves = MoveSerializer.deserialize(res.solution)!;
                this.activeStepIndex = -1;
                this.renderSteps();
                this.playBtn.style.display = 'inline-block';
            } else {
                this.currentMoves = [];
                this.stepsContainer.innerHTML = `<span style="color: #ff4d4f; grid-column: span 8; padding: 6px;">Solve Error: ${res.error}</span>`;
            }
        } catch(err) {
            this.currentMoves = [];
            this.stepsContainer.innerHTML = `<span style="color: #ff4d4f; grid-column: span 8; padding: 6px;">Worker Error: ${(err as Error).message ?? String(err)}</span>`;
        } finally {
            this.solveBtn.disabled = false;
        }
    }

    private renderSteps(): void {
        this.stepsContainer.innerHTML = '';
        const startBtn = document.createElement('button');
        startBtn.textContent = '^';
        startBtn.title = 'Initial State';
        startBtn.className = `step-pill-btn ${this.activeStepIndex === -1 ? 'active' : ''}`;
        startBtn.onclick = () => this.jumpToStep(-1);
        this.stepsContainer.appendChild(startBtn);

        this.currentMoves.forEach((move, i) => {
            const btn = document.createElement('button');
            btn.textContent = move;
            btn.title = `Step ${i + 1}`;
            btn.className = `step-pill-btn ${this.activeStepIndex === i ? 'active' : ''}`;
            btn.onclick = () => this.jumpToStep(i);
            this.stepsContainer.appendChild(btn);
        });
    }

    /* Jump to step i: apply moves up to step i onto initial state */
    private jumpToStep(targetIndex: number, stopPlay: boolean = true): void {
        if(stopPlay) this.stopPlayback();

        if(targetIndex == this.activeStepIndex) return;
        if(targetIndex == -1) {
            this.activeStepIndex = -1;
            this.controller.setColorConfig(this.srcCube);
            this.controller.resetCubeFrame();
            this.renderSteps();
            return;
        }
        
        if(targetIndex < this.activeStepIndex) {
            this.jumpToStep(-1,false); 
        }
        const from = this.activeStepIndex + 1;
        const ms = this.currentMoves.slice(from, targetIndex + 1);
        
        if(ms.length > 0) {
            ccBus.dispatch({
                type: 'move',
                move: ms
            });
        }
        this.activeStepIndex = targetIndex;
        this.renderSteps();
    }

    private stopPlayback() {
        this.isPlaying = false;
        if(this.playTimer != null) {
            clearInterval(this.playTimer);
            this.playTimer = null;
        }
        if(this.playBtn) {
            this.playBtn.textContent = 'Play';
        }
    }

    private togglePlay(): void {
        if(this.isPlaying) { this.stopPlayback(); return; }
    
        if(this.activeStepIndex >= this.currentMoves.length - 1) {
            this.jumpToStep(-1);
        }
        this.isPlaying = true;
        this.playBtn.textContent = 'Pause';
        this.playTimer = window.setInterval(() => {
            if(this.activeStepIndex < this.currentMoves.length -1) {
                this.jumpToStep(this.activeStepIndex + 1, false)
            } else {
                this.stopPlayback();
            }
        }, 1000);
    }

    override destroy(): void {
        this.stopPlayback();
    }
}

export default SolvePanel;