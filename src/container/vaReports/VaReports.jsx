import { useMemo } from "react";
import { useSelector } from "react-redux";
import PTypography from "../../component/PTypography/PTypography";
import { FontWeight } from "../../utils/constants/fonts";
import { Labels } from "../../utils/constants/labels";
import useReportFilters from "./hooks/useReportFilters";
import useReportData from "./hooks/useReportData";
import { applyFilters, previousRange } from "./utils/aggregations";
import { toDmy } from "./utils/dateUtils";
import { USE_MOCK } from "./services/vaReportService";
import FilterBar from "./components/FilterBar";
import KpiStrip from "./components/KpiStrip";
import DetailGrid from "./components/DetailGrid";
import { FunnelWidget, StatusDonutWidget } from "./components/widgets/StatusWidgets";
import { AgeingWidget, TrendWidget } from "./components/widgets/TimeWidgets";
import {
  ClientWidget, CountryDrillWidget, ProjectMatrixWidget, TopProjectsWidget, UserActivityWidget,
} from "./components/widgets/DimensionWidgets";
import { EBiddingWidget, SupplierWidget } from "./components/widgets/QuoteWidgets";
import "./vaReports.css";

/**
 * VA Reports – one Power BI-style view over every Virtual Agency module (Enquiry, E-Bidding, Catalog).
 * UI only: data comes from services/vaReportService (mock until the report endpoints exist).
 */
export default function VaReports() {
  const { userType } = useSelector((s) => s.userDetails.user) || {};
  const { filters, update, toggle, reset, activeCount } = useReportFilters();
  const { facts, statusOf, master, suppliers, state } = useReportData(filters.from, filters.to);

  const current = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const prevRange = previousRange(filters.from, filters.to);
  const previous = useMemo(
    () => (prevRange ? applyFilters(facts, filters, { range: prevRange }) : []),
    [facts, filters] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (userType && userType.toLowerCase() !== Labels.userType.agency) {
    return (
      <div className="va-reports va-denied">
        <PTypography labelText="VA Reports" flag="big" weight={FontWeight.regular} />
        <p>VA Reports is available to agency users only.</p>
      </div>
    );
  }

  const widgetProps = { facts, filters, update, toggle, reset, statusOf, master, suppliers };
  const coreState = statusOf([]);

  return (
    <div className="va-reports">
      <div className="va-pagehead">
        <PTypography labelText="VA Reports" flag="big" weight={FontWeight.regular} />
        <p className="va-pagesub">
          Enquiry, E-Bidding and Catalog performance · enquiries created {toDmy(filters.from)} – {toDmy(filters.to)}
          {USE_MOCK && <span className="va-badge" title="Data comes from the mock service until the report endpoints are built">Sample data</span>}
        </p>
      </div>

      <FilterBar
        filters={filters}
        update={update}
        reset={reset}
        master={master}
        facts={facts}
        suppliers={suppliers}
        activeCount={activeCount}
      />

      <KpiStrip current={current} previous={previous} statusOf={statusOf} hasPrevious={!!prevRange && state.dataset.status === "ready"} />

      <div className="va-grid-layout">
        <FunnelWidget {...widgetProps} />
        <StatusDonutWidget {...widgetProps} />
        <AgeingWidget {...widgetProps} />
        <TrendWidget {...widgetProps} />
        <UserActivityWidget {...widgetProps} />
        <CountryDrillWidget {...widgetProps} />
        <ClientWidget {...widgetProps} />
        <ProjectMatrixWidget {...widgetProps} />
        <TopProjectsWidget {...widgetProps} />
        <EBiddingWidget {...widgetProps} />
        <SupplierWidget {...widgetProps} />
      </div>

      <DetailGrid rows={current} state={coreState} onReset={reset} />
    </div>
  );
}
