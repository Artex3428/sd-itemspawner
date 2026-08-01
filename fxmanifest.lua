fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'sd-itemspawner'
author 'Samuel#0008'
version '1.0.0'
description 'Admin item spawner for ox_inventory — searchable catalog, metadata editor, loadout presets'

shared_scripts {
    '@ox_lib/init.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    'server/main.lua',
}

ui_page 'web/build/index.html'

-- configs/server/** is deliberately absent: the caps, the rate limit and the blacklist live
-- there, and leaving it out of this block means the file is never sent to a client, so a player
-- with the NUI page open cannot read the limits they are being held to.
files {
    'configs/config.lua',
    'shared/**.lua',
    'client/**.lua',
    'locales/*.json',
    'web/build/index.html',
    'web/build/assets/*.js',
    'web/build/assets/*.css',
}

-- Hard dependencies, both of them. Unlike the other sd-* resources there is no inventory bridge
-- here: this tool is ox_inventory-specific by design and calls its exports directly.
dependencies {
    'ox_lib',
    'ox_inventory',
}
