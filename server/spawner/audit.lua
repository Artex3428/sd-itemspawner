---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
---@type table Console log helper (shared.log): tagged colour-coded prints.
local log = require 'shared.log'

---@type table Audit-logging config (config.Security.Logs).
local CFG = config.Security.Logs or {}

---@type table Audit module; the table returned at end of file.
local audit = {}

---Readable actor string for a server id: "Name (src 4) [license:abc...]". Built from natives
---only, so this module has no framework dependency and works before a character is loaded.
---@param src number player server id
---@return string actor
local function actorOf(src)
    local name = GetPlayerName(src) or '?'
    -- tostring: the native is declared as taking a string playerSrc, and passing the number
    -- works at runtime but trips the type checker.
    local license = GetPlayerIdentifierByType(tostring(src), 'license') or 'unknown'
    return ('%s (src %d) [%s]'):format(name, src, license)
end

---One-line summary of what was spawned, e.g. "3x Bandage, 1x Pistol (WEAPON_PISTOL)".
---Truncated past six entries so a 64-item loadout does not produce an unreadable log line -
---the structured `items` field below carries the full list for anyone querying it.
---@param rows table[] validated rows
---@return string summary
local function summarise(rows)
    local parts = {}

    for i = 1, math.min(#rows, 6) do
        parts[i] = ('%dx %s (%s)'):format(rows[i].count, rows[i].label, rows[i].name)
    end

    if #rows > 6 then
        parts[#parts + 1] = ('and %d more'):format(#rows - 6)
    end

    return table.concat(parts, ', ')
end

---Human-readable description of who received the spawn.
---@param target table validated target
---@param recipientCount number how many players it resolved to
---@return string description
local function targetOf(target, recipientCount)
    if target.mode == 'self' then return 'themselves' end
    if target.mode == 'player' then
        return ('%s (src %d)'):format(GetPlayerName(target.playerId) or '?', target.playerId)
    end
    if target.mode == 'all' then return ('everyone online (%d)'):format(recipientCount) end
    return ('nearby players (%d)'):format(recipientCount)
end

---Record a completed spawn. Writes to ox_lib's logger when a backend is configured (a no-op
---otherwise, so this is safe on an unconfigured server) and, separately, to the console -
---the console line is what makes the tool auditable on a server with no external log sink.
---@param src number acting admin's server id
---@param rows table[] validated rows
---@param target table validated target
---@param ids number[] resolved recipient server ids
---@param delivered number successful item-to-player deliveries
---@param failures table[] per-recipient failures
function audit.give(src, rows, target, ids, delivered, failures)
    if not CFG.Enabled then return end

    local summary = ('%s spawned %s for %s — %d delivered, %d failed')
        :format(actorOf(src), summarise(rows), targetOf(target, #ids), delivered, #failures)

    if CFG.Console then
        log.info('audit', summary)
    end

    -- lib.logger is nil until an ox:logger backend is configured; guarded so an unconfigured
    -- server gets the console line above and no error.
    if lib and lib.logger then
        lib.logger(src, 'itemSpawn', summary, {
            mode = target.mode,
            recipients = #ids,
            delivered = delivered,
            failed = #failures,
            items = rows,
        })
    end
end

---Record a refused request. These are the interesting lines on a server where someone is
---probing the endpoints, so they log at warn level regardless of the console switch.
---@param src number requesting player's server id
---@param endpoint string which callback refused
---@param reason string locale key for the refusal
function audit.denied(src, endpoint, reason)
    if not CFG.Enabled then return end
    log.warn('audit', '%s denied at %s — %s', actorOf(src), endpoint, reason)
end

return audit
