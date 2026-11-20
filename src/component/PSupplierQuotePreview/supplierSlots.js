/** Quote slots per line item: A is the selected (calculated) supplier, B–E are alternates picked on the RFQ tab. */
export const SUPPLIER_SLOTS = ["A", "B", "C", "D", "E"];
export const ALTERNATE_SLOTS = SUPPLIER_SLOTS.slice(1);

/** "Supplier B", "Supplier B & C", "Supplier B, C & D", "Supplier B, C, D & E" (all four when the count is unknown) */
export const slotsLabel = (count = ALTERNATE_SLOTS.length) => {
    const slots = ALTERNATE_SLOTS.slice(0, Math.max(1, Math.min(ALTERNATE_SLOTS.length, count || ALTERNATE_SLOTS.length)));
    const list = slots.length > 1 ? `${slots.slice(0, -1).join(", ")} & ${slots[slots.length - 1]}` : slots[0];
    return `Supplier ${list}`;
};

/**
 * RFQ groups -> one entry per line item that has a selected Supplier A (items left out of the calculation have
 * none and get no alternates): { key, itemNumber, enquiryDetailsId, title, selected, others, slotCount }.
 * slotCount = how many of B–E can be filled = the other suppliers who quoted, at most four.
 */
export const alternateItems = (requestQuotes = []) =>
    requestQuotes.flatMap((group) => {
        const quotes = (group.items || []).filter((q) => q.supplierId);
        const selected = quotes.find((q) => q.isCalculateId && q.supplierId === q.isCalculateId);
        if (!selected) return [];
        const others = quotes.filter((q) => q.supplierId !== selected.supplierId);
        return [{
            key: selected.itemNumber ?? group.subTitle,
            itemNumber: selected.itemNumber,
            enquiryDetailsId: selected.enquiryDetailsId,
            title: group.subTitle,
            selected,
            others,
            slotCount: Math.min(ALTERNATE_SLOTS.length, others.length),
        }];
    });

/** the most alternates any item can take (0 = nobody to pick anywhere) */
export const maxSlotCount = (items) => items.reduce((max, item) => Math.max(max, item.slotCount), 0);
