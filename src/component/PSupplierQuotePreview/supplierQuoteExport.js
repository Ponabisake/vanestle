import { exportToExcel } from "../../utils/commonFunction/common";
import { SUPPLIER_SLOTS } from "./supplierSlots";

const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
};

const itemParts = (title = "") => {
    const match = String(title).match(/^\s*Item\s*(\d+)\s*-\s*(.*)$/i);
    return match ? { no: Number(match[1]), name: match[2] } : { no: "", name: title };
};

/**
 * Preview Supplier Quotes -> Excel: one row per item and chosen supplier (A first, then B–E), amounts as numbers
 * so they can be summed/sorted, the reduction vs the initial quote and the item's lowest quote flagged.
 */
export const exportSupplierQuotes = (groups = [], fileName = "Supplier_Quotes") => {
    const rows = groups.flatMap((group) => (group.items || []).flatMap((row) => {
        const { no, name } = itemParts(group.subTitle);
        const quotes = SUPPLIER_SLOTS
            .map((slot) => ({
                slot,
                supplier: row[`supplier${slot}`],
                initial: toNumber(row[`supplier${slot}InitAmount`]),
                negotiated: toNumber(row[`supplier${slot}NegAmount`]),
            }))
            .filter((q) => q.supplier && String(q.supplier).trim());
        const priced = quotes.map((q) => q.negotiated ?? q.initial).filter((v) => v > 0);
        const lowest = priced.length > 1 ? Math.min(...priced) : null;

        return quotes.map((q) => {
            const reduction = q.initial > 0 && q.negotiated !== null && q.negotiated < q.initial ? q.initial - q.negotiated : null;
            return {
                "Item No": row.itemNumber ?? no,
                "Item Name": name,
                "Slot": q.slot === "A" ? "Supplier A (Selected)" : `Supplier ${q.slot}`,
                "Supplier": q.supplier,
                "Initial Amount": q.initial ?? "",
                "Negotiated Amount": q.negotiated ?? "",
                "Below Initial": reduction ?? "",
                "Below Initial %": reduction !== null ? Number(((reduction / q.initial) * 100).toFixed(1)) : "",
                "Lowest Quote": lowest !== null && (q.negotiated ?? q.initial) === lowest ? "Yes" : "",
            };
        });
    }));
    exportToExcel(rows, fileName);
};
