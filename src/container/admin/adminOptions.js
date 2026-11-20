/**
 * Drop-down options of the admin forms: the values the API offers (e.g. active countries only) plus the record's own
 * value when it is not one of them (a country deactivated after the record was saved), so the field never shows blank.
 */
export const optionsWithCurrent = (values, current, note = "inactive") => {
  const list = (values || []).map((v) => ({ label: v, value: v }));
  const value = current == null ? "" : String(current);
  if (!value.trim() || list.some((o) => o.value === value)) return list;
  const sameText = list.some((o) => o.value.trim().toLowerCase() === value.trim().toLowerCase());
  return [...list, { label: sameText ? value.trim() : `${value.trim()} (${note})`, value }];
};
