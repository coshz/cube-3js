import { AbstractPanel, ICubeController, InteractionState } from "../Types";
import { Layer } from "../Defs";
import ConfigPanel from "./panels/ConfigPanel";
import SolvePanel from "./panels/SolvePanel";
import EditPanel from "./panels/EditPanel";

type PanelState = 'idle' | 'config' | 'solve' | 'edit';

class PanelView {
    private rootElement: HTMLElement;
    private toolbarElement!: HTMLElement;
    private contentElement!: HTMLElement;
    private activeSubview: AbstractPanel | null = null;
    private state_: PanelState = 'idle';
    private interactionState_: InteractionState = new InteractionState();

    get interactionState() { return this.interactionState_; }

    get state() { return this.state_; }

    constructor(
        private controller: ICubeController,
        private container: HTMLElement
    ) {
        this.rootElement = document.createElement('div');
        this.rootElement.className = 'panel-view';

        this.initDomLayout();
        this.container.appendChild(this.rootElement);
    }

    private initDomLayout() {
        this.toolbarElement = document.createElement('div');
        this.toolbarElement.className = 'panel-toolbar';
        this.toolbarElement.innerHTML = `
            <button data-action="reset">Reset</button>
            <button data-action="config">Config</button>
            <button data-action="solve">Solve</button>
            <button data-action="edit">Edit</button>
        `;
        this.toolbarElement.addEventListener('click', this.onToolbarClick);
        
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'panel-content';
        
        this.rootElement.append(this.contentElement, this.toolbarElement);
    }

    public transitionTo(newState: PanelState): void {
        if (this.state_ == newState) return;
        if(this.activeSubview) {
            this.activeSubview.deinit()
            this.activeSubview = null;
        }
        this.contentElement.innerHTML = '';
        if (newState !== 'idle') {
            this.activeSubview = this.createSubview(newState);
            this.contentElement.appendChild(this.activeSubview.getElement())
        }
        this.state_ = newState;
        this.updateToolbarInteractivity(newState==='idle');
    }

    private updateToolbarInteractivity(isInteractive: boolean):void {
        const buttons = this.toolbarElement.querySelectorAll<HTMLButtonElement>('button');
        buttons.forEach(btn => { btn.disabled = !isInteractive; }); 
        // this.toolbarElement.classList.toggle('is-disabled', !isInteractive);
    }

    private onToolbarClick = (event: Event): void => {
        if (this.state_ !== 'idle') return;

        const target = event.target as HTMLElement;
        const action = target.dataset.action as PanelState | 'reset';
        if(!action) return;
        if(action === 'reset') {
            this.controller.resetCube();
        } else {
            this.transitionTo(action);
        }
    }

    private createSubview(state: Exclude<PanelState,'idle'>): AbstractPanel {
        const dismiss = () => { this.transitionTo('idle') };
        switch(state) {
            case 'config':  return new ConfigPanel(this.controller, dismiss).init();
            case 'solve':   return new SolvePanel(this.controller, dismiss).init();
            case 'edit':    return new EditPanel(this.controller, this.interactionState, dismiss).init();
        }
    }
}

export default PanelView;