import { IAnimator } from "../Types";
import { MoveExt, MoveHint, MoveHintMap } from "../Defs";


/**
 * @desc A executor to sequence tasks: 
 * @note 
 *  The executor stops if a task fails.
 */
class SequenceExecutor {
    protected running: Promise<unknown> = Promise.resolve();

    enqueue<T>(task: () => Promise<T>): Promise<T> {
        const next = this.running.then(task);
        this.running = next;
        return next;
    }
}

/**
 * @desc A executor to sequence cube-rotation tasks
 */
class RotateExecutor extends SequenceExecutor {
    constructor(private animator: IAnimator) { super(); }

    /**
     * @desc A facade method to rotateXXX methods through sequential executor and 
     *       generic parameter Movehint. 
     */
    public rotate(move:[number,number,number,number]):void;  // for cube-rotation 
    public rotate(move:MoveExt):void;   // for layer-rotation
    public rotate(move:MoveHint):void;  // for layer-rotation 
    public rotate(move:MoveExt[]):void; // for rotation sequence
    public rotate(move: MoveHint | MoveExt | MoveExt[] | [number,number,number,number]):void {
        if(Array.isArray(move)) {
            if(move.length === 0) return;
            if(typeof move[0] === 'string') /* MoveExt[] */{
                for(const m of move as MoveExt[]) { 
                    this.rotate(m); 
                }
            } else /* [number,number,number,number] */ {
                const [ax,ay,az,angle] = move as [number,number,number,number];
                this.enqueue(() => this.animator.rotateCube([ax,ay,az,angle]));
            }
        } else {
            const repN = (fn: ()=>void|Promise<void>, N:number) => async () => {
                for(let i = 0; i < N; ++i) { await fn(); }
            };
            const m = (typeof move === 'string')
                ? MoveHintMap[move] /* MoveExt */ 
                : move /* MoveHint */
            ;
            const n = Math.abs(m.ori) % 4;
            this.enqueue(repN(
                () => this.animator.rotateLayer(m.axis, m.indices, m.ori < 0), 
                n
            ));
        }
    }

    /**
     * @desc make the cube align XYZ again as does initially
     */
    public rotateToDefault(): void {
        this.enqueue(() => this.animator.rotateCubeToDefault());   
    }
}

export { RotateExecutor };