import { ICubeController, AbstractCubeView, ICubeProjector, StickerId } from './Types';
import CanvasView from './ui/Canvas';
import PanelView from './ui/Panel';
import { CubeController } from './core/RubikCube';
import { makeCubeView } from './core/CubeView';
import { KeyInteraction } from './controls/KeyInteraction';
import { MouseInteraction } from './controls/MouseInteraction';
import { EditInteraction } from './controls/EditInteraction';
import { ccBus, MoveCommand, ArcballCommand, ReorientCommand, ResetCommand, ConfigCommand, EditCommand, EditFaceCommand } from './services/CommandBus';

import './assets/style/main.css';
import './assets/style/panel.css';


class CubeApp {
    private cubeView: AbstractCubeView;
    private projector: ICubeProjector;
    private controller: ICubeController;
    private canvas: CanvasView;
    private panel: PanelView;

    constructor() {
        this.cubeView = new (makeCubeView(3))().setSize(3);
        this.canvas = new CanvasView(document.getElementById("viewport")!);
        this.controller = new CubeController(this.cubeView);
        this.projector = this.canvas.makeCubeProjector(this.cubeView)
        this.panel = new PanelView(this.controller, document.getElementById("panel")!);
        
        this.canvas.addInteractions([
            new KeyInteraction(window),
            new MouseInteraction(this.canvas.domElement(), this.projector, this.panel.interactionState),
            new EditInteraction(this.canvas.domElement(), this.projector, this.panel.interactionState)
        ]);

        this.canvas.add(this.cubeView);
        this.canvas.render();
        this.cubeView.onCubeUpdate = this.canvas.render.bind(this.canvas);

        this.init();
    }

    init() {
        ccBus.register('move', (cmd: MoveCommand) => this.controller.applyMove(cmd.move));
        ccBus.register('reset', (cmd: ResetCommand) => this.controller.resetCube());
        ccBus.register('reorient', (cmd: ReorientCommand) => this.controller.resetCubeFrame());
        ccBus.register('config', (cfg: ConfigCommand) => this.controller.setColorConfig(cfg.colors));
        ccBus.register('arcball', (cmd: ArcballCommand) => this.controller.arcballRotate(cmd.src,cmd.tgt));
    }
}

export default CubeApp;