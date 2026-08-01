---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
---@type table Console log helper (shared.log): tagged colour-coded prints.
local log = require 'shared.log'
---@type table Item registry (shared.catalog). Client-side this reads the client's own
---ox_inventory registry, so opening the panel transfers no item data over the network.
local catalog = require 'shared.catalog'

---@type boolean True while the panel holds NUI focus.
local open = false

---Release NUI focus, if held. Idempotent, so the close callback and the resource-stop handler
---can both call it without ordering concerns.
local function close()
    if not open then return end
    open = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'spawner:close' })
end

---Round-trip a guarded server callback. Every one of them answers `{ ok, error?, ... }`, so the
---failure shape is uniform. The locale key is resolved to a `message` here rather than in the
---NUI, which keeps every server-authored string in locales/*.json and leaves the web layer
---owning only its own chrome (web/src/i18n.ts). A nil result means the callback never came back
---(resource restarted mid-call).
---@param name string suffix after 'sd-itemspawner:server:'
---@param data table|nil payload
---@return table result
local function request(name, data)
    local result = lib.callback.await('sd-itemspawner:server:' .. name, false, data or {})

    if type(result) ~= 'table' then
        result = { ok = false, error = 'err.no_response' }
    end

    if result.error then
        result.message = locale(result.error)
    end

    return result
end

---Open the panel. Fired by the server only after the ACE gate passed and a session was granted,
---so reaching here means the caller is already authorised - but nothing here depends on that.
---Every action the panel can take is re-checked server-side, so a client that forced this open
---on its own would get a grid it cannot spawn anything from.
RegisterNetEvent('sd-itemspawner:client:open', function()
    if open then return end

    local items = catalog.list()

    if #items == 0 then
        lib.notify({ description = locale('err.no_items'), type = 'error' })
        log.error('nui', 'ox_inventory returned an empty item registry — is it started?')
        return
    end

    local boot = request('bootstrap')

    if not boot.ok then
        lib.notify({ description = locale(boot.error or 'err.not_allowed'), type = 'error' })
        return
    end

    open = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'spawner:open',
        data = {
            items = items,
            counts = catalog.counts(),
            imagePath = config.ImagePath,
            presets = boot.presets,
            players = boot.players,
            self = boot.self,
            limits = boot.limits,
        },
    })

    log.debug('nui', 'panel opened with %d items', #items)
end)

RegisterNUICallback('spawner:close', function(_, cb)
    close()
    cb(1)
end)

RegisterNUICallback('spawner:give', function(data, cb)
    cb(request('give', data))
end)

RegisterNUICallback('spawner:players', function(_, cb)
    cb(request('players'))
end)

RegisterNUICallback('spawner:presetSave', function(data, cb)
    cb(request('presetSave', data))
end)

RegisterNUICallback('spawner:presetDelete', function(data, cb)
    cb(request('presetDelete', data))
end)

RegisterNUICallback('spawner:presetSpawn', function(data, cb)
    cb(request('presetSpawn', data))
end)

---Never leave a player stuck with NUI focus and no panel because the resource restarted
---underneath them.
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    close()
end)
