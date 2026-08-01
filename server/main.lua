---@type table sd-itemspawner config root (configs/config.lua).
local config = require 'configs.config'
lib.locale(config.Locale) -- locale from configs/config.lua's `Locale` (en fallback per-key)

require 'server.spawner.init' -- the command, the guarded callbacks, and everything they pull in
