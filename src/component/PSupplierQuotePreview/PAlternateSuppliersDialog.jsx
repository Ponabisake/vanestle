import React, { useMemo, useState } from "react";
import { Box, Alert } from "@mui/material";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import PDialog from "../PDialog/PDialog";
import PDropdown from "../PDropdown/PDropdown";
import PButton from "../PButton/PButton";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { PostApi } from "../../utils/api/networking";
import { ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { ALTERNATE_SLOTS, alternateItems, maxSlotCount, slotsLabel } from "./supplierSlots";

const ORANGE = "#CF7729";
const NAVY = "#16133F";
const MUTED = "#6B7280";

const emptySlots = () => Object.fromEntries(ALTERNATE_SLOTS.map((slot) => [slot, ""]));
const quoteValue = (q) => Number(q.negQuote) > 0 ? Number(q.negQuote) : Number(q.initialQuote) || Number.MAX_VALUE;

/**
 * Choose the alternate suppliers B–E for every line item in one go (they feed Preview Supplier Quotes).
 *
 * requestQuotes  – RFQ groups [{ subTitle, items: [{ itemNumber, enquiryDetailsId, supplierId, supplierName,
 *                  initialQuote, negQuote, isCalculateId }] }]; the item with supplierId === isCalculateId is Supplier A
 * previewQuotes  – Preview groups [{ items: [{ id, itemNumber, supplierB … supplierE }] }]: what is saved now (pre-fills)
 * requiredIds    – Set of enquiryDetailsIds whose savings reason needs at least Supplier B (marked + checked on save)
 * skippable      – opened right after Calculate Project Savings: shows "Skip" instead of "Cancel"
 * onSaved / onSkip / onClose
 */
// mounted only while open, so every opening starts from what is saved now
const PAlternateSuppliersDialog = (props) => (props.open ? <AlternateSuppliersBody {...props} /> : null);

const AlternateSuppliersBody = ({ requestQuotes = [], previewQuotes = [], requiredIds = new Set(), skippable = false, onSaved, onSkip, onClose }) => {
    // one entry per line item with a selected Supplier A (items left out of the calculation are not shown or saved):
    // who is A, who else quoted, what is saved for B–E
    const items = useMemo(() => {
        const saved = new Map(previewQuotes.flatMap((g) => g.items || []).map((row) => [row.itemNumber, row]));
        return alternateItems(requestQuotes).map((item) => ({ ...item, saved: saved.get(item.itemNumber) || {} }));
    }, [requestQuotes, previewQuotes]);
    const label = slotsLabel(maxSlotCount(items));

    // { [itemKey]: { B: supplierId, C, D, E } } – starts from the saved choices: stored supplier names matched to this item's quotes
    const [picks, setPicks] = useState(() => Object.fromEntries(items.map((item) => {
        const slots = emptySlots();
        ALTERNATE_SLOTS.forEach((slot) => {
            const name = item.saved[`supplier${slot}`];
            const match = name && item.others.find((q) => q.supplierName === name);
            if (match && !Object.values(slots).includes(match.supplierId)) slots[slot] = match.supplierId;
        });
        return [item.key, slots];
    })));
    const [saving, setSaving] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    const setSlot = (itemKey, slot, value) =>
        setPicks((prev) => ({ ...prev, [itemKey]: { ...(prev[itemKey] || emptySlots()), [slot]: value ?? "" } }));

    // fill every empty slot with the next-lowest quotes not already used (the legacy automatic B/C choice)
    const autoFill = () =>
        setPicks((prev) => {
            const next = { ...prev };
            items.forEach((item) => {
                const slots = { ...(prev[item.key] || emptySlots()) };
                const used = new Set(Object.values(slots).filter(Boolean));
                const pool = [...item.others].sort((a, b) => quoteValue(a) - quoteValue(b)).filter((q) => !used.has(q.supplierId));
                ALTERNATE_SLOTS.forEach((slot) => {
                    if (!slots[slot] && pool.length) slots[slot] = pool.shift().supplierId;
                });
                next[item.key] = slots;
            });
            return next;
        });

    const hasAlternate = (item) => Object.values(picks[item.key] || {}).some(Boolean);
    const missingRequired = items.filter((item) => requiredIds.has(item.enquiryDetailsId) && item.slotCount > 0 && !hasAlternate(item));

    const handleSave = async () => {
        if (missingRequired.length) {
            setShowErrors(true);
            return;
        }
        // only items whose choice changed are written (SupplierB… SupplierE; "" clears a slot)
        const payloads = items.flatMap((item) => {
            const slots = picks[item.key] || emptySlots();
            const payload = { Id: item.enquiryDetailsId };
            let changed = false;
            ALTERNATE_SLOTS.forEach((slot) => {
                const quote = item.others.find((q) => q.supplierId === slots[slot]);
                const name = quote?.supplierName || "";
                if (name !== (item.saved[`supplier${slot}`] || "")) changed = true;
                payload[`Supplier${slot}`] = name;
                payload[`Supplier${slot}NegAmount`] = quote?.negQuote?.toString() || "";
                payload[`Supplier${slot}InitAmount`] = quote?.initialQuote?.toString() || "";
            });
            return changed && item.enquiryDetailsId ? [payload] : [];
        });

        if (!payloads.length) {
            onSaved?.(false);
            return;
        }
        setSaving(true);
        try {
            const results = await Promise.all(payloads.map((p) => PostApi(ProjectEnquiry_API.UpdatePreviewQuotes, p)));
            const failed = results.filter((r) => !isSuccess(r)).length;
            if (failed) {
                toast(Labels.status.failure, `${failed} of ${results.length} items could not be saved. Please try again.`);
                return;
            }
            toast(Labels.status.success, `${label} saved`);
            onSaved?.(true);
        } catch {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setSaving(false);
        }
    };

    const canAutoFill = items.some((item) => {
        const slots = picks[item.key] || {};
        const used = Object.values(slots).filter(Boolean).length;
        return used < item.slotCount;
    });

    return (
        <PDialog
            open
            onClose={saving ? undefined : onClose}
            title={`Choose ${label}`}
            showCloseIcon={!saving}
            maxWidth="md"
            actions={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5 }}>
                    <PButton
                        label={skippable ? "Skip" : "Cancel"}
                        variant="outlined"
                        color={CommonColors.grey.main}
                        onClick={skippable ? onSkip : onClose}
                        disabled={saving}
                        width={140}
                    />
                    <PButton
                        label={skippable ? "Save & continue" : "Save"}
                        variant={Labels.contained}
                        color={CommonColors.dark_blue}
                        onClick={handleSave}
                        loading={saving}
                        width={250}
                        startIcon={<img src={arrow} alt="arrow" className="icon" />}
                    />
                </Box>
            }
        >
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <Box sx={{ fontSize: 14, color: MUTED, maxWidth: 520, lineHeight: 1.5 }}>
                    Pick alternate quotes per item to compare with the selected supplier (A) in Preview Supplier Quotes. Only items selected in the calculation are listed.
                    {skippable && " You can skip this and choose them later from the RFQ tab."}
                </Box>
                <PButton
                    label="Auto-fill lowest quotes"
                    variant="text"
                    color={ORANGE}
                    onClick={autoFill}
                    disabled={!canAutoFill || saving}
                    startIcon={<AutoFixHighOutlinedIcon fontSize="small" />}
                    sx={{ padding: "6px 10px", color: `${ORANGE} !important`, "&:hover": { background: "rgba(207,119,41,0.08)" } }}
                />
            </Box>

            {showErrors && missingRequired.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Cost Avoidance savings need at least one alternate supplier for: {missingRequired.map((i) => i.title).join(", ")}.
                </Alert>
            )}

            {items.length === 0 && (
                <Box sx={{ py: 3, textAlign: "center", fontSize: 14, color: MUTED }}>
                    No items were selected in the calculation, so there is no Supplier A to compare with.
                </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((item) => {
                    const slots = picks[item.key] || emptySlots();
                    const required = requiredIds.has(item.enquiryDetailsId);
                    const invalid = showErrors && missingRequired.includes(item);
                    // never more dropdowns than suppliers who quoted
                    const openSlots = ALTERNATE_SLOTS.slice(0, item.slotCount);
                    const optionsFor = (slot) => item.others
                        .filter((q) => !openSlots.some((other) => other !== slot && slots[other] === q.supplierId))
                        .map((q) => ({ value: q.supplierId, label: q.supplierName }));
                    return (
                        <Box
                            key={item.key}
                            sx={{ borderRadius: "12px", border: `1px solid ${invalid ? "#F87171" : "#EFE3D6"}`, background: "#FFFBF7", overflow: "hidden" }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, background: "#F6E4D4", flexWrap: "wrap" }}>
                                <Box sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {item.title}
                                </Box>
                                {required && (
                                    <Box sx={{ fontSize: 11.5, fontWeight: 700, color: "#B45309", background: "rgba(245,158,11,0.15)", px: 1, py: 0.25, borderRadius: "999px", whiteSpace: "nowrap" }}>
                                        Required · Cost Avoidance
                                    </Box>
                                )}
                                <Box sx={{ fontSize: 12.5, color: MUTED, whiteSpace: "nowrap" }}>
                                    Supplier A: <b style={{ color: ORANGE }}>{item.selected.supplierName}</b>
                                </Box>
                            </Box>
                            <Box sx={{ p: 2 }}>
                                {openSlots.length === 0 ? (
                                    <Box sx={{ fontSize: 13.5, color: MUTED }}>No other supplier quoted for this item.</Box>
                                ) : (
                                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
                                        {openSlots.map((slot) => (
                                            // PDropdown renders label + field as siblings: keep them in one grid cell
                                            <Box key={slot} sx={{ minWidth: 0 }}>
                                                <PDropdown
                                                    name={`supplier${slot}`}
                                                    label={`Supplier ${slot}`}
                                                    value={slots[slot]}
                                                    onChange={(e) => setSlot(item.key, slot, e.target.value)}
                                                    options={optionsFor(slot)}
                                                    flag={Labels.flag.auto}
                                                    width={100}
                                                    clearable
                                                    readOnly={saving}
                                                />
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </PDialog>
    );
};

export default PAlternateSuppliersDialog;
