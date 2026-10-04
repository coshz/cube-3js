import * as THREE from 'three';
import { Layer, MoveExt, MoveHint } from "../Defs";
import { StickerId } from '../Types';


type MoveCommand = { type: 'move'; move: MoveHint | MoveExt[] | string };
type ArcballCommand = { type: 'arcball'; src: THREE.Vector3, tgt: THREE.Vector3 };
type ReorientCommand = { type: 'reorient' };
type ResetCommand = { type: 'reset' };
type ConfigCommand = { type: 'config'; colors: string };
type EditCommand = { type: 'edit', stickerId: StickerId, color: Layer };
type EditFaceCommand = { type: 'edit-face', stickerId: StickerId };

type SolveCommand = { type: 'solve', target?: string }

type SolveResultCommand = { type: 'solve-result', success: boolean, solution?: string, error?: string}

type ActiveColorCommand = { type: 'active-color', color: Layer };

type SolveCommands = SolveCommand | SolveResultCommand;

type CubeCommand = 
    | MoveCommand 
    | ArcballCommand 
    | ReorientCommand 
    | ResetCommand 
    | ConfigCommand
    | EditCommand
    | EditFaceCommand
    | SolveCommands
;

type CommandType = CubeCommand['type'];
type CommandTypeMap = {
    [C in CubeCommand as C['type']]: C;
};

class CommandBus {
    private handlersMap = new Map<CommandType, Array<(cmd:any)=>void>>();

    register<K extends CommandType>(
        cmdType: K, 
        handler: (cmd:CommandTypeMap[K]) => void
    ) {
        if(!this.handlersMap.has(cmdType)) {
            this.handlersMap.set(cmdType,[]);
        }
        this.handlersMap.get(cmdType)!.push(handler);
    }

    dispatch(cmd: CubeCommand) {
        const handlers = this.handlersMap.get(cmd.type);
        if(handlers) {
            handlers.forEach(handler => handler(cmd));
        }
    }
}

/* global command bus */ 
const ccBus = new CommandBus();

export { ccBus };
export type { MoveCommand, ArcballCommand, ReorientCommand, ResetCommand, ConfigCommand, EditCommand, EditFaceCommand, CubeCommand, SolveCommand, SolveResultCommand };