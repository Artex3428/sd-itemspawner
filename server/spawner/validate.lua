---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
---@type table Item registry (shared.catalog). Server-side this is built from the server's own
---ox_inventory registry and is the sole authority on what exists and what it weighs.
local catalog = require 'shared.catalog'

---@type table Server-only security policy (configs/server/security.lua).
local SEC = config.Security

---@type table Validation module; the table returned at end of file.
--- Pure functions, no state. Every one of them takes what the client sent and returns either a
--- freshly-built, server-owned value or a locale key explaining the refusal - the client's
--- version of a value is never passed through, only used to look ours up.
local validate = {}

---@type table<string, boolean> Accepted target modes, as a set.
local MODES = { self = true, player = true, all = true, nearby = true }

---Check one metadata value is a scalar we are willing to hand to ox_inventory, and that a
---string one is inside the length cap.
---@param value any
---@return boolean ok
local function scalarOk(value)
    local kind = type(value)
    if kind == 'number' or kind == 'boolean' then return true end
    if kind == 'string' then return #value <= SEC.Metadata.MaxStringLength end
    return false
end

---Recursively bound a metadata table on every axis a caller controls: key count, nesting depth,
---key type and value type/length. Metadata is the one payload where the client picks both the
---shape and the size of what reaches the inventory, so an unbounded table here is a memory and
---a save-file problem - hence the hard limits rather than truncation.
---@param value any candidate metadata
---@param depth number current nesting level, 1 at the top
---@return boolean ok
---@return string|nil reason locale key when rejected
local function boundTable(value, depth)
    if depth > SEC.Metadata.MaxDepth then return false, 'err.meta_depth' end

    local keys = 0

    for key, entry in pairs(value) do
        if type(key) ~= 'string' then return false, 'err.meta_key' end
        if #key > SEC.Metadata.MaxStringLength then return false, 'err.meta_key' end

        keys = keys + 1
        if keys > SEC.Metadata.MaxKeys then return false, 'err.meta_keys' end

        if type(entry) == 'table' then
            local ok, reason = boundTable(entry, depth + 1)
            if not ok then return false, reason end
        elseif not scalarOk(entry) then
            return false, 'err.meta_value'
        end
    end

    return true
end

---Validate client-supplied metadata. Absent or empty metadata is valid and resolves to nil, so
---ox_inventory generates its own defaults (weapon serials, durability) rather than receiving an
---empty table that would suppress them.
---@param value any candidate metadata
---@return boolean ok
---@return table|nil metadata normalised metadata, or nil for "none"
---@return string|nil reason locale key when rejected
function validate.metadata(value)
    if value == nil then return true, nil end
    if type(value) ~= 'table' then return false, nil, 'err.meta_type' end
    if next(value) == nil then return true, nil end

    local ok, reason = boundTable(value, 1)
    if not ok then return false, nil, reason end

    return true, value
end

---Validate one requested { name, count, metadata } row against the live catalog and the caps.
---The returned row is rebuilt from the catalog entry, so a client that lied about an item's
---label or weight gains nothing - those fields are read from our side or not at all.
---@param row any candidate row from the NUI
---@return boolean ok
---@return table|nil resolved { name, count, metadata, label }
---@return string|nil reason locale key when rejected
function validate.row(row)
    if type(row) ~= 'table' then return false, nil, 'err.bad_request' end
    if type(row.name) ~= 'string' then return false, nil, 'err.bad_request' end

    local entry = catalog.get(row.name)
    if not entry then return false, nil, 'err.unknown_item' end
    if SEC.Blacklist[entry.name] then return false, nil, 'err.blacklisted' end

    local count = row.count
    if type(count) ~= 'number' or count ~= math.floor(count) then return false, nil, 'err.bad_count' end
    -- Rejected rather than clamped: a count above the cap means the request did not come from
    -- our NUI, which caps its own stepper, and silently honouring a smaller number would hide that.
    if count < 1 or count > SEC.MaxCount then return false, nil, 'err.bad_count' end

    local metaOk, metadata, metaReason = validate.metadata(row.metadata)
    if not metaOk then return false, nil, metaReason end

    return true, { name = entry.name, count = count, metadata = metadata, label = entry.label }
end

---Validate the whole selection: a non-empty array of rows, inside the selection cap.
---@param rows any candidate selection from the NUI
---@return boolean ok
---@return table[]|nil resolved
---@return string|nil reason locale key when rejected
function validate.selection(rows)
    if type(rows) ~= 'table' then return false, nil, 'err.bad_request' end

    local count = #rows
    if count == 0 then return false, nil, 'err.empty_selection' end
    if count > SEC.MaxSelection then return false, nil, 'err.selection_too_large' end

    local resolved = {}

    for i = 1, count do
        local ok, row, reason = validate.row(rows[i])
        if not ok then return false, nil, reason end
        resolved[i] = row
    end

    return true, resolved
end

---Validate the target descriptor. 'player' additionally requires an integer server id that is
---currently connected - checked here so give.lua can assume a live target.
---@param target any candidate target from the NUI
---@return boolean ok
---@return table|nil resolved { mode, playerId }
---@return string|nil reason locale key when rejected
function validate.target(target)
    if type(target) ~= 'table' then return false, nil, 'err.bad_request' end
    if not MODES[target.mode] then return false, nil, 'err.bad_target' end

    if target.mode ~= 'player' then return true, { mode = target.mode } end

    local playerId = target.playerId
    if type(playerId) ~= 'number' or playerId ~= math.floor(playerId) then
        return false, nil, 'err.bad_target'
    end

    -- GetPlayerName returns nil for a server id nobody holds, which is our liveness test.
    if not GetPlayerName(playerId) then return false, nil, 'err.target_offline' end

    return true, { mode = 'player', playerId = playerId }
end

return validate
