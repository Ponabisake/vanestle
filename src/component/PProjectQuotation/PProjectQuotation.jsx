import React from "react";
import { Skeleton } from "@mui/material";
import { PSectionHeading, PmgColors } from "../PHeadingAccent/PHeadingAccent";
import "./PProjectQuotation.css";

// Display-only formatting: adds thousands separators and pads to 2 decimals,
// but never drops precision the API sent (0.0734 stays 0.0734).
// Non-numeric values (e.g. a size instead of a quantity) are shown as-is.
const NUMERIC = /^-?[\d,]*\.?\d+$/;
const formatAmount = (value, { minDecimals = 2 } = {}) => {
    if (value === null || value === undefined || value === "") return "—";
    const raw = String(value).trim();
    if (!NUMERIC.test(raw)) return raw;
    const clean = raw.replace(/,/g, "");
    const decimals = (clean.split(".")[1] || "").length;
    const n = Number(clean);
    if (!Number.isFinite(n)) return raw;
    return n.toLocaleString("en-US", {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: Math.max(minDecimals, decimals),
    });
};
const formatQty = (value) => formatAmount(value, { minDecimals: 0 });

// "Item 1 - Business_name" / "ITEM 1 : Business_name" -> { no: "1", name: "Business_name" }
const splitItemName = (itemName = "") => {
    const m = String(itemName).match(/^\s*item\s*(\d+)\s*[-:–]\s*(.*)$/i);
    return m ? { no: m[1], name: m[2] } : { no: null, name: itemName };
};

/**
 * Client-facing "Project Quotations" view.
 *  items  : [{ itemName, quoteQtyOrSize, unitPrice, euroUnitPrice, itemSellPriceDis, euroRatePrice }]
 *  totals : { itemSubtotal, euroItemSubtotal, tax, euroTax, total, euroTotal }
 */
export default function PProjectQuotation({
    title,
    subtitle,
    items = [],
    totals = {},
    symbol = "$",
    altSymbol = "₣",
    loading = false,
}) {
    const rows = Array.isArray(items) ? items : [];
    const t = totals && !Array.isArray(totals) ? totals : {};

    const summary = [
        { label: "Item subtotal", value: t.itemSubtotal, alt: t.euroItemSubtotal },
        { label: "Tax amount", value: t.tax, alt: t.euroTax },
    ];

    return (
        <section className="pq">
            {/* Header: title on the left, headline total on the right */}
            <header className="pq-head">
                <div>
                    <PSectionHeading accent={PmgColors.orange} label={title} />
                    {subtitle && <p className="pq-subtitle">{subtitle}</p>}
                </div>
                <div className="pq-hero" aria-label="Total quote value">
                    <span className="pq-hero-label">Total quote value</span>
                    {loading ? (
                        <Skeleton variant="text" width={160} height={40} />
                    ) : (
                        <>
                            <span className="pq-hero-value">
                                <span className="pq-cur">{symbol}</span>{formatAmount(t.total)}
                            </span>
                            <span className="pq-hero-alt">
                                {altSymbol} {formatAmount(t.euroTotal)}
                            </span>
                        </>
                    )}
                </div>
            </header>

            {/* Line items */}
            <div className="pq-table-wrap">
                <table className="pq-table">
                    <thead>
                        <tr className="pq-group-row">
                            <th rowSpan={2} className="pq-th-item">Item</th>
                            <th rowSpan={2} className="pq-num">Quantity</th>
                            <th colSpan={2} className="pq-group">Unit price</th>
                            <th colSpan={2} className="pq-group">Total price</th>
                        </tr>
                        <tr className="pq-cur-row">
                            <th className="pq-num">{symbol}</th>
                            <th className="pq-num pq-alt-col">{altSymbol}</th>
                            <th className="pq-num">{symbol}</th>
                            <th className="pq-num pq-alt-col">{altSymbol}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading &&
                            [0, 1].map((i) => (
                                <tr key={`sk-${i}`}>
                                    {Array.from({ length: 6 }).map((_, c) => (
                                        <td key={c}><Skeleton variant="text" /></td>
                                    ))}
                                </tr>
                            ))}

                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="pq-empty">No quotation available yet.</td>
                            </tr>
                        )}

                        {!loading &&
                            rows.map((row, i) => {
                                const { no, name } = splitItemName(row.itemName);
                                return (
                                    <tr key={row.id ?? i}>
                                        <td className="pq-item">
                                            <span className="pq-badge">{no ?? i + 1}</span>
                                            <span className="pq-item-text">
                                                <span className="pq-item-kicker">Item {no ?? i + 1}</span>
                                                <span className="pq-item-name">{name || "—"}</span>
                                            </span>
                                        </td>
                                        <td className="pq-num">{formatQty(row.quoteQtyOrSize)}</td>
                                        <td className="pq-num">{formatAmount(row.unitPrice)}</td>
                                        <td className="pq-num pq-alt-col">{formatAmount(row.euroUnitPrice)}</td>
                                        <td className="pq-num pq-strong">{formatAmount(row.itemSellPriceDis)}</td>
                                        <td className="pq-num pq-alt-col">{formatAmount(row.euroRatePrice)}</td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="pq-foot">
                <p className="pq-note">
                    {rows.length > 0 && !loading && (
                        <>{rows.length} {rows.length === 1 ? "item" : "items"} quoted · prices in {symbol} with {altSymbol} equivalent</>
                    )}
                </p>

                <div className="pq-totals">
                    <div className="pq-totals-head">
                        <span />
                        <span>{symbol}</span>
                        <span>{altSymbol}</span>
                    </div>
                    {summary.map((s) => (
                        <div className="pq-totals-row" key={s.label}>
                            <span>{s.label}</span>
                            <span className="pq-num">{loading ? <Skeleton width={60} /> : formatAmount(s.value)}</span>
                            <span className="pq-num pq-alt-col">{loading ? <Skeleton width={50} /> : formatAmount(s.alt)}</span>
                        </div>
                    ))}
                    <div className="pq-totals-row pq-grand">
                        <span>Total</span>
                        <span className="pq-num">{loading ? <Skeleton width={70} /> : formatAmount(t.total)}</span>
                        <span className="pq-num">{loading ? <Skeleton width={60} /> : formatAmount(t.euroTotal)}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
