-- Server-only security policy. Excluded from the fxmanifest files{} block, so a client
-- with the NUI page open cannot read the caps it is being held to, nor the blacklist.
-- Everything here is enforced in server/spawner/validate.lua and server/spawner/session.lua.
return {
    -- ox_lib `restricted` group handed to lib.addCommand. ox_lib turns this into
    -- `add_ace <Group> command.<Command> allow` at registration, and FiveM's own restricted
    -- command check does the gating - so an unprivileged player's /itemspawner never reaches
    -- our handler and therefore can never be granted a session.
    Group = 'group.admin',

    -- How long a session stays valid after the command was run, in seconds. A panel left
    -- open past this simply stops being served: the next give returns 'session expired' and
    -- the admin re-runs the command. Keeps a walked-away-from admin from being a standing
    -- hole. Set to false to never expire.
    SessionTTL = 30 * 60,

    -- Hard ceiling on a single give. The NUI stepper is capped at this too, but that copy is
    -- cosmetic - this is the number that is actually enforced, and counts above it are
    -- rejected outright rather than silently clamped, so a bad request is visible.
    MaxCount = 500,

    -- Ceiling on how many distinct items one spawn action may contain, so a scripted client
    -- cannot turn a single callback into a 500-item loop.
    MaxSelection = 64,

    -- Metadata limiter. Client-supplied metadata is the one place a caller controls both the
    -- shape and the size of what we hand to ox_inventory, so it is bounded on every axis.
    Metadata = {
        MaxKeys = 16,       -- keys per table
        MaxDepth = 2,       -- nesting levels; 1 = flat
        MaxStringLength = 128,
    },

    -- Token bucket per admin. Refills at Rate tokens/second up to Burst; one give action
    -- costs one token regardless of how many items or targets it carries.
    RateLimit = {
        Burst = 30,
        Rate = 0.5, -- 30/minute sustained
    },

    -- Radius in metres for the 'nearby' target mode. Resolved from server-side entity coords,
    -- never from anything the client sends.
    NearbyRadius = 20.0,

    -- Items that cannot be spawned even by a full admin. Exact ox_inventory item names.
    -- Empty by default - this exists for servers that want a hard floor under the tool.
    Blacklist = {
        -- ['money'] = true,
        -- ['WEAPON_RAILGUN'] = true,
    },

    -- Max presets one admin may store, so the presets file cannot be grown without bound.
    MaxPresets = 40,

    -- Audit logging through ox_lib's logger (lib.logger). A no-op when no ox:logger backend
    -- is configured, so this is safe to leave on. Console lines are separate and always print.
    Logs = {
        Enabled = true,
        Console = true, -- also print a green line per give to the server console
    },
}
