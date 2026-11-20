import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Dialog, InputBase } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import KeyboardReturnRoundedIcon from "@mui/icons-material/KeyboardReturnRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { adminItemRoute, adminMenuFor, DEFAULT_ITEM_ICON } from "./adminMenu";
import { QUICK_SEARCH_EVENT, readRecentAdminPages } from "./adminSearchEvents";

/** Every page the admin may open, flattened with its group. */
const flatten = (groups) => groups.flatMap((group) => group.items.map((item) => ({ group, item })));

/** 0 = label starts with the term, 1 = a label word does, 2 = label contains it, 3 = group / description; -1 = no match. */
const rank = ({ group, item }, term) => {
  const label = item.label.toLowerCase();
  if (label.startsWith(term)) return 0;
  if (label.split(/[\s-]+/).some((w) => w.startsWith(term))) return 1;
  if (label.includes(term)) return 2;
  return [item.description, group.label].some((v) => (v || "").toLowerCase().includes(term)) ? 3 : -1;
};

/** The matching pages, best first (menu order within a rank). */
const search = (entries, term) =>
  entries.map((e, i) => ({ e, i, r: rank(e, term) })).filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.e);

/**
 * Admin quick search: Ctrl / ⌘ + K (or the search buttons) opens a palette of the pages this admin may open; type to
 * filter, ↑ ↓ to move, Enter to open, Esc to close. Shows the recently opened pages before anything is typed.
 */
export default function AdminQuickSearch() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.userDetails.user);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    const show = () => { setTerm(""); setIndex(0); setOpen(true); };
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(QUICK_SEARCH_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(QUICK_SEARCH_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const all = flatten(adminMenuFor(user));
  const query = term.trim().toLowerCase();
  const recentKeys = open && !query ? readRecentAdminPages() : [];
  const recent = recentKeys.map((k) => all.find((e) => e.item.key === k)).filter(Boolean);
  const results = query ? search(all, query) : [...recent, ...all.filter((e) => !recentKeys.includes(e.item.key))];
  const active = Math.min(index, Math.max(results.length - 1, 0));

  const go = (entry) => {
    if (!entry) return;
    setOpen(false);
    navigate(adminItemRoute(entry.item));
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? Math.min(active + 1, results.length - 1) : Math.max(active - 1, 0);
      setIndex(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"
      slotProps={{
        paper: { sx: { alignSelf: "flex-start", mt: { xs: 2, md: "12vh" }, borderRadius: "16px", overflow: "hidden", boxShadow: `0 24px 60px ${PmgColors.navy}40` } },
        backdrop: { sx: { bgcolor: `${PmgColors.navy}66`, backdropFilter: "blur(3px)" } },
      }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.75, borderBottom: "1px solid #ECEAF3" }}>
        <SearchRoundedIcon sx={{ color: PmgColors.indigo }} />
        <InputBase autoFocus fullWidth placeholder="Go to an admin page…" value={term}
          onChange={(e) => { setTerm(e.target.value); setIndex(0); }} onKeyDown={onKeyDown}
          inputProps={{ "aria-label": "Search admin pages" }} sx={{ fontSize: 17, fontFamily: "inherit" }} />
        <Box component="kbd" sx={{ fontSize: 11, color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "6px", px: 0.75, py: 0.25, fontFamily: "inherit" }}>Esc</Box>
      </Box>
      <Box ref={listRef} role="listbox" sx={{ maxHeight: "min(60vh, 460px)", overflowY: "auto", p: 1 }}>
        {results.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center", color: "#6b7280", fontSize: 14 }}>No admin page matches “{term.trim()}”.</Box>
        )}
        {!query && recent.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, pt: 1, pb: 0.5, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9ca3af" }}>
            <HistoryRoundedIcon sx={{ fontSize: 15 }} /> Recently opened
          </Box>
        )}
        {results.map((entry, i) => {
          const Icon = entry.item.icon || DEFAULT_ITEM_ICON;
          const selected = i === active;
          const firstOfRest = !query && recent.length > 0 && i === recent.length;
          return (
            <Box key={entry.item.key}>
              {firstOfRest && (
                <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9ca3af" }}>All pages</Box>
              )}
              <Box role="option" aria-selected={selected} data-index={i}
                onMouseEnter={() => setIndex(i)} onClick={() => go(entry)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1.1, borderRadius: "10px", cursor: "pointer",
                  bgcolor: selected ? `${entry.group.color}12` : "transparent",
                  outline: selected ? `1px solid ${entry.group.color}33` : "none",
                }}>
                <Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", flexShrink: 0, color: entry.group.color, bgcolor: `${entry.group.color}14` }}>
                  <Icon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontSize: 14.5, fontWeight: 600, color: PmgColors.navy }}>{entry.item.label}</Box>
                  <Box sx={{ fontSize: 12.5, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.item.description}</Box>
                </Box>
                <Box sx={{ fontSize: 11.5, fontWeight: 600, color: entry.group.color, display: { xs: "none", sm: "block" } }}>{entry.group.label}</Box>
                {selected && <KeyboardReturnRoundedIcon sx={{ fontSize: 16, color: "#9ca3af" }} />}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", gap: 2, px: 2.5, py: 1.25, borderTop: "1px solid #ECEAF3", bgcolor: "#fafafb", fontSize: 12, color: "#6b7280" }}>
        <span>↑ ↓ move</span><span>Enter open</span><span>Esc close</span>
      </Box>
    </Dialog>
  );
}
