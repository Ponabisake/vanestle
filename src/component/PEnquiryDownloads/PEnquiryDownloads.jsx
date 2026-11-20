import { useCallback, useEffect, useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PGrid from "../PGrid/PGrid";
import PTable from "../PTable/PTable";
import PDatepicker from "../PDatepicker/PDatepicker";
import PreviewDialog from "../PDialog/PPreviewDialog";
import { Downloads_API, ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import "./PEnquiryDownloads.css";

// Legacy "Quotations & Purchase orders": the section is there from status 3 (quotation sent to client),
// the client delivery orders only once the job is past status 6 (awarded)
export const DOWNLOADS_FROM_STATUS = 3;
const DELIVERY_ORDERS_AFTER_STATUS = 6;

// dateLabel: the kinds whose date the agency can edit (legacy Edit on the Quotation Date / Purchase order Date grids)
const KINDS = {
  quotation: { tag: "Quotation", Icon: RequestQuoteOutlinedIcon, dateLabel: "Quotation date" },
  purchaseOrder: { tag: "Purchase order", Icon: ReceiptLongOutlinedIcon, dateLabel: "PO date" },
  deliveryOrder: { tag: "Delivery order", Icon: LocalShippingOutlinedIcon },
};

const DATE_PATTERN = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
const isRealDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

// Part of a file name: no characters Windows refuses in a file name
const fileRef = (value, fallback) => String(value ?? "").trim().replace(/[\\/:*?"<>|]+/g, "") || String(fallback);

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Project Enquiry → Downloads: the Word documents of the job, as the legacy page offered them: the client quotation
 * (same file as "Preview Quotation"), a purchase order per awarded supplier and a delivery order per client delivery address.
 */
export default function PEnquiryDownloads({ enquiryId, statusId, projectNo }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [busyKey, setBusyKey] = useState(null);
  // the row whose date is being edited: { key, value, error, saving }
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null); // { name, file: Blob, size }

  const showDeliveryOrders = Number(statusId) > DELIVERY_ORDERS_AFTER_STATUS;
  const projectRef = fileRef(projectNo, enquiryId);

  // loading starts true, so the first paint shows placeholder rows; the list is set once the request answers
  const load = useCallback(async () => {
    if (!enquiryId) return;
    try {
      const response = await PostApi(Downloads_API.GetEnquiryDownloads, { enquiryId });
      if (!isSuccess(response)) {
        toast(Labels.status.failure, (typeof response?.data === "string" && response.data) || Labels.message.somethingWentWrong);
        setRows([]);
        return;
      }
      const data = response.data || {};
      setRows([
        {
          key: "quotation",
          kind: "quotation",
          name: "Quotation",
          date: data.quotationDate || "",
          url: ProjectEnquiry_API.GetPreviewQuotes,
          body: { enquiryId },
          fileName: `Quotation_${projectRef}.doc`,
          saveDate: (date) => PostApi(Downloads_API.UpdateQuotationDate, { enquiryId, quotationDate: date }),
        },
        ...(data.purchaseOrders || []).map((po) => ({
          key: `po-${po.supplierId}`,
          kind: "purchaseOrder",
          name: `Purchase Order for ${po.supplierName}`,
          date: po.poDate || "",
          url: Downloads_API.GetPurchaseOrder,
          body: { enquiryId, supplierId: po.supplierId },
          fileName: `PurchaseOrder_${projectRef}_${fileRef(po.supplierName, po.supplierId)}.doc`,
          saveDate: (date) => PostApi(Downloads_API.UpdatePoDate, { enquiryId, supplierId: po.supplierId, poDate: date }),
        })),
        ...(showDeliveryOrders ? data.deliveryOrders || [] : []).map((d) => ({
          key: `do-${d.id}`,
          kind: "deliveryOrder",
          name: `Delivery order ${d.companyName}`.trim(),
          date: "",
          url: Downloads_API.GetDeliveryOrder,
          body: { enquiryId, deliveryId: d.id },
          fileName: `DeliveryOrder_${projectRef}_${fileRef(d.companyName, d.id)}.doc`,
        })),
      ]);
    } catch {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }, [enquiryId, projectRef, showDeliveryOrders]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // preview: a click on the document opens it in the preview (which has its own Download); the icon saves it
  const download = async (row, preview = false) => {
    if (busyKey) return;
    setBusyKey(row.key);
    try {
      const response = await PostApi(row.url, row.body);
      if (response instanceof Blob) {
        if (preview) setPreview({ name: row.fileName, file: response, size: response.size });
        else saveBlob(response, row.fileName);
      } else {
        toast(Labels.status.failure, `Could not generate the ${KINDS[row.kind].tag.toLowerCase()}. Please try again.`);
      }
    } catch {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
    } finally {
      setBusyKey(null);
    }
  };

  const startEdit = (row) => setEditing({ key: row.key, value: isRealDate(row.date) ? row.date : "", error: "", saving: false });

  const saveDate = async (row) => {
    const value = (editing?.value || "").trim();
    if (!isRealDate(value)) {
      setEditing((e) => ({ ...e, error: "Enter a date as DD/MM/YYYY" }));
      return;
    }
    setEditing((e) => ({ ...e, error: "", saving: true }));
    try {
      const response = await row.saveDate(value);
      if (isSuccess(response)) {
        const saved = response.data?.quotationDate || response.data?.poDate || value;
        setRows((list) => list.map((r) => (r.key === row.key ? { ...r, date: saved } : r)));
        setEditing(null);
        toast(Labels.status.success, `${KINDS[row.kind].dateLabel} updated`);
      } else {
        const message = (typeof response?.data === "string" && response.data) || Labels.message.somethingWentWrong;
        setEditing((e) => ({ ...e, saving: false, error: message }));
      }
    } catch {
      setEditing((e) => ({ ...e, saving: false, error: Labels.message.somethingWentWrong }));
    }
  };

  const renderDate = (row) => {
    if (editing?.key !== row.key) return row.date || <span className="ped-muted">—</span>;
    return (
      <div
        className="ped-date-edit"
        onKeyDown={(e) => {
          if (e.key === "Enter") saveDate(row);
          if (e.key === "Escape") setEditing(null);
        }}
      >
        <PDatepicker
          name={`${row.key}-date`}
          value={editing.value}
          onChange={(e) => setEditing((cur) => ({ ...cur, value: e.target.value, error: "" }))}
          allowFuture
          disabled={editing.saving}
          helperText={editing.error}
          mt={0}
        />
      </div>
    );
  };

  const renderActions = (row) => {
    if (editing?.key === row.key) {
      return (
        <span className="ped-actions">
          <Tooltip title="Save" arrow>
            <span>
              <IconButton size="small" className="ped-action ped-save" onClick={() => saveDate(row)} disabled={editing.saving} aria-label={`Save ${KINDS[row.kind].dateLabel}`}>
                {editing.saving ? <CircularProgress size={16} /> : <CheckRoundedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancel" arrow>
            <span>
              <IconButton size="small" className="ped-action" onClick={() => setEditing(null)} disabled={editing.saving} aria-label="Cancel">
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </span>
      );
    }
    return (
      <span className="ped-actions">
        {row.saveDate && (
          <Tooltip title={`Edit ${KINDS[row.kind].dateLabel.toLowerCase()}`} arrow>
            <span>
              <IconButton size="small" className="ped-action" onClick={() => startEdit(row)} disabled={!!editing?.saving} aria-label={`Edit ${KINDS[row.kind].dateLabel} of ${row.name}`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="Download" arrow>
          <span>
            <IconButton size="small" className="ped-action" onClick={() => download(row)} disabled={!!busyKey} aria-label={`Download ${row.name}`}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </span>
    );
  };

  const columns = [
    {
      field: "name",
      header: "Document",
      hideable: false,
      render: (row) => {
        const { Icon } = KINDS[row.kind];
        return (
          <button
            type="button"
            className="ped-file"
            onClick={() => download(row, true)}
            disabled={!!busyKey}
            title={`View ${row.name}`}
          >
            {busyKey === row.key ? <CircularProgress size={18} /> : <Icon sx={{ fontSize: 20 }} />}
            <span className="ped-file-name">{row.name}</span>
          </button>
        );
      },
    },
    { field: "kind", header: "Type", render: (row) => <span className={`ped-tag is-${row.kind}`}>{KINDS[row.kind].tag}</span> },
    { field: "date", header: "Date", render: renderDate },
    { field: "actions", header: "", align: "right", hideable: false, render: renderActions },
  ];

  return (
    <PGrid container className={Labels.margin.mb4}>
      <PGrid item xs={12} sm={12} md={12}>
        <PTable
          columns={columns}
          rows={rows}
          loading={loading}
          showPagination={false}
          columnChooser={false}
          emptyTitle="No documents yet"
          emptyMessage="The quotation, purchase orders and delivery orders of this job will be listed here."
        />
      </PGrid>
      <PreviewDialog open={!!preview} onClose={() => setPreview(null)} files={preview ? [preview] : []} currentIndex={0} setCurrentIndex={() => { }} />
    </PGrid>
  );
}
