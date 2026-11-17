import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupSphItems, normalizeGroupName } from "./sph-item-grouping";

describe("normalizeGroupName", () => {
  it("returns null for blank or whitespace", () => {
    assert.equal(normalizeGroupName(null), null);
    assert.equal(normalizeGroupName(""), null);
    assert.equal(normalizeGroupName("   "), null);
  });

  it("trims and caps length at 100", () => {
    assert.equal(normalizeGroupName("  SKK  "), "SKK");
    const long = "x".repeat(120);
    assert.equal(normalizeGroupName(long)?.length, 100);
  });
});

describe("groupSphItems", () => {
  it("keeps all-ungrouped flat with no groups", () => {
    const items = [
      { id: "1", groupName: null, quantity: 1, unitPrice: 10 },
      { id: "2", groupName: "  ", quantity: 2, unitPrice: 5 },
    ];
    const result = groupSphItems(items);
    assert.deepEqual(
      result.ungrouped.map((i) => i.id),
      ["1", "2"],
    );
    assert.equal(result.groups.length, 0);
  });

  it("puts ungrouped first and groups by first appearance", () => {
    const items = [
      { id: "a", groupName: "Manufacturing", quantity: 1, unitPrice: 100 },
      { id: "b", groupName: null, quantity: 1, unitPrice: 50 },
      { id: "c", groupName: "SKK", quantity: 2, unitPrice: 10 },
      { id: "d", groupName: "Manufacturing", quantity: 1, unitPrice: 20 },
    ];
    const result = groupSphItems(items);
    assert.deepEqual(
      result.ungrouped.map((i) => i.id),
      ["b"],
    );
    assert.deepEqual(
      result.groups.map((g) => g.name),
      ["Manufacturing", "SKK"],
    );
    assert.deepEqual(
      result.groups[0].items.map((i) => i.id),
      ["a", "d"],
    );
    assert.equal(result.groups[0].subtotal, 120);
    assert.equal(result.groups[1].subtotal, 20);
  });

  it("treats SKK and skk as different groups", () => {
    const result = groupSphItems([
      { groupName: "SKK", quantity: 1, unitPrice: 1 },
      { groupName: "skk", quantity: 1, unitPrice: 1 },
    ]);
    assert.deepEqual(
      result.groups.map((g) => g.name),
      ["SKK", "skk"],
    );
  });
});
