---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
---@type table Console log helper (shared.log): tagged colour-coded prints.
local log = require 'shared.log'

---@type table Server-only security policy (configs/server/security.lua).
local SEC = config.Security

---@type string The ACE ox_lib registers from lib.addCommand's `restricted` option. The command
---itself is gated by FiveM's restricted-command check; we re-test the same ACE on every
---privileged call so a mid-session permission removal takes effect immediately rather than at
---the next TTL boundary.
local ACE = 'command.' .. config.Command

---@class Session
---@field identifier string Owning player's identifier, captured at grant time.
---@field grantedAt number GetGameTimer() ms when the command was run.
---@field tokens number Rate-limit bucket contents.
---@field refilledAt number GetGameTimer() ms of the last bucket refill.

---@type table<number, Session> Live sessions keyed by player server id. Membership in this
---table IS the authorisation: the only writer is session.grant, and its only caller is the
---lib.addCommand handler, which ox_lib will not run without the ACE. Nothing else can add
---an entry, so there is no path into the privileged callbacks that skips the permission check.
local sessions = {}

---@type table Session module; the table returned at end of file.
local session = {}

---Resolve a stable identity for a player. Prefers the Rockstar license (stable across
---reconnects and unique per account); falls back to whatever identifier slot 0 holds on
---servers where license is unavailable.
---@param src number player server id
---@return string|nil identifier
local function identifierOf(src)
    -- tostring: these natives are declared as taking a string playerSrc. Passing the number
    -- works at runtime, but the annotation is strict and the cast costs nothing.
    return GetPlayerIdentifierByType(tostring(src), 'license') or GetPlayerIdentifier(tostring(src), 0)
end

---Open a session for a player who has just cleared the ACE gate on the command.
---Re-grants overwrite, which also resets the rate-limit bucket - re-running the command is
---the documented way to clear a rate limit you tripped.
---@param src number player server id
---@return boolean granted false when the player has no readable identifier (should not happen)
function session.grant(src)
    local identifier = identifierOf(src)

    if not identifier then
        log.error('session', 'refusing to grant src=%d — no readable identifier', src)
        return false
    end

    sessions[src] = {
        identifier = identifier,
        grantedAt = GetGameTimer(),
        tokens = SEC.RateLimit.Burst,
        refilledAt = GetGameTimer(),
    }

    log.info('session', 'granted to %s (src %d)', GetPlayerName(src) or '?', src)
    return true
end

---Close a player's session. Idempotent.
---@param src number player server id
---@param reason string why, for the debug line
function session.revoke(src, reason)
    if not sessions[src] then return end
    sessions[src] = nil
    log.debug('session', 'revoked src=%d (%s)', src, reason)
end

---Gate for every privileged endpoint. Four checks, cheapest first:
---
--- 1. a session exists at all — rejects anyone who never ran the command;
--- 2. the ACE still holds — rejects an admin whose permission was pulled mid-session;
--- 3. the identifier still matches — rejects server-id reuse, where a player disconnects and
---    the next joiner is handed their now-free slot along with their open session;
--- 4. the session is inside its TTL — bounds how long a walked-away-from panel stays live.
---
---@param src number player server id
---@return boolean allowed
---@return string|nil reason locale key describing the refusal, when not allowed
function session.assert(src)
    local entry = sessions[src]

    if not entry then
        log.debug('session', 'assert src=%d — no session', src)
        return false, 'err.no_session'
    end

    if not IsPlayerAceAllowed(tostring(src), ACE) then
        session.revoke(src, 'ace revoked')
        log.warn('session', 'src=%d lost %s mid-session — access revoked', src, ACE)
        return false, 'err.not_allowed'
    end

    if identifierOf(src) ~= entry.identifier then
        session.revoke(src, 'identifier mismatch')
        log.warn('session', 'src=%d identifier changed since grant — treating as a reused server id', src)
        return false, 'err.no_session'
    end

    if SEC.SessionTTL and (GetGameTimer() - entry.grantedAt) > (SEC.SessionTTL * 1000) then
        session.revoke(src, 'ttl expired')
        return false, 'err.session_expired'
    end

    return true
end

---Spend one rate-limit token, refilling the bucket for elapsed time first. One spawn action
---costs one token no matter how many items or targets it carries, so the limit bounds request
---volume rather than punishing a legitimately large loadout.
---@param src number player server id
---@return boolean allowed false when the bucket is empty
function session.consumeToken(src)
    local entry = sessions[src]
    if not entry then return false end

    local now = GetGameTimer()
    local elapsed = (now - entry.refilledAt) / 1000

    entry.tokens = math.min(SEC.RateLimit.Burst, entry.tokens + (elapsed * SEC.RateLimit.Rate))
    entry.refilledAt = now

    if entry.tokens < 1 then
        log.warn('session', 'src=%d rate limited (bucket empty)', src)
        return false
    end

    entry.tokens = entry.tokens - 1
    return true
end

---Owning identifier for a live session, used by the presets store to key per-admin data.
---@param src number player server id
---@return string|nil identifier
function session.identifier(src)
    local entry = sessions[src]
    return entry and entry.identifier
end

---A disconnecting player's session dies with them - this is what makes check 3 in
---session.assert a belt-and-braces measure rather than the only defence against id reuse.
AddEventHandler('playerDropped', function()
    session.revoke(source, 'player dropped')
end)

---Drop every session on stop, so a restart can never leave a stale grant behind.
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    sessions = {}
end)

return session
