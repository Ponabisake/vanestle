import React from "react";
import { Box, Tooltip } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { SUPPLIER_SLOTS } from "./supplierSlots";

const ORANGE = "#CF7729";
const NAVY = "#16133F";
const MUTED = "#6B7280";
const GREEN = "#15803D";
const BLUE = "#1D4ED8";

const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
};

const formatAmount = (value, symbol) => {
    const n = toNumber(value);
    if (n === null) return "—";
    const text = n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return symbol ? `${symbol} ${text}` : text;
};

// "Item 1 - dressup_name" -> { no: "1", name: "dressup_name" }
const splitTitle = (title = "") => {
    const match = String(title).match(/^\s*Item\s*(\d+)\s*-\s*(.*)$/i);
    return match ? { no: match[1], name: match[2] } : { no: null, name: title };
};

const quotesOf = (row) =>
    SUPPLIER_SLOTS.map((slot) => {
        const name = row[`supplier${slot}`];
        const initial = toNumber(row[`supplier${slot}InitAmount`]);
        const negotiated = toNumber(row[`supplier${slot}NegAmount`]);
        return { slot, name, initial, negotiated, hasQuote: !!(name && String(name).trim()) };
    });

const tileBase = {
    borderRadius: "10px",
    p: 1.75,
    minHeight: 136,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
};

