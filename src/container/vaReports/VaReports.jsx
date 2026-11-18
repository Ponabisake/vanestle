import { useMemo } from "react";
import { useSelector } from "react-redux";
import PTypography from "../../component/PTypography/PTypography";
import { FontWeight } from "../../utils/constants/fonts";
import { Labels } from "../../utils/constants/labels";
import useReportFilters from "./hooks/useReportFilters";
import useReportData from "./hooks/useReportData";
import { applyFilters, completedBetween, previousRange } from "./utils/aggregations";
import { toDmy } from "./utils/dateUtils";
import { USE_MOCK } from "./services/vaReportService";
import FilterBar from "./components/FilterBar";
import KpiStrip from "./components/KpiStrip";
import DetailGrid from "./components/DetailGrid";
import { FunnelWidget, StatusDonutWidget } from "./components/widgets/StatusWidgets";
import { AgeingMatrixWidget, AgeingTrendWidget, AgeingWidget, TrendWidget } from "./components/widgets/TimeWidgets";
import { ClientContactWidget, ClientWidget, CountryDrillWidget, OrgUnitWidget, UserActivityWidget } from "./components/widgets/DimensionWidgets";
import { CategoryMatrixWidget, CategoryStatusWidget } from "./components/widgets/CategoryWidgets";
import { ProjectDurationWidget, ProjectTimelineWidget, ProjectWatchlistWidget } from "./components/widgets/ProjectWidgets";
import { EBiddingSplitWidget, EBiddingWidget, SupplierActivityWidget, SupplierWidget } from "./components/widgets/QuoteWidgets";
import "./vaReports.css";

/**
 * VA Reports – one Power BI-style view over every Virtual Agency module (Enquiry, E-Bidding, Catalog).
 * Data: services/vaReportService (VA/Report* endpoints; ?mock=1 for the mock database).
 */
export default function VaReports() {
  const { userType } = useSelector((s) => s.userDetails.user) || {};
  const { filters, update, toggle, reset, activeCount } = useReportFilters();
  const { facts, statusOf, master, meta, categories, suppliers, state } = useReportData(filters.from, filters.to);

  const current = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const prevRange = previousRange(filters.from, filters.to);
  const previous = useMemo(
    () => (prevRange ? applyFilters(facts, filters, { range: prevRange }) : []),
    [facts, filters] // eslint-disable-line react-hooks/exhaustive-deps
  );
  // completions inside each period, whatever the creation date (cheap: one pass over the loaded facts)
  const completedNow = completedBetween(facts, filters, filters.from, filters.to);
  const completedBefore = prevRange ? completedBetween(facts, filters, prevRange.from, prevRange.to) : null;

  if (userType && userType.toLowerCase() !== Labels.userType.agency) {
    return (
      <div className="va-reports va-denied">
        <PTypography labelText="VA Statistics" flag="big" weight={FontWeight.regular} />
        <p>VA Statistics is available to agency users only.</p>
      </div>
    );
  }

  const widgetProps = { facts, filters, update, toggle, reset, statusOf, master, categories, suppliers };
  const coreState = statusOf([]);
  const scopeText = meta ? (meta.isAdmin ? "all countries" : "your country") : null;

  return (
    <div className="va-reports">
      <div className="va-pagehead">
        <PTypography labelText="VA Statistics" flag="big" weight={FontWeight.regular} />
        <p className="va-pagesub">
          Enquiry, E-Bidding and Catalog performance · enquiries created {toDmy(filters.from)} – {toDmy(filters.to)}
          {scopeText && ` · ${scopeText}`}
          {USE_MOCK && <span className="va-badge" title="Data comes from the mock database (?mock=1)">Sample data</span>}
        </p>
      </div>

      <FilterBar
        filters={filters}
        update={update}
        reset={reset}
        master={master}
        categories={categories}
        facts={facts}
        suppliers={suppliers}
        activeCount={activeCount}
      />

      <KpiStrip
        current={current}
        previous={previous}
        completedNow={completedNow}
        completedBefore={completedBefore}
        statusOf={statusOf}
        hasPrevious={!!prevRange && state.dataset.status === "ready"}
      />

      <div className="va-grid-layout">
        {/* Status */}
        <FunnelWidget {...widgetProps} />
        <StatusDonutWidget {...widgetProps} />
        <CategoryStatusWidget {...widgetProps} />
        <TrendWidget {...widgetProps} />
        <UserActivityWidget {...widgetProps} />
        {/* Country, client, category */}
        <CountryDrillWidget {...widgetProps} />
        <ClientWidget {...widgetProps} />
        {/* Organisation (entity / business unit / global BU) and client contacts */}
        <OrgUnitWidget {...widgetProps} />
        <ClientContactWidget {...widgetProps} />
        <CategoryMatrixWidget {...widgetProps} />
        {/* Ageing */}
        <AgeingWidget {...widgetProps} />
        <AgeingMatrixWidget {...widgetProps} />
        <AgeingTrendWidget {...widgetProps} />
        {/* Projects */}
        <ProjectTimelineWidget {...widgetProps} />
        <ProjectDurationWidget {...widgetProps} />
        <ProjectWatchlistWidget {...widgetProps} />
        {/* E-bidding & suppliers */}
        <EBiddingWidget {...widgetProps} />
        <EBiddingSplitWidget {...widgetProps} />
        <SupplierActivityWidget {...widgetProps} />
        <SupplierWidget {...widgetProps} />
      </div>

      <DetailGrid rows={current} state={coreState} onReset={reset} />
    </div>
  );
}
