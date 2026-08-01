---@type table Console log helper (shared.log): tagged colour-coded prints.
local log = require 'shared.log'

-- Shared deliberately: ox_inventory populates an item registry on BOTH sides and exposes it
-- through the same Items() export, so one module serves two unrelated purposes. The client
-- builds its display grid from the client copy - which means opening the panel ships no item
-- data over the network at all - while the server builds an independent copy that is the sole
-- authority for validation. The two are never compared; the server never trusts the client's.
--
-- The one asymmetry worth knowing: ox strips `server` handlers from the client registry, so an
-- item that is only server-usable categorises as 'misc' client-side and 'usable' server-side.
-- That moves which filter chip it appears under and nothing else.

---@class CatalogEntry
---@field name string ox_inventory item key, e.g. 'WEAPON_PISTOL'.
---@field label string Display label, falling back to the key.
---@field weight number Unit weight in grams.
---@field stack boolean Whether copies merge into one slot.
---@field close boolean Whether using it closes the inventory.
---@field description string|nil Tooltip text from items.lua.
---@field degrade number|nil Minutes to full decay, when the item degrades.
---@field category string Derived bucket - see categorise() below.
---@field image string Filename to append to config.ImagePath.
---@field usable boolean|nil True when the item has a client or server use handler.
---@field ammoname string|nil For weapons, the ammo item they consume.

---@type table Catalog module; the table returned at end of file.
local catalog = {}

---@type CatalogEntry[] Sorted array, built once on first request and reused. ox_inventory's
---registry does not change after its own startup, so there is nothing to invalidate.
local list = {}

---@type table<string, CatalogEntry> Same entries keyed by name, for O(1) validation lookups.
local index = {}

---@type boolean Whether build() has run. Tracked separately from the tables above so both stay
---non-nil for their whole lifetime and every read site is a plain index, not a nil check.
local built = false

---Derive a display category. ox_inventory has no category field of its own, so this is
---inferred from the name prefixes ox uses for generated entries plus the presence of a use
---handler. Deliberately inference-only: it needs no edits to anyone's items.lua, and a wrong
---guess costs a filter chip, not correctness.
---@param name string item key
---@param item table raw ox_inventory item definition
---@return string category 'weapons' | 'ammo' | 'components' | 'usable' | 'misc'
local function categorise(name, item)
    if item.weapon or name:find('^WEAPON_') then return 'weapons' end
    if item.ammo or item.ammoname == name or name:find('^ammo') then return 'ammo' end
    if name:find('^COMPONENT_') or name:find('^at_') then return 'components' end
    if item.client or item.server or item.buttons then return 'usable' end
    return 'misc'
end

---Build the sanitised catalog from ox_inventory's live registry. Using the Items() export
---rather than reading data/items.lua off disk means weapons, ammo and components are all
---included (ox merges data/weapons.lua into the same registry), and any item another resource
---registered at runtime shows up too - neither of which a text parse of items.lua would catch.
---@return CatalogEntry[] entries sorted by label
---@return table<string, CatalogEntry> byName
local function build()
    local raw = exports.ox_inventory:Items()

    if type(raw) ~= 'table' then
        log.error('catalog', 'ox_inventory:Items() returned %s — is ox_inventory started?', type(raw))
        return {}, {}
    end

    local entries, byName = {}, {}

    for name, item in pairs(raw) do
        -- ox_inventory keys its registry by string; anything else is not an item we can spawn.
        if type(name) == 'string' and type(item) == 'table' then
            local entry = {
                name = name,
                label = item.label or name,
                weight = item.weight or 0,
                stack = item.stack ~= false,
                close = item.close ~= false,
                description = item.description,
                degrade = item.degrade,
                category = categorise(name, item),
                -- ox lets an item override its icon via client.image; otherwise the convention
                -- is <name>.png in ox_inventory/web/images.
                image = (item.client and item.client.image) or (name .. '.png'),
                usable = (item.client or item.server) and true or nil,
                ammoname = item.ammoname,
            }

            entries[#entries + 1] = entry
            byName[name] = entry
        end
    end

    table.sort(entries, function(a, b) return a.label:lower() < b.label:lower() end)

    log.info('catalog', 'indexed %d items from ox_inventory', #entries)
    return entries, byName
end

---Populate both views on first use. Idempotent.
local function ensure()
    if built then return end
    list, index = build()
    built = true
end

---The full catalog, built on first call.
---@return CatalogEntry[] entries sorted by label
function catalog.list()
    ensure()
    return list
end

---Look up one entry by exact item name. This is the authority for "does this item exist" -
---validation resolves the client's bare item key through here and reads label/weight/stack off
---the result, so nothing the client claimed about an item is ever trusted or echoed back.
---@param name string item key
---@return CatalogEntry|nil
function catalog.get(name)
    ensure()
    return index[name]
end

---Item count per category, for the filter rail's badges. Computed here rather than in the NUI
---so the rail can render its counts before the grid has finished its first virtualised pass.
---@return table<string, number> counts keyed by category
function catalog.counts()
    local entries = catalog.list()
    local counts = {}

    for i = 1, #entries do
        local category = entries[i].category
        counts[category] = (counts[category] or 0) + 1
    end

    return counts
end

return catalog
