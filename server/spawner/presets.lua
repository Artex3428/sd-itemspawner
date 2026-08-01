---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
---@type table Console log helper (shared.log): tagged colour-coded prints.
local log = require 'shared.log'
---@type table Request validation (server.spawner.validate): rows are re-validated on save.
local validate = require 'server.spawner.validate'

---@type table Server-only security policy (configs/server/security.lua).
local SEC = config.Security

---@type string Where the store lives, relative to the resource root. A flat JSON file rather
---than a database table: presets are a convenience for a handful of admins, and shipping a
---.sql file for that would put an import step in front of a tool you install to save time.
local FILE = 'data/presets.json'

---@type table<string, table[]> Presets keyed by admin identifier, loaded once at boot.
local store = {}

---@type table Presets module; the table returned at end of file.
local presets = {}

---Read the store off disk. A missing or unreadable file is normal on first run and yields an
---empty store; a corrupt one is reported and also yields empty, so a bad file degrades the
---feature rather than breaking resource start.
local function load()
    local raw = LoadResourceFile(GetCurrentResourceName(), FILE)
    if not raw or raw == '' then return end

    local ok, decoded = pcall(json.decode, raw)

    if not ok or type(decoded) ~= 'table' then
        log.error('presets', '%s is not readable JSON — starting from an empty store', FILE)
        return
    end

    store = decoded
    log.debug('presets', 'loaded presets for %d admin(s)', #decoded)
end

---Flush the store to disk. Called after every mutation; the file is small enough (a few KB per
---admin) that batching writes would add failure modes without buying anything.
local function persist()
    local ok = SaveResourceFile(GetCurrentResourceName(), FILE, json.encode(store), -1)
    if not ok then
        log.error('presets', 'failed to write %s — is the resource folder writable?', FILE)
    end
    return ok
end

---Every preset belonging to one admin.
---@param identifier string owning admin's identifier
---@return table[] presets array of { name, rows }
function presets.list(identifier)
    return store[identifier] or {}
end

---Save or overwrite a named preset. Rows are re-validated here rather than trusted from the
---selection that produced them: a preset outlives the session that created it, and an item can
---be removed from items.lua or added to the blacklist in between, so the stored copy has to be
---checked at save time and again when it is spawned.
---@param identifier string owning admin's identifier
---@param name any candidate preset name from the NUI
---@param rows any candidate rows from the NUI
---@return boolean ok
---@return string|nil reason locale key when rejected
function presets.save(identifier, name, rows)
    if type(name) ~= 'string' then return false, 'err.bad_request' end

    name = name:gsub('^%s+', ''):gsub('%s+$', '')
    if name == '' or #name > 48 then return false, 'err.bad_preset_name' end

    local ok, resolved, reason = validate.selection(rows)
    if not ok then return false, reason end

    local owned = store[identifier]

    if not owned then
        owned = {}
        store[identifier] = owned
    end

    -- Same name overwrites, so saving twice is an update rather than a silent duplicate.
    for i = 1, #owned do
        if owned[i].name == name then
            owned[i].rows = resolved
            persist()
            return true
        end
    end

    if #owned >= SEC.MaxPresets then return false, 'err.preset_limit' end

    owned[#owned + 1] = { name = name, rows = resolved }
    persist()

    return true
end

---Delete a named preset.
---@param identifier string owning admin's identifier
---@param name any candidate preset name from the NUI
---@return boolean ok
---@return string|nil reason locale key when rejected
function presets.delete(identifier, name)
    if type(name) ~= 'string' then return false, 'err.bad_request' end

    local owned = store[identifier]
    if not owned then return false, 'err.unknown_preset' end

    for i = 1, #owned do
        if owned[i].name == name then
            table.remove(owned, i)
            persist()
            return true
        end
    end

    return false, 'err.unknown_preset'
end

---Re-validate a stored preset's rows before it is spawned. Catches the case above: an item
---that existed when the preset was saved but has since been removed or blacklisted.
---@param identifier string owning admin's identifier
---@param name any candidate preset name from the NUI
---@return boolean ok
---@return table[]|nil rows
---@return string|nil reason locale key when rejected
function presets.resolve(identifier, name)
    if type(name) ~= 'string' then return false, nil, 'err.bad_request' end

    local owned = store[identifier]
    if not owned then return false, nil, 'err.unknown_preset' end

    for i = 1, #owned do
        if owned[i].name == name then
            return validate.selection(owned[i].rows)
        end
    end

    return false, nil, 'err.unknown_preset'
end

load()

return presets