const amountRowSx = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", columnGap: 1 };
const amountSx = { ml: "auto", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

const slotLabelSx = { fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap" };

// One dashed tile standing in for every slot that has no supplier yet (e.g. "Supplier D, E")
const OpenSlotsTile = ({ slots }) => (
    <Box
        sx={{
            ...tileBase,
            border: "1.5px dashed #D1D5DB",
            background: "#FAFAFA",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            gap: 0.5,
            color: MUTED,
        }}
    >
        <Box sx={slotLabelSx}>Supplier {slots.join(", ")}</Box>
        <Box sx={{ fontSize: 12.5 }}>Not chosen</Box>
    </Box>
);

const QuoteTile = ({ quote, symbol, isLowest }) => {
    const reduction = quote.initial > 0 && quote.negotiated !== null && quote.negotiated < quote.initial
        ? quote.initial - quote.negotiated
        : null;
    const isSelected = quote.slot === "A";

    return (
        <Box
            sx={{
                ...tileBase,
                position: "relative",
                gap: 1,
                // selected supplier = green tile, lowest quote = blue ring + tag (both can apply to one tile)
                background: isSelected ? "#F0FAF3" : "#fff",
                border: `1px solid ${isSelected ? "rgba(21, 128, 61, 0.55)" : isLowest ? "rgba(29, 78, 216, 0.55)" : "#E5E7EB"}`,
                boxShadow: isLowest
                    ? "0 0 0 3px rgba(29, 78, 216, 0.14)"
                    : isSelected ? "0 0 0 3px rgba(21, 128, 61, 0.10)" : "0 1px 2px rgba(16, 24, 40, 0.04)",
            }}
        >
            {isLowest && (
                // tag sitting on the tile's top edge, so it never competes with the slot label for width
                <Tooltip title="Lowest quote for this item">
                    <Box
                        sx={{
                            position: "absolute",
                            top: -10,
                            right: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.4,
                            px: 0.9,
                            height: 20,
                            borderRadius: "999px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#fff",
                            background: BLUE,
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 3px rgba(29, 78, 216, 0.35)",
                        }}
                    >
                        <EmojiEventsOutlinedIcon sx={{ fontSize: 13 }} />
                        Lowest
                    </Box>
                </Tooltip>
            )}

            <Box sx={{ ...slotLabelSx, minHeight: 18, color: isSelected ? GREEN : MUTED, overflow: "hidden", textOverflow: "ellipsis" }}>
                Supplier {quote.slot}{isSelected ? " · Selected" : ""}
            </Box>

            <Tooltip title={quote.name}>
                <Box sx={{ fontSize: 15, fontWeight: 700, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {quote.name}
                </Box>
            </Tooltip>

            <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
                {/* label left, amount right; a long amount wraps under its label (right-aligned) instead of overflowing */}
                <Box sx={amountRowSx}>
                    <Box sx={{ fontSize: 12.5, color: MUTED }}>Initial</Box>
                    <Box sx={{ ...amountSx, fontSize: 13.5, color: "#374151" }}>
                        {formatAmount(quote.initial, symbol)}
                    </Box>
                </Box>
                <Box sx={amountRowSx}>
                    <Box sx={{ fontSize: 12.5, color: MUTED }}>Negotiated</Box>
                    <Box sx={{ ...amountSx, fontSize: 15, fontWeight: 700, color: NAVY }}>
                        {formatAmount(quote.negotiated, symbol)}
                    </Box>
                </Box>
                <Box sx={{ minHeight: 18 }}>
                    {reduction !== null && (
                        <Tooltip title={`${formatAmount(reduction, symbol)} below the initial quote`}>
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 12, color: GREEN, fontWeight: 600 }}>
                                <TrendingDownIcon sx={{ fontSize: 15 }} />
                                {((reduction / quote.initial) * 100).toFixed(1)}% below initial
                            </Box>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

/**
 * Side-by-side comparison of the Supplier A–E quotes per line item.
 * groups     – [{ subTitle: "Item 1 - name", items: [{ supplierA, supplierAInitAmount, supplierANegAmount, ... through supplierE }] }]
 * slotCounts – optional Map itemNumber -> how many of B–E can be filled for that item (other suppliers who quoted);
 *              limits the "Not chosen" placeholder and the "x of y suppliers" count. Unknown items: all four.
 */
const PSupplierQuotePreview = ({ groups = [], symbol = "", slotCounts }) => {
    if (!groups.length) {
        return (
            <Box role="status" sx={{ py: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, textAlign: "center" }}>
                <Box sx={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(207, 119, 41, 0.10)", color: ORANGE }}>
                    <InboxOutlinedIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box sx={{ fontSize: 16, fontWeight: 600, color: NAVY }}>No supplier quotes to preview</Box>
                <Box sx={{ fontSize: 14, color: MUTED }}>Quotes appear here once suppliers have responded to the RFQ.</Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
            {groups.map((group, gIndex) => {
                const { no, name } = splitTitle(group.subTitle);
                return (
                    <Box
                        key={`${group.subTitle}-${gIndex}`}
                        sx={{ borderRadius: "12px", border: "1px solid #EFE3D6", background: "#FFFBF7", overflow: "hidden" }}
                    >
                        {(group.items || []).map((row, rIndex) => {
                            const quotes = quotesOf(row);
                            const chosen = quotes.filter((q) => q.hasQuote);
                            const slotCount = slotCounts?.has(row.itemNumber) ? slotCounts.get(row.itemNumber) : SUPPLIER_SLOTS.length - 1;
                            const possible = SUPPLIER_SLOTS.slice(0, 1 + slotCount);
                            const openSlots = quotes.filter((q) => !q.hasQuote && possible.includes(q.slot)).map((q) => q.slot);
                            const priced = chosen.filter((q) => (q.negotiated ?? q.initial) > 0);
                            const lowest = priced.length > 1 ? Math.min(...priced.map((q) => q.negotiated ?? q.initial)) : null;
                            return (
                                <React.Fragment key={rIndex}>
                                    {rIndex === 0 && (
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, background: "#F6E4D4" }}>
                                            {no && (
                                                <Box
                                                    sx={{
                                                        minWidth: 28,
                                                        height: 28,
                                                        px: 1,
                                                        borderRadius: "8px",
                                                        background: ORANGE,
                                                        color: "#fff",
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    {no}
                                                </Box>
                                            )}
                                            <Box sx={{ flex: 1, fontSize: 16, fontWeight: 700, color: NAVY, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {name}
                                            </Box>
                                            <Box sx={{ fontSize: 12.5, fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>
                                                {chosen.length} of {Math.max(chosen.length, possible.length)} supplier{Math.max(chosen.length, possible.length) === 1 ? "" : "s"}
                                            </Box>
                                        </Box>
                                    )}
                                    <Box
                                        sx={{
                                            p: 2,
                                            display: "grid",
                                            gap: 1.5,
                                            // up to five tiles in one row on the dialog's width; wraps on smaller screens
                                            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                                            borderTop: rIndex ? "1px solid #EFE3D6" : 0,
                                        }}
                                    >
                                        {chosen.map((quote) => (
                                            <QuoteTile
                                                key={quote.slot}
                                                quote={quote}
                                                symbol={symbol}
                                                isLowest={lowest !== null && (quote.negotiated ?? quote.initial) === lowest}
                                            />
                                        ))}
                                        {openSlots.length > 0 && <OpenSlotsTile slots={openSlots} />}
                                    </Box>
                                </React.Fragment>
                            );
                        })}
                    </Box>
                );
            })}
        </Box>
    );
};

export default PSupplierQuotePreview;
