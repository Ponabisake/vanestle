import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Paper, TableContainer, Box, Checkbox, Tooltip, Skeleton, IconButton, Badge } from "@mui/material";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import PColumnChooser from "../PColumnChooser/PColumnChooser";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import PDropdown from "../PDropdown/PDropdown";
import PGrid from "../PGrid/PGrid";
import PButton from "../PButton/PButton";
import PDialog from "../PDialog/PDialog";
import { useLanguage } from "../../utils/constants/language";
import PTypography from "../PTypography/PTypography";
import { FontWeight } from "../../utils/constants/fonts";
import { PostApi } from "../../utils/api/networking";
import { ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import arrow from "../../utils/assets/images/arrow_white.svg";

/** Tables with at least this many hideable columns get the column chooser automatically. */
export const COLUMN_CHOOSER_MIN_COLUMNS = 8;
const COLUMN_STORAGE_PREFIX = "ptable.columns.";

const readColumnPrefs = (key) => {
  if (!key) return {};
  try {
    return JSON.parse(localStorage.getItem(COLUMN_STORAGE_PREFIX + key)) || {};
  } catch {
    return {};
  }
};

const writeColumnPrefs = (key, prefs) => {
  if (!key) return;
  try {
    if (Object.keys(prefs).length) localStorage.setItem(COLUMN_STORAGE_PREFIX + key, JSON.stringify(prefs));
    else localStorage.removeItem(COLUMN_STORAGE_PREFIX + key);
  } catch {
    /* storage unavailable – selection just won't persist */
  }
};

/**
 * Column options (besides field / header / render / type / align / rowSpan):
 *   key           – stable id for the column chooser (defaults to field, then header)
 *   hideable      – false keeps the column always visible
 *   defaultHidden – true hides the column until the user turns it on
 *
 * columnChooser – true / false forces the chooser on / off; omitted = auto (>= COLUMN_CHOOSER_MIN_COLUMNS columns)
 * storageKey    – remember the user's column selection in localStorage under this key
 * emptyTitle / emptyMessage / emptyIcon – what to show when there are no rows (while `loading`,
 *                 placeholder rows are shown instead)
 */
const PTable = ({ columns, rows, onClick, isChecked = false, showCheckbox = false, onValidationChange, selectedRows = [], disabled = false, showHeader = true, showPagination = true, loading = false, columnChooser, storageKey,
  emptyTitle = "No records to show", emptyMessage = "There's nothing here yet. Records will appear here once they're added.", emptyIcon }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [colPrefs, setColPrefs] = useState(() => readColumnPrefs(storageKey));
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

  // stable, unique id per column
  const colIds = useMemo(() => {
    const seen = new Set();
    return (columns || []).map((col, i) => {
      let id = String(col.key ?? col.field ?? (typeof col.header === "string" ? col.header : `col${i}`));
      if (seen.has(id)) id = `${id}#${i}`;
      seen.add(id);
      return id;
    });
  }, [columns]);

  const isHideable = (col) => col.hideable !== false;
  const hideableCount = (columns || []).filter(isHideable).length;
  const chooserEnabled = showHeader && hideableCount > 1 && (columnChooser ?? hideableCount >= COLUMN_CHOOSER_MIN_COLUMNS);
  const isColVisible = (col, id) => !chooserEnabled || !isHideable(col) || (colPrefs[id] ?? !col.defaultHidden);

  const visibleColumns = (() => {
    const list = (columns || []).filter((col, i) => isColVisible(col, colIds[i]));
    return list.length ? list : columns || [];
  })();
  const hiddenCount = (columns || []).length - visibleColumns.length;
  const totalCols = visibleColumns.length + (chooserEnabled ? 1 : 0);

  const updateColPrefs = (next) => {
    setColPrefs(next);
    writeColumnPrefs(storageKey, next);
  };

  const toggleColumn = (id) => {
    const index = colIds.indexOf(id);
    const col = columns[index];
    if (!col || !isHideable(col)) return;
    const visibleNow = isColVisible(col, id);
    if (visibleNow && visibleColumns.length <= 1) return; // keep at least one column
    const next = { ...colPrefs };
    if (!visibleNow === !col.defaultHidden) delete next[id]; // back to its default
    else next[id] = !visibleNow;
    updateColPrefs(next);
  };

  const chooserOptions = (columns || []).map((col, i) => {
    const visible = isColVisible(col, colIds[i]);
    return {
      id: colIds[i],
      label: typeof col.header === "string" && col.header ? col.header : col.label || col.field || `Column ${i + 1}`,
      checked: visible,
      disabled: !isHideable(col) || (visible && visibleColumns.length <= 1),
    };
  });
  const { getLabel } = useLanguage();
  const [formData, setFormData] = useState({
    open: false,
    itemNumber: null,
    supplierB: "",
    supplierC: "",
    suppliers: [],
    selectedSuppliers: {},
    item: [],
  });

  // Parent Select All
  const handleRowSelect = (row) => {
    let update;
    if (row.itemNumber) {
      const isSame = selectedRows.some(item => item.itemNumber === row.itemNumber && item.supplierId === row.supplierId);
      const filtered = selectedRows.filter(item => item.itemNumber !== row.itemNumber);
      update = isSame ? filtered : [...filtered, row];
    } else {
      const exists = selectedRows.some(item => item.supplierId === row.supplierId);
      update = exists
        ? selectedRows.filter(item => item.supplierId !== row.supplierId)
        : [...selectedRows, { supplierId: row.supplierId, suppliername: row.suppliername }];
    }
    onValidationChange?.(update);
  };

  const isSelected = (data) => {
    if (data.itemNumber) {
      return selectedRows.some(item => item.itemNumber === data.itemNumber && item.supplierId === data.supplierId);
    }
    return selectedRows.some(item => item.supplierId === data.supplierId);
  };

  // Show only selected rows when global checkbox checked
  const filteredRows = isChecked ? rows.filter(row => selectedRows.some(sel => sel.supplierId === row.supplierId)) : (Array.isArray(rows) ? rows : []);

  const renderText = (value, type, ishide = false) => {
    let text = ishide && Number(value) === 0 ? "" : value == null ? "" : String(value);

    if (type === "rupee" && value != null && value !== 0) {
      text = Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    if (type === "percentage") {
      text = `${Number(value).toFixed(2)}%`;
    }

    return text.length > 30 ? <Tooltip title={text}><span>{text.length > 30 ? `${text.slice(0, 30)}...` : text}</span></Tooltip> : <span>{text}</span>;
  };

  // handle supplierBc 

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  const handleSubmit = async () => {
    const items = formData.item || [];
    const supplierB = items.find((x) => x.supplierId === formData?.supplierB);
    const supplierC = items.find((x) => x.supplierId === formData?.supplierC);

    const payload = {
      Id: items?.[0]?.enquiryDetailsId,
      SupplierB: supplierB?.supplierName || "",
      SupplierBNegAmount: supplierB?.negQuote?.toString() || "",
      SupplierBInitAmount: supplierB?.initialQuote?.toString() || "",
      SupplierC: supplierC?.supplierName || "",
      SupplierCNegAmount: supplierC?.negQuote?.toString() || "",
      SupplierCInitAmount: supplierC?.initialQuote?.toString() || "",
    };
    try {
      const response = await PostApi(ProjectEnquiry_API.UpdatePreviewQuotes, payload);
      if (isSuccess(response)) {
        toast(Labels.status.success, response.data);
        setFormData((prev) => ({
          ...prev,
          open: false,
        }));
      }
    } catch (error) {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
    }
  }
  const handleSupplierBC = (group) => {
    const itemNumber = group.items?.[0]?.itemNumber;
    if (!itemNumber) return;
    const items = group.items || [];
    // All suppliers for this item
    const allSuppliers = [...new Map(items.filter((x) => x.supplierId && x.supplierName).map((x) => [
      x.supplierId, { value: x.supplierId, label: x.supplierName, },])).values(),
    ];

    // Existing selected supplier
    // supplierId === isCalculateId
    const existingSupplier = items.find((x) => x.supplierId === x.isCalculateId);
    const existingSupplierId = existingSupplier?.supplierId || null;
    const selectedForItem = formData.selectedSuppliers?.[itemNumber] || [];

    // Existing API-selected supplier + manually selected suppliers
    const excludedSupplierIds = [existingSupplierId, ...selectedForItem
      .map((x) => typeof x === "object" ? x.supplierId : x),
    ].filter(Boolean);

    const availableSuppliers = allSuppliers.filter((supplier) => !excludedSupplierIds.includes(supplier.value));
    const availableSupplierIds = availableSuppliers.map((supplier) => supplier.value);
    const availableItems = items.filter((item) => availableSupplierIds.includes(item.supplierId));

    setFormData((prev) => ({
      ...prev,
      open: true,
      itemNumber,
      supplierB: "",
      supplierC: "",
      suppliers: availableSuppliers,
      item: availableItems,
    }));
  };
  const renderCell = (col, data, rowIndex, meta = {}) => {
    const content = loading ? (
      <Skeleton variant="text" width="80%" height={24} />
    ) : (
      col.render ? col.render(data, rowIndex) : renderText(data[col.field], col.type, col.ishide)
    );
    if (showCheckbox && meta.isFirstCol) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Checkbox
            size="small"
            checked={disabled ? false : isSelected(data)}
            onChange={() => handleRowSelect(data)}
            disabled={disabled || loading}
          />
          {content}
        </Box>
      );
    }
    return content;
  };

  // empty trailing body cell that lines up with the column-chooser header cell
  const chooserSpacer = chooserEnabled ? <TableCell sx={{ border: 0, width: 56, p: 0 }} /> : null;

  const renderRow = (row, index) => (
    <TableRow
      key={row.supplierID ?? index}
      onClick={() => onClick?.(row)}
      sx={{
        cursor: onClick ? "pointer" : "default",
        "&:hover": { backgroundColor: "#F4F6FA" },
        backgroundColor: row.bgcolor ? row.bgcolor : index % 2 ? "#F4F6FA": "#fff"
      }}
    >
      {visibleColumns.map((col, i) => (
        <TableCell
          align={col.align || "left"}
          key={i}
          sx={{
            fontSize: Labels.fontSize.sm,
            color: CommonColors.pTable.darkGrey,
            py: 1.8,
            whiteSpace: "nowrap",
            cursor: "pointer",
            border: "0",
            fontWeight: row.type === Labels.flag.total ? "bold" : "normal",
          }}
        >
          {renderCell(col, row, index, { isFirstCol: i === 0 })}
        </TableCell>
      ))}
      {chooserSpacer}
    </TableRow>
  );

  const renderGroup = (group, index) => (
    <React.Fragment key={`group-${index}`}>
      <TableRow>
        <TableCell
          colSpan={totalCols}
          sx={{
            background: "#F6E4D4",
            fontWeight: 700,
            fontSize: "16px",
            border: "0"
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>
              {group.subTitle}
            </span>

            {group.supplierLink && (
              <a
                onClick={() => handleSupplierBC(group)}
                style={{
                  cursor: "pointer",
                  fontSize: "14px",
                  color: CommonColors.blue.main,
                }}
              >
                Supplier B & C
              </a>
            )}
          </div>
        </TableCell>
      </TableRow>
      {group.items?.map((item, i) => (
        <TableRow
          key={`item-${index}-${i}`}
          onClick={() => onClick?.(item)}
          sx={{
            cursor: onClick ? "pointer" : "default",
            backgroundColor: item.isCalculateId && item.supplierId === item.isCalculateId ? "#E9E9F1" : i % 2 ? "#F4F6FA" : "#fff",
          }}
        >
          {visibleColumns.map((col, cIndex) => {
            if (col.rowSpan && i !== 0) return null;
            return (
              <TableCell key={cIndex} rowSpan={col.rowSpan ? group.items.length : 1}
                align={col.align || "left"}
                sx={{
                  fontSize: Labels.fontSize.sm, py: 1.8,
                  verticalAlign: "middle", borderLeft: col.rowSpan ? "1px solid #e5e7eb" : "",
                  backgroundColor: col.rowSpan ? "#fff" : "",
                  fontWeight: !col.rowSpan && item.isCalculateId && item.supplierId === item.isCalculateId ? "bold" : "normal",
                  whiteSpace: "nowrap",
                  border: 0
                }}
              >
                {renderCell(col, item, item.rowId, { isFirstCol: cIndex === 0 })}
              </TableCell>
            );
          })}
          {chooserSpacer}
        </TableRow>
      ))}
    </React.Fragment>
  );

  // a filter can shrink the rows below the current page: show the last page that still has rows
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filteredRows.length / rowsPerPage) - 1));
  const paginatedRows = filteredRows.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);
  const supplierB = formData.supplierB;
  const supplierC = formData.supplierC;
  return (
    <>
      <Paper elevation={0} sx={{ mt: 3, borderRadius: "6px", overflow: "hidden" }}>
        <TableContainer
          sx={{
            overflowX: "auto",
            "&::-webkit-scrollbar": {
              height: "8px",
            },

            "&::-webkit-scrollbar-track": {
              background: "#f1f1f1",
              borderRadius: "10px",
            },

            "&::-webkit-scrollbar-thumb": {
              background: "#e1e1e1",
              borderRadius: "10px",
            },

            "&::-webkit-scrollbar-thumb:hover": {
              background: "#ddd",
            },
          }}
        >
          <Table>
            {/* HEADER */}
            {showHeader && (
              <TableHead>
                <TableRow sx={{ background: "#CF7729" }}>
                  {visibleColumns.map((col, i) => (
                    <TableCell key={i} align={col.align || "left"} sx={{ fontWeight: 700, fontSize: Labels.fontSize.sm, color: CommonColors.white, py: 2, textWrap: Labels.rap.nowrap }}>
                      {col.header}
                    </TableCell>
                  ))}
                  {chooserEnabled && (
                    <TableCell
                      align="center"
                      sx={{
                        position: "sticky",
                        right: 0,
                        zIndex: 2,
                        width: 56,
                        px: 1,
                        py: 1,
                        background: "#CF7729",
                        boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.35)",
                      }}
                    >
                      <Tooltip title={hiddenCount ? `Choose columns (${hiddenCount} hidden)` : "Choose columns"}>
                        <IconButton
                          size="small"
                          aria-label="Choose columns"
                          onClick={(e) => { e.stopPropagation(); setColMenuAnchor(e.currentTarget); }}
                          sx={{
                            width: 34,
                            height: 34,
                            color: colMenuAnchor ? CommonColors.white : "#CF7729",
                            backgroundColor: colMenuAnchor ? "#2D2F75" : CommonColors.white,
                            border: "2px solid #fff",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                            transition: "background-color .15s, color .15s, transform .15s",
                            "&:hover": { backgroundColor: "#2D2F75", color: CommonColors.white, transform: "scale(1.08)" },
                          }}
                        >
                          <Badge
                            badgeContent={hiddenCount}
                            invisible={!hiddenCount}
                            sx={{ "& .MuiBadge-badge": { backgroundColor: "#2D2F75", color: "#fff", border: "1.5px solid #fff", fontSize: 10, height: 18, minWidth: 18, top: -8, right: -8 } }}
                          >
                            <ViewColumnOutlinedIcon sx={{ fontSize: 20 }} />
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
            )}

            {/* BODY */}
            <TableBody>
              {paginatedRows.length === 0 && loading ? (
                // still loading: placeholder rows instead of an "empty" message
                [0, 1, 2].map((r) => (
                  <TableRow key={`sk-${r}`} sx={{ backgroundColor: r % 2 ? "#F4F6FA" : "#fff" }}>
                    {visibleColumns.map((col, i) => (
                      <TableCell key={i} sx={{ border: 0, py: 1.8 }}>
                        <Skeleton variant="text" width={`${60 + ((r + i) % 3) * 12}%`} height={22} />
                      </TableCell>
                    ))}
                    {chooserSpacer}
                  </TableRow>
                ))
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalCols} align="center" sx={{ py: 4.5, border: 0 }}>
                    <Box role="status" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 0.75,
                          background: "rgba(207, 119, 41, 0.10)",
                          color: "#CF7729",
                          boxShadow: "inset 0 0 0 1px rgba(207, 119, 41, 0.18)",
                        }}
                      >
                        {emptyIcon || <InboxOutlinedIcon sx={{ fontSize: 28 }} />}
                      </Box>
                      <Box sx={{ fontSize: "16px", fontWeight: 600, color: "#16133F" }}>
                        {emptyTitle}
                      </Box>
                      {emptyMessage && (
                        <Box sx={{ fontSize: "14px", color: "#6B7280", maxWidth: 420, lineHeight: 1.5 }}>
                          {emptyMessage}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, i) => row.isSubTitle ? renderGroup(row, i) : renderRow(row, i))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}
        {showPagination && paginatedRows.length > 0 && (
          <Box>
            <TablePagination
              component="div"
              count={filteredRows.length}
              page={currentPage}
              rowsPerPage={rowsPerPage}
              onPageChange={(e, p) => setPage(p)}
              slots={{
                popupIndicator: KeyboardArrowDownOutlinedIcon,
              }}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderTop: "1px solid #C6C7C8",
                ".MuiTablePagination-toolbar": {
                  px: 2,
                  justifyContent: "flex-end",
                  alignItems: "center",
                  minHeight: "48px",
                },
                ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                  fontSize: "16px",
                  color: "#000000",
                  mb: 0,
                  mt: 0,
                },
                ".MuiTablePagination-select": {
                  paddingTop: "0px",
                  paddingBottom: "0px",
                },
                ".MuiTablePagination-actions": {
                  marginLeft: "8px",
                  display: "flex",
                  alignItems: "center",
                },
              }}
            />
          </Box>
        )}
      </Paper>

      {chooserEnabled && (
        <PColumnChooser
          anchorEl={colMenuAnchor}
          onClose={() => setColMenuAnchor(null)}
          options={chooserOptions}
          onToggle={toggleColumn}
          onReset={Object.keys(colPrefs).length ? () => updateColPrefs({}) : undefined}
        />
      )}

      <PDialog
        open={formData.open}
        onClose={() => setFormData((prev) => ({
          ...prev,
          open: false,
        }))}
        title={"Choose Supplier"}
        showCloseIcon={true}
        maxWidth="sm"
        actions={
          < PGrid className="d-flex align-items-center justify-content-end gap-2" >
            <PButton
              fullWidth
              label={getLabel("lbl125")}
              variant="outlined"
              onClick={() => setFormData((prev) => ({
                ...prev,
                open: false
              }))}
              color={CommonColors.grey.main}
              width={120}
            />
            <PButton
              fullWidth
              label={"Ok"}
              variant={Labels.contained}
              onClick={(e) => handleSubmit(e)}
              color={CommonColors.dark_blue}
              width={120}
              startIcon={<img src={arrow} alt="arrow" className="icon" />}
              disabled={supplierB === supplierC}
            />
          </PGrid >
        }
      >
        <PGrid container className={Labels.margin.mb4}>
          <PGrid item xs={12} sm={6} md={12}>
            <PDropdown
              name={"supplierB"}
              label={`${"Supplier B"}`}
              value={formData.supplierB}
              onChange={handleChange}
              options={formData.suppliers}
              width={100}
              flag={Labels.flag.auto}
            />
          </PGrid>
        </PGrid>
        <PGrid container className={Labels.margin.mb4}>
          <PGrid item xs={12} sm={6} md={12}>
            <PDropdown
              name={"supplierC"}
              label={`${"Supplier C"}`}
              value={formData.supplierC}
              onChange={handleChange}
              options={formData.suppliers}
              width={100}
              flag={Labels.flag.auto}
            />
          </PGrid>
        </PGrid>
        {supplierB && supplierC && supplierB === supplierC && (
          <PGrid container className={Labels.margin.mb3}>
            <PGrid item xs={12} md={12} sm={8}>
              <PTypography
                labelText={"Please select different suppliers."}
                weight={FontWeight.bold}
                color={CommonColors.red.main}
              />
            </PGrid>
          </PGrid>
        )}
      </PDialog>
    </>
  );
};

export default PTable;