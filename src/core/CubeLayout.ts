import { Pos3, Pos4, Slot, Axis } from '../Defs';
import { AbstractCubeLayout } from '../Types';
import { cartesianConcat, cartesianConcatPower, numRange } from '../helpers';
import { WithDimCached } from '../helpers';

const keyOfPos4 = (pos4: Pos4) => pos4.join(',');

class CubeLayout extends AbstractCubeLayout {
    /* DimMixin required */
    static readonly dim: number;
    static initWithDim() {
        this.pos4ToSlotMap_ = new Map(
            cartesianConcat(cartesianConcatPower(3)(numRange(this.dim)), numRange(6))
                .filter( pos4 => AbstractCubeLayout.hasSlotsHelper(pos4.slice(0,3) as Pos3, this.dim) )
                .map( pos4 => {
                    const slot = AbstractCubeLayout.pos4ToSlotHelper(pos4 as Pos4, this.dim);
                    return slot !== null ? [keyOfPos4(pos4 as Pos4), slot] as const : null;
                })
                .filter((ele): ele is [string,Slot] => ele !== null)
        );
        this.allCubiesCache_ = super.allCubiesHelper(this.dim);
    }

    /* a map caching all pos4 and their associated slots */
    private static pos4ToSlotMap_: Map<string, Slot>;

    private static allCubiesCache_: Pos3[];

    /**
     * @desc Convert position to slots basing on isomorphism Slot ≅ Pos4
     * @param Pos4
     *   :x,y,z: location of cubie resides the slot; ( 0 <= x,y,z <= dim-1 )  
     *   :w: +X|-X|+Y|-Y|+Z|-Z normal of a slot; ( 0 <= w <= 5 )
     * @return 
     *   Slot [layer,index], where 0 <= index <= dim * dim - 1
     */
    public static defaultPos4ToSlot(pos: Pos4): Slot | undefined {
        if(!AbstractCubeLayout.hasSlotsHelper(pos, this.dim)) return undefined;
        return this.pos4ToSlotMap_.get(keyOfPos4(pos));
    }

    /**
     * @desc inverse function of `initialPosition2Slot` 
     */
    public static slotToPos4(slot: Slot): Pos4 { 
        const pos4 = AbstractCubeLayout.slotToPos4Helper(slot, this.dim);
        if(!pos4) throw new Error(`invalid slot: ${slot[0]}-${slot[1]}`);
        return pos4;
    }

    public static allCubies(): Pos3[] {
        return this.allCubiesCache_;
    }

    public static sliceCubies(axis: Axis, index: number): Pos3[] {
        return this.allCubiesCache_.filter( pos => this.isInSlice(pos, axis, index) );
    }
}

const makeCubeLayout = <D extends number>(d: D) => WithDimCached(CubeLayout, d);

export { makeCubeLayout };