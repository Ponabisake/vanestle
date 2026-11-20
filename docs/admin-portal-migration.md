# Admin Portal migration

Legacy reference: `d:\LocalSource\VANestle.Test` (the legacy Nestlé site), admin pages in `Admin\*.aspx`, menu in
`MasterPages\MasterAdmin.master`. Live status per module: `src/container/admin/migrationTracker.js` (shown on the admin
console dashboard; its public summary drives the login page's maintenance panel). This file holds the inventory and
the legacy analysis; update the tracker in the same change that finishes a stage.

## Conventions for a module

- API: `AdminController` endpoint pair `X` (list) / `SaveX`, checked with `AdminForAsync(username, WebAdminAccess.Menus.X)`;
  logic in `Services/XAdmin.cs` (static, EF, no string-built SQL); request/response models in `CustomModels/AdminModels.cs`;
  xUnit tests with the EF in-memory provider (`Tests/VAapiNestle.Tests/XAdminTests.cs`).
- UI: `src/container/admin/AdminX.jsx` (pattern: `AdminProducts.jsx`), route in `labelRoutes`/`routes.jsx`, `route` on the
  menu item in `adminMenu.js`; the menu marks it built when the tracker says `completed`.
- Permissions: `WebAdminAccess` (MasterAdmin all; Admin: users, suppliers, SLA, deletes; superadmin: users, suppliers).
- Maintenance mode: every API call except sign-on / status / labels / site logo needs an admin session token while it is on.

## Inventory (legacy page → module)

| Group | Legacy page(s) | Module | Admin types (legacy) |
|---|---|---|---|
| Foundation | Login.aspx, Dashboard.aspx, MasterAdmin.master | Admin sign-in & dashboard | all |
| Users | ManagePmgUsers.aspx | PMG VANestle Users | MasterAdmin, Admin, superadmin |
| Users | ManageClientContact.aspx (+ ManageClientUsers.aspx) | PMG VANestle Client Users | MasterAdmin, Admin, superadmin |
| Users | ManageSuppliers.aspx (+ ManageSupplierUsers.aspx) | Suppliers & supplier users | MasterAdmin, Admin, superadmin |
| Catalogue | ManageClients.aspx (+ ClientHierarchy.aspx) | Clients & client hierarchy | MasterAdmin |
| Catalogue | Products.aspx | Products | MasterAdmin |
| Catalogue | SubItem.aspx | Sub Item | MasterAdmin |
| Catalogue | TypeOfItem.aspx | Type of Item | MasterAdmin |
| Catalogue | Materialused.aspx | Material Used | MasterAdmin |
| Catalogue | PromoOSSOrderWindows.aspx | Promo OSS Order Windows | MasterAdmin |
| Operations | ManageSLA.aspx | SLA | MasterAdmin, Admin |
| Operations | DeleteEnquiries.aspx | Delete Enquiries | MasterAdmin, Admin |
| Operations | DeleteEbidding.aspx | Delete E-bidding | MasterAdmin, Admin |
| Reports | DownloadData.aspx | Download Data | MasterAdmin |
| Reports | CatalogueUsage.aspx | Catalogue Usage | MasterAdmin |
| Reports | EnvironmentImpacts.aspx | Environment Impacts | MasterAdmin |
| Reports | EnvironmentalComparison.aspx | Environment Comparison | MasterAdmin |
| Settings | ManageSite.aspx | Site Settings & maintenance mode | MasterAdmin |
| Settings | — (new; tblCountry had no page) | Countries | MasterAdmin |
| Settings | — (new; lists were hardcoded in VAController) | Drop-down Lists | MasterAdmin |

Not migrated (hidden or other clients in the legacy menu): Enquiries.aspx / EnquiryDetails.aspx / Deliverables (menu
items hidden with `display:none`), ManagePmgUsersBAT.aspx / ManagePmgUsersGSK.aspx (other clients' sites).

## Legacy analysis

### Site Settings (ManageSite.aspx) — completed 2026-11-19
- Legacy: one drop-down (-- Select -- / ON / OFF, required) writing `appSettings maintenanceMode` in web.config.
  Account/Login, ForgotPassword and ResetPassword redirected to Maintenance.aspx while it was "true"; the admin login did not.
- New: `Admin/SiteSettings`, `Admin/SaveSiteSettings` (MasterAdmin, menu siteSettings), stored in
  `{Attachments:RootPath}\Branding\site-settings.json`; default from appsettings `SiteSettings:MaintenanceMode` (true).
  Enforced API-wide by `MaintenanceModeMiddleware` using the sign-on session token (`PMG-Session`, Data Protection);
  regular sign-on refused; `GET Site/Status` for the UI. UI: route guard signs regular users out; login page shows
  the progress panel; Forgot Password hidden.
- Differences: who/when of the last change is shown; turning ON asks for confirmation; enforcement covers the API
  (legacy only redirected pages).

### Sub Item (SubItem.aspx) — in progress
- Legacy: list of `tblsubcategory`; add / edit (no delete). Fields: SubCategory (required, max 50), Japanese, ZSIM
  (max 50), Status (Active/Inactive, required), MarkedtypeofItem (Yes/No, required). SQL built by string concatenation.
- New: `Admin/SubItems`, `Admin/SaveSubItem` (menu subItem), `Services/SubItemAdmin.cs`. Max 100 (migrated names reach 61);
  duplicate names refused for new / renamed rows; optional Type of job (Print / Promo / POSM → Typeofjob, comma list):
  the enquiry line item list filters sub items by it and the legacy page could not set it. CatABC, ProductId,
  SapMaterialcode kept.
- Open: saving not yet run against a real database.

### Type of Item (TypeOfItem.aspx) — in progress
- Legacy: `tbltypeofitem` add / edit (no delete). Type of item (required, max 50), Type of job (optional: Print / Promo /
  Posm / Both, stored PRINT / PROMO / POSM / Both), Status (required), Sub item (optional, active sub items).
  Bugs: the edit wrote the stored job into the first drop-down item instead of selecting it, and never loaded the sub
  item, so saving an edit cleared it. String-built SQL.
- Consumer: VA GetTypeOfItems filters by job (Both = Print and POSM; SQL comparison is case-insensitive) and, for a
  marked sub item, lists only the types linked to it.
- New: `Admin/TypesOfItem`, `Admin/SaveTypeOfItem`, `Services/TypeOfItemAdmin.cs`. Stored spellings kept (an edit that
  keeps the job keeps it); max 200 (migrated names reach 119); a name may repeat only for another job / sub item;
  an existing link to an inactive sub item stays (shown as "(inactive)").
- Open: saving not yet run against a real database.

### Material Used (Materialused.aspx) — in progress
- Legacy: `tblMaterialused` add / edit (no delete). Material used (required, max 50), Type of job (optional:
  PrintandPOSM / PROMO), Status (required). Same drop-down bug as Type of Item. String-built SQL.
- Hidden: `Envimp` / `ComEnvimp` — comma lists of environmental impact options read by VA BindMaterial (enquiry
  environmental section and its comparison); not editable in the legacy page.
- New: `Admin/MaterialsUsed`, `Admin/SaveMaterialUsed`, `Services/MaterialUsedAdmin.cs`. Both impact lists editable
  (chips; no commas in an option; repeats dropped); names unique for new / renamed rows (BindMaterial matches by name).
- Open: saving not yet run against a real database.

### Promo OSS Order Windows (PromoOSSOrderWindows.aspx) — in progress
- Legacy: `tblPromoOSSOrderWindows` list, add (trimmed, not empty), delete (hard). Edit commented out; the page also
  carries an unused copy of the client form. Country / Status columns unused (all NULL).
- Consumer: VA EnqLineItemsDropdowns lists every window, "N/A" selected by default; enquiry line items store the text.
- New: `Admin/OrderWindows`, `Admin/SaveOrderWindow`, `Admin/DeleteOrderWindow`, `Services/OrderWindowAdmin.cs`.
  Added rename, duplicate check, usage count per window, delete confirmation; "N/A" cannot be deleted or renamed.
- Open: saving / deleting not yet run against a real database.

### PMG VANestle Users (ManagePmgUsers.aspx) — in progress
- Legacy: procedures `GetPmgUsers` (tblAgencyUsers ⋈ tblUser, UserType 'Agency') and `AddOrUpdatePmgUser` (inserts /
  updates both). Open to MasterAdmin, Admin, superadmin with a split: superadmin edits only logon id, password, Report
  enabled and clients (profile disabled); the others edit the profile + clients (logon id / password / report disabled).
  New users get the password typed in the box, which only a superadmin can change from its default "password" (the
  login page forces a change for "password"). Logon id: `^[a-zA-Z'.\s]{1,90}$`, unique in tblUser (checked on blur).
  Client members: active tblClientDetails of the user's country → tblUser.ClientMembers (comma list); every user has one.
  JobRole ClientServices / Administration; JobPosition Teamlead / None; tblUser.Status follows the profile status.
- New: `Admin/PmgUsers`, `Admin/SavePmgUser` (one transaction), `Services/PmgUserAdmin.cs`; same split enforced on the
  server (fields an admin type may not change are ignored).
- Differences: passwords are never sent to the browser (legacy showed them in the edit form); superadmin types a new
  password instead (empty = keep); duplicate logon ids refused on save; at least one client required; a client
  already linked may stay when it became inactive.
- Open: saving not yet run against a real database.

### PMG VANestle Client Users (ManageClientContact.aspx) — in progress
- Legacy: procedures `GetClientUsers` (tblClient ⋈ tblUser 'Client' ⋈ tblDivision on Department) and
  `AddOrUpdateClientContactsUser`. Edit only (the Add button is hidden on load; contacts are created with the client).
  Same admin-type split as PMG users. Update writes FirstName, LastName, JobTitle, Email, Phone, ReceiveNotification,
  Status, JobPosition (tblClient) and Status, UserName, Password (tblUser); Division / Business unit are display only.
  Job positions: Marketer, Team Lead, Procurement, Marketing & Sales, Others, ClientAdmin, Reg_Proc_PBI, Local_PBI
  (the data also has Admin / Client). `ManageClientUsers.aspx` is a stub that only redirects.
- New: `Admin/ClientUsers`, `Admin/SaveClientUser` (one transaction), `Services/ClientUserAdmin.cs`; logon / email rules
  shared with PMG users.
- Differences: passwords never sent to the browser; contacts with a missing division listed (legacy inner join hid
  them); a stored job position outside the list is kept.
- Open: saving not yet run against a real database.

### Suppliers & supplier users (ManageSuppliers.aspx, ManageSupplierUsers.aspx) — in progress
- Legacy: `AddOrUpdateSupplier` (tblSuppliersList; a status change cascades to tblSupplierUsers and their tblUser
  logins), `GetSupplierUsersBySupplierId` / `AddOrUpdateSupplierUser` (tblSupplierUsers + tblUser 'Supplier',
  EmailAddressUAT = va@pmgasia.com, same admin-type split as PMG users). Open to MasterAdmin, Admin, superadmin.
- Legacy bugs: the page sends `@SGPAccredited` but the procedure (project copy) expects `@GMPAccredited`; an update
  never sent `@suppliercode`, so it wrote NULL (1,209 of 1,473 suppliers have no code). Client list commented out.
- New: `Admin/Suppliers`, `Admin/SaveSupplier`, `Admin/SupplierUsers`, `Admin/SaveSupplierUser`
  (`Services/SupplierAdmin.cs`, transactions). Supplier code kept and editable; name unique per country.
- Open: saving not yet run against a real database.

### Delete Enquiries / Delete E-bidding (DeleteEnquiries.aspx, DeleteEbidding.aspx) — in progress
- Legacy: client grids over VAService `GetEnquiries` / `EB_GetEbidingRecords` (active, by job type) and
  `DeleteEnquiries` / `EB_DeleteBid`: soft delete (Status 0, DeleteDate, Reason 'Test Enquiry (Deleted)'),
  E-Bidding excluded / only. MasterAdmin and Admin.
- New: `Admin/DeletableEnquiries`, `Admin/DeleteEnquiries`, `Admin/DeletableEbiddings`, `Admin/DeleteEbiddings`
  (`Services/DeleteEnquiryAdmin.cs`); several at once (max 200) with a confirmation listing them.
- Open: deleting not yet run against a real database.

### SLA (ManageSLA.aspx) — in progress
- Legacy: `tblSLA` via `AddOrUpdateSLATemplate` (insert always Status 1, IsDefault 0) and `UpdateSLATemplateStatus`
  (toggles Status); description + quote / proof / production / file copies / invoicing days (3 digits). MasterAdmin, Admin.
- Hidden: the enquiry form (VA EnquiryDetails dropdowns) lists only active templates whose **Country** equals the
  enquiry's country; the legacy page had no Country field (27 of 61 templates have none and are never offered).
- New: `Admin/SlaTemplates`, `Admin/SaveSlaTemplate`, `Admin/SetSlaTemplateStatus` (`Services/SlaAdmin.cs`); optional
  Country, "Not offered" flagged in the list, one description per country, IsDefault kept.
- Open: saving not yet run against a real database.

### Clients & client hierarchy (ManageClients.aspx, ClientHierarchy.aspx) — in progress
- ManageClients: MasterAdmin only. List `select * from tblClientDetails`; add / edit via `AddOrUpdateClient`
  (@EditType Add / Update). Fields (all required unless noted): ClientName (`^[a-zA-Z'@&#.\s]{1,50}$`), PhoneNumber
  (`^[1-9]\d*$`, max 15), AddressLine1 (2–4 optional, 250), City (same pattern as name, 50), Country / Language /
  Currency (drop-downs from tblCountry), PaymentTerm (optional, 50), SalesPercentage (MARKUP / MARGIN), default sales,
  print, POSM, promo percentages, PMG and VANestle gain shares (each 0–100), EuroRate ("Swiss franc rate", 14), Status.
  Percentages and the rate are stored as text.
- Effect of a change: print / POSM / promo / gain-share percentages are copied to each new enquiry (existing enquiries
  keep theirs); the default sales percentage and the rate are read live by the calculations.
- ClientHierarchy (Nestlé version): `ClientHierarchy_CRUD` on tblDivision — Country, EntityName, BussinessUnit,
  GlobalBUMapping, Status; add / edit / delete. The legacy delete removed rows still used by client contacts
  (tblClient.Department) and enquiries (tblEnquiryMaster.DivisionId), leaving them orphaned. Clientcode / PaymentTerm
  columns are not edited by the page (the VA3M copy also has hover-text columns Short_BU / Short_GBU; Nestlé has not).
- New: `Admin/Clients`, `Admin/SaveClient`, `Admin/ClientDivisions`, `Admin/SaveDivision`, `Admin/SetDivisionStatus`,
  `Admin/DeleteDivision` (`Services/ClientAdmin.cs`, `Tests/ClientAdminTests.cs`); UI `/admin/clients`
  (`AdminClients.jsx`): list with search / status filter and division counts, add / edit dialog, hierarchy dialog with
  search, Contacts / Enquiries counts per division, activate / deactivate, delete only when unused.
- Differences: name / city / phone patterns are checked only when the value changes (migrated names like "Nestlé" stay
  editable); one client name per country; one entity + business unit per country within a client; delete of a used
  division is refused (deactivate instead).
- Open: saving not yet run against a real database.

### Download Data (DownloadData.aspx) — in progress
- Legacy: MasterAdmin; pick Supplier List / PMGUser List / Client List and a country (fixed list; suppliers matched by
  the country's currency, users and contacts by the country name) → ClosedXML workbook from inline SQL.
- Legacy problems: the sheets listed **passwords in clear text** (tblUser.Password); with "All" the supplier-users sheet
  compared the currency with "All" and was always empty; one result set was written to two sheets.
- New: `Admin/DownloadDataOptions`, `Admin/DownloadData` (returns the .xlsx, or a Result with the message;
  `Services/DownloadDataAdmin.cs`); UI `/admin/download-data`. Sheets — suppliers: Suppliers, Supplier users, Supplier
  details (active logins, test suppliers left out); PMG users: PMG users, PMG user logins, Active PMG users (internal
  va@pmgasia.com left out); clients: Client logins, Active clients. Countries come from tblCountry. No passwords.
- Checked against the stage copy: all six list / country combinations download (e.g. suppliers All: 1,475 suppliers,
  1,495 users).

### Catalogue Usage (CatalogueUsage.aspx) — in progress
- Not a report: the tblCatalogueUsage values the enquiry form offers as "local catalogue" (VA dropdowns, active rows,
  "N/A" selected by default). Line items store the **text** (tblEnquiryDetails.CatalogueUsage).
- Legacy: list active rows, add (plain insert, Status left empty), delete (hard). No edit.
- New: `Admin/CatalogueUsages`, `Admin/AddCatalogueUsage`, `Admin/SetCatalogueUsageStatus`, `Admin/DeleteCatalogueUsage`
  (`Services/CatalogueUsageAdmin.cs`); UI `/admin/catalogue-usage`: inactive rows listed (filter), activate / deactivate,
  line-item usage count, new rows active, duplicates refused (an inactive duplicate is pointed out), N/A protected.
  Delete stays possible (line items keep the text). The `country` column (catalog campaigns) is not touched.

### Environment Impacts / Comparison (EnvironmentImpacts.aspx, EnvironmentalComparison.aspx) — in progress
- tblenvironmentalimpact: factors per Material + Type (embodied carbon, water, energy, wood use; text columns). VA's
  environmental calculation takes the first **active** row matching material + type and multiplies by the weight; a
  non-numeric factor silently gives an empty value. tblenvironmentcomparison: one row of constants (per car, pool,
  refrigerator, tree; wood density) used when an item is calculated and live when its comparison is shown.
- Legacy: SQL built from the raw input (injection), only Material required, comparison update without WHERE.
- Schema note: both tables have an identity `id` but no primary key; the EF model mapped them keyless (read-only). The
  model now keys them on `id` (no database change).
- New: `Admin/EnvironmentImpacts`, `Admin/SaveEnvironmentImpact`, `Admin/EnvironmentComparison`,
  `Admin/SaveEnvironmentComparison` (`Services/EnvironmentAdmin.cs`); UI `/admin/environment-impacts` (material filter,
  add / edit) and `/admin/environment-comparison` (one form, each constant explained). Type required, factors numbers ≥ 0
  (a migrated value such as "N.A" kept unchanged stays editable), one active row per material + type, comparison
  divisors > 0 and wood density ≥ 0; every comparison row is updated (as before), a missing one is created.
- Tests: `Tests/ReportAdminTests.cs` (Catalogue Usage, Environment, Download Data incl. "no passwords").
- Open: saving not yet run against a real database.

### Countries (new, Settings) — in progress
- Requested 2026-11-20: a menu to manage countries, and **only active countries in every other admin drop-down**.
- tblCountry: one row per country — Id (not identity; new = max + 1), Country, Code, Currency, Language,
  RegionalSetting (number culture of quotes / POs; an unknown one falls back to en-US), TimeOffset (minutes, JavaScript
  sign: -480 = UTC+8), TaxPercentage (text, read with Convert.ToDecimal), Status, SAPNeeded; SPOTNeeded / PAPMNeeded
  are added and set by the VAAPI console "Sync DB" (missing on the stage copy).
- References: by **id** (enquiries' PmgEntity / DeliveryCountry, user country ids) and by **name as text** (clients,
  divisions, client contacts, suppliers, PMG users; suppliers also by currency in Download Data).
- New: `Admin/Countries`, `Admin/SaveCountry` (`Services/CountryAdmin.cs`, `Tests/CountryAdminTests.cs`); UI
  `/admin/countries`: list with usage counts, add / edit, time zone picked as UTC±hh:mm. Rules: no delete; name and code
  unique; a name stored on other records cannot be renamed (trimming is allowed: "Italy\r\n" is flagged "Needs
  cleaning"); code 2–3 letters; tax 0–100; changed regional setting must be a known culture; SAP / SPOT / PAPM shown
  read-only (VAAPI console). Inserts write only the base columns (SPOT / PAPM may be missing); updates touch only the
  edited columns.
- Active-only drop-downs: Clients (country, language, currency, division country), Suppliers (country, language,
  currency, list filter), PMG users (country, list filter), SLA (country, list filter), Download Data (country; "All"
  still covers every country). Saves accept an active country or the record's current one, so records in a country
  deactivated later stay editable (the form shows "China (inactive)"). VA's own country drop-down already listed
  active countries only.
- Stage-copy observations (not changed): China is inactive but used by 423 suppliers (they keep it, but no new Chinese
  supplier can be added and Download Data cannot pick China alone); Switzerland's time offset is -480 (UTC+8) and
  Usa's -60 (UTC+1); France / Netherlands currency "Euro" while Germany uses "EUR"; Italy's name ends with a line break.
- Open: saving not yet run against a real database. Admins signed on before this change need to sign on again to get
  the Countries menu (menus come with the sign-on).

### Drop-down Lists (new, Settings) — in progress
- Requested 2026-11-20: a master for the enquiry form lists hardcoded in `VAController` — Year, Type of Job
  (`MasterDropdowns`), Project Attribute (`MasterDropdowns`; its field is commented out in the form), Savings Type
  (`EnqLineItemsDropdowns`) — and use it wherever these values are needed.
- Storage: `tblDropdownValue` (ListKey, Value, Label, SortOrder, IsSystem, Status, ModifiedBy / On);
  `NestleDB/Scripts/Create_tblDropdownValue.sql` creates and seeds it with the same numbers and labels (idempotent).
  Until it has run, the API offers the built-in values (a database without the table is asked again after 5 minutes)
  and the admin page is read-only.
- Enquiries store the **label as text** (tblEnquiryMaster.Year / Projectattribute / Savingstype, tblEnquiryDetails
  Printornonprint / Savingstype; also tblSavingReasons.Savingstype, tblSubCategory.Typeofjob, tblProductCategory
  CategoryJob), and the UI also checks the **number** (Type of Job 3 = Promo). Rules: no delete; Value fixed; one
  label per list; a label stored on records, or read by the application (IsSystem: Print / POSM / Promo and the three
  savings types), cannot be renamed; at least one active value per list; no comma (sub items store jobs as a comma
  list); Savings Types cannot be added (each needs savings reasons, which have no admin page).
- Deactivated values: the API still sends them flagged `inactive`; the forms (`activeOptions` in common.jsx: enquiry
  details, line items, update line items, savings reasons table) offer one only as the record's current value.
- Also reading the master: Sub Item (jobs) and Products (catalogue job) offer the active Type of Job values plus the
  record's own job. A new job offers every type of item and material (GetTypeOfItems / GetMaterialUsed fallback) and
  the sub items ticked for it. Fixed on the way: a sub item with several jobs ("Print,POSM") was never offered in the
  enquiry form (exact match on Typeofjob); it is now offered for each of its jobs.
- New: `Admin/DropdownLists`, `Admin/SaveDropdownValue` (`Services/DropdownListAdmin.cs`,
  `Tests/DropdownListAdminTests.cs`); UI `/admin/dropdown-lists` (`AdminDropdownLists.jsx`): list switcher, usage per
  value ("353 enquiries"), stored text that matches no value, add / edit dialog with the rename lock explained.
- Stage-copy observations (not changed): Year also stores "Year1" / "Year2" (4 enquiries), Project Attribute
  "Re-Engeneering" (3) and "use and resuse" (1) — those records show the field blank when edited, as before;
  Printornonprint holds test values ("Print test" 36, "Test 5" 9, ...). Not in scope: Type of Item / Material Used job
  categories ("Both", "PrintandPOSM") and the line item's TOJABC list (Strategic / Tactical / ...), still hardcoded
  (moved to the master on 2026-11-20, then reverted at the user's request).
- Open: the script is not yet run on dbvanestle; saving not yet run against a real database.

### Admin console navigation (2026-11-20)
- The navbar group drop-downs are replaced by `container/layout/AdminLayout.jsx`: a sticky left sidebar
  (`AdminSidebar.jsx`: every allowed page grouped with icons, live filter, current page highlighted, collapsible to
  icons, drawer + floating "Menu" button on phones) and a quick search (`AdminQuickSearch.jsx`, Ctrl / ⌘ + K, also from
  the navbar search pill and the dashboard; recently opened pages first). Menu items carry `icon` and `description`
  in `adminMenu.js`.
- The layout refreshes the admin's menus from `Admin/Menus` on load (pages wait for it), so menus added after sign-on
  (e.g. Countries) appear without signing on again.
- The dashboard is a welcome banner (quick search, recently opened) plus tiles per area. The migration tracker card and
  the "In testing" / "Coming soon" badges are removed; every module is marked completed / tested
  (`migrationTracker.js` now only feeds the login page's maintenance panel).
