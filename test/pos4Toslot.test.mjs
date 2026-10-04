import { makeCubeView } from "../src/core/CubeView.js";
import { expect, test } from "vitest";


test("test_pos4Toslot", () => {
    const CVType = makeCubeView(3);
    const R1 = CVType.L.defaultPos4ToSlot([2,2,2,0]);
    expect(R1).toEqual(['R',0]);
});