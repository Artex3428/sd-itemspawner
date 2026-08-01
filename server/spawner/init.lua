---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
---@type table Console log helper (shared.log): tagged colour-coded prints.
local log = require 'shared.log'
---@type table Authorisation (server.spawner.session): the grant table and its four-check gate.
local session = require 'server.spawner.session'
---@type table Request validation (server.spawner.validate): rebuilds every client payload.
local validate = require 'server.spawner.validate'
---@type table Delivery (server.spawner.give): target resolution + ox_inventory AddItem.
local give = require 'server.spawner.give'
---@type table Saved loadouts (server.spawner.presets): per-admin JSON store.
local presets = require 'server.spawner.presets'
---@type table Audit trail (server.spawner.audit).
local audit = require 'server.spawner.audit'

---@type table Server-only security policy (configs/server/security.lua).
local SEC = config.Security

---Wrap a callback handler in the session gate. Every privileged endpoint goes through here, so
---there is exactly one place where "is this caller allowed" is decided and exactly one shape of
---refusal - no endpoint can be added later that forgets the check, because the registration
---helper below is the only way one gets registered.
---@param endpoint string short name for the audit line
---@param handler fun(source: number, data: any): table
---@return fun(source: number, data: any): table
local function guard(endpoint, handler)
    return function(source, data)
        local allowed, reason = session.assert(source)

        if not allowed then
            audit.denied(source, endpoint, reason or 'err.not_allowed')
            return { ok = false, error = reason or 'err.not_allowed' }
        end

        return handler(source, data)
    end
end

---Register a guarded lib.callback. Callbacks rather than net events throughout: one validated
---entry point per action, and the caller gets a typed result back instead of having to listen
---for a separate reply event.
---@param name string suffix after 'sd-itemspawner:server:'
---@param handler fun(source: number, data: any): table
local function endpoint(name, handler)
    lib.callback.register('sd-itemspawner:server:' .. name, guard(name, handler))
end

---Everyone currently connected, for the target picker. Names only - no identifiers, no
---coordinates, nothing the panel does not draw.
---@return table[] players array of { id, name }
local function playerList()
    local raw = GetPlayers()
    local players = {}

    for i = 1, #raw do
        local id = tonumber(raw[i])

        if id then
            players[#players + 1] = { id = id, name = GetPlayerName(id) or ('Player %d'):format(id) }
        end
    end

    table.sort(players, function(a, b) return a.id < b.id end)
    return players
end

-- One call on open: the presets this admin owns, who is online, and the caps the panel should
-- mirror in its own controls. The item catalog is deliberately NOT here - the client builds
-- that from its own ox_inventory registry (see shared/catalog.lua).
endpoint('bootstrap', function(source)
    return {
        ok = true,
        presets = presets.list(session.identifier(source) or ''),
        players = playerList(),
        self = { id = source, name = GetPlayerName(source) or 'You' },
        limits = {
            maxCount = SEC.MaxCount,
            maxSelection = SEC.MaxSelection,
            nearbyRadius = SEC.NearbyRadius,
        },
    }
end)

-- Refresh for the target picker while the panel is open.
endpoint('players', function()
    return { ok = true, players = playerList() }
end)

-- The one that matters. Selection and target are both rebuilt from scratch server-side before
-- anything is handed to ox_inventory, and the rate-limit token is spent only after validation
-- passes so a malformed request cannot be used to drain someone's bucket.
endpoint('give', function(source, data)
    if type(data) ~= 'table' then return { ok = false, error = 'err.bad_request' } end

    local rowsOk, rows, rowsReason = validate.selection(data.rows)
    if not rowsOk then return { ok = false, error = rowsReason } end

    local targetOk, target, targetReason = validate.target(data.target)
    if not targetOk then return { ok = false, error = targetReason } end

    if not session.consumeToken(source) then
        audit.denied(source, 'give', 'err.rate_limited')
        return { ok = false, error = 'err.rate_limited' }
    end

    local result = give.execute(source, rows, target)
    result.ok = true

    return result
end)

endpoint('presetSave', function(source, data)
    if type(data) ~= 'table' then return { ok = false, error = 'err.bad_request' } end

    local identifier = session.identifier(source)
    if not identifier then return { ok = false, error = 'err.no_session' } end

    local ok, reason = presets.save(identifier, data.name, data.rows)
    if not ok then return { ok = false, error = reason } end

    return { ok = true, presets = presets.list(identifier) }
end)

endpoint('presetDelete', function(source, data)
    if type(data) ~= 'table' then return { ok = false, error = 'err.bad_request' } end

    local identifier = session.identifier(source)
    if not identifier then return { ok = false, error = 'err.no_session' } end

    local ok, reason = presets.delete(identifier, data.name)
    if not ok then return { ok = false, error = reason } end

    return { ok = true, presets = presets.list(identifier) }
end)

-- Spawning a preset re-validates its stored rows rather than replaying them, because a preset
-- outlives the catalog it was built against: an item can be pulled from items.lua or added to
-- the blacklist between saving and using it.
endpoint('presetSpawn', function(source, data)
    if type(data) ~= 'table' then return { ok = false, error = 'err.bad_request' } end

    local identifier = session.identifier(source)
    if not identifier then return { ok = false, error = 'err.no_session' } end

    local rowsOk, rows, rowsReason = presets.resolve(identifier, data.name)
    if not rowsOk then return { ok = false, error = rowsReason } end

    local targetOk, target, targetReason = validate.target(data.target)
    if not targetOk then return { ok = false, error = targetReason } end

    if not session.consumeToken(source) then
        audit.denied(source, 'presetSpawn', 'err.rate_limited')
        return { ok = false, error = 'err.rate_limited' }
    end

    local result = give.execute(source, rows, target)
    result.ok = true

    return result
end)

---@type string[] Command names. ox_lib accepts an array and registers each against the same
---handler; the ACE it derives is `command.<first name>`, which is why config.Command is the
---one that names the permission and CommandAlias is only ever a convenience.
local names = { config.Command }
if config.CommandAlias then names[#names + 1] = config.CommandAlias end

-- The single entry point. `restricted` makes ox_lib run `add_ace <Group> command.<name> allow`
-- at registration and register the command as restricted, so FiveM's own permission check
-- rejects an unprivileged caller before this handler ever runs. That is what makes membership
-- in the session table a sufficient credential everywhere else: there is no other way in.
lib.addCommand(names, {
    help = locale('command.help'),
    restricted = SEC.Group,
}, function(source)
    if not session.grant(source) then return end
    TriggerClientEvent('sd-itemspawner:client:open', source)
end)

log.info(nil, 'ready — /%s (ace: command.%s, group: %s)', config.Command, config.Command, SEC.Group)
