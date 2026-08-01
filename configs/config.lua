-- Aggregate config root, loaded by both sides via `require 'configs.config'`.
-- Scope-by-folder: this file is the client-safe half. configs/server/ holds the
-- sensitive half - the caps, the blacklist, the rate limit - and is deliberately
-- excluded from the fxmanifest files{} block, so it never ships to a client. It is
-- merged in below on the server ONLY.
local config = {
    Locale = 'en', -- lib.locale loads locales/<Locale>.json, falling back to en per-key
    Debug = false, -- cyan diagnostic prints from shared/log.lua; leave off in production

    -- Chat command that opens the panel. This is also the ACE that gates it: ox_lib
    -- registers `command.<Command>` from the `restricted` option in server/spawner/init.lua,
    -- and every privileged callback re-checks that same ACE (server/spawner/session.lua).
    -- Renaming this renames the ACE too - update your server.cfg add_ace lines to match.
    Command = 'itemspawner',

    -- Optional second name for the same command; set to false to register only the above.
    CommandAlias = 'spawner',

    -- Where the NUI resolves item icons from. ox_inventory declares 'web/images/*.png' in
    -- its own files{} block, so this cross-resource nui:// path works with no asset copying
    -- and no duplication. Change only if you renamed the ox_inventory resource folder.
    ImagePath = 'nui://ox_inventory/web/images/',
}

-- Server-only (sensitive): the permission TTL, per-give caps, the metadata limiter, the
-- rate limit and the item blacklist. Merged in server-side only so none of it is readable
-- from a client that has the NUI page open.
if IsDuplicityVersion() then
    config.Security = require 'configs.server.security'
end

return config
