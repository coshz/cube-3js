import { MoveExt, Layer } from "../Defs";

/**
 * @desc Serialize / deserialize moves
 * @example
 *  - `[Ux1,Rx2,Fx3]` <=> `U R2 F'`
 */
class MoveSerializer {
    static deserialize(input: string): MoveExt[] | null {
        let result: MoveExt[] = [];
        const validLayers = new Set("URFDLBurfdlbMSEXYZ".split(""))
        for(const ch of input) {
            switch(ch) {
                case "2": 
                    result.push(`${result.pop()?.at(0)}x2` as MoveExt); break;
                case "3":
                case "'": 
                    result.push(`${result.pop()?.at(0)}x3` as MoveExt); break;
                default:
                    if(ch === " ") continue;
                    if(!validLayers.has(ch)) return null; 
                    result.push(`${ch}x1` as MoveExt);
            }
        }
        return result;
    }

    static serialize(moves: MoveExt[]): string {
        return moves.map(move => {
            switch (move[2]) {
                case '1': return move[0];
                case '2': return move[0] + "2";
                case '3': return move[0] + "'";
            }
        }).join(' ');
    }
}

/**
 * @desc Serialize / deserialize color configuration
 * @example
 *  - `[U,U,U,U,U,U,U,U,U,R,R,R,R,R,R,R,R,R,F,F,F,F,F,F,F,F,F,D,D,D,D,D,D,D,D,D,L,L,L,L,L,L,L,L,L,B,B,B,B,B,B,B,B,B]` <=> `UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB`
 */
class ColorSerializer {
    static deserialize(color: string): Layer[] {
        return color.split('') as Layer[];
    }

    static serialize(color: Layer[]): string {
        return color.join('');
    }
}

export { MoveSerializer, ColorSerializer };