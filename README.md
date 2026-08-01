<div align="center">

# sd-itemspawner

**An admin item spawner for [ox_inventory](https://github.com/communityox/ox_inventory).**
Every registered item in one searchable grid — weapons, ammo, attachments and all — with per-item
quantities, a metadata editor, saved loadouts, and delivery to yourself, one player, everyone
nearby or the whole server. One command in, everything else server-validated.

If sd-itemspawner is useful to you, please ⭐ the repo. Issues and pull requests are always welcome.

[![Release](https://img.shields.io/github/v/release/Samuels-Development/sd-itemspawner?label=Release&logo=github)](https://github.com/Samuels-Development/sd-itemspawner/releases)
[![Stars](https://img.shields.io/github/stars/Samuels-Development/sd-itemspawner?label=Stars&logo=github)](https://github.com/Samuels-Development/sd-itemspawner)
[![Discord](https://img.shields.io/discord/842045164951437383?label=Discord&logo=discord&logoColor=white)](https://discord.gg/FzPehMQaBQ)
[![License](https://img.shields.io/badge/License-GPL--3.0-94DD0C)](LICENSE)

![Requires](https://img.shields.io/badge/Requires-ox__inventory-ef4444)
![Framework](https://img.shields.io/badge/Framework-none%20required-22c55e)
![Database](https://img.shields.io/badge/Database-none-22c55e)

[**Store**](https://fivem.samueldev.shop) · [**Documentation**](https://docs.samueldev.shop) · [**Discord**](https://discord.gg/FzPehMQaBQ)

</div>

---

> [!IMPORTANT]
> **sd-itemspawner is ox_inventory-only, by design.**
> There is no inventory bridge and no framework detection. It calls `ox_inventory`'s exports
> directly and resolves players through natives, which is why it needs no framework, no database
> and no SQL file. If you run any other inventory, this resource is not for you.

## What it is

A spawner that shows you **everything ox_inventory actually has registered** — not a hand-written
list you have to keep in sync. The catalog is read from `ox_inventory:Items()` at runtime, so it
includes `data/items.lua`, `data/weapons.lua`, and anything another resource registered on boot.
Add an item to `items.lua` and it is in the grid on the next restart with no edits here.

| | |
|---|---|
| **Catalog** | Every registered item, auto-categorised into weapons / ammo / attachments / usable / misc. Icons resolve from ox_inventory's own image folder — nothing is copied or duplicated. |
| **Search** | Multi-term and ranked. Typing `pistol` puts `WEAPON_PISTOL` first instead of burying it under thirty attachments that merely contain the word. |
| **Quantities** | Per item, not one global amount. Stage `5x bandage` and `1x pistol` in the same spawn. |
| **Metadata** | Free-form key/value editor per item, with the value type inferred and shown as a badge. Leave it empty and ox_inventory generates its own serials and durability. |
| **Loadouts** | Save a selection by name, re-spawn it in one click, or load it back into the tray to edit first. Stored per admin in a flat JSON file — no database table. |
| **Targets** | Yourself, a specific player, everyone within a radius, or every connected player. |
| **Feedback** | Partial success is reported as partial success: "delivered 4, 1 failed — Riley Bennett: Gold Bar (no room)", not a silent failure. |

## Security

The whole design assumes an attacker can call any server callback with any payload, because they
can. Nothing is protected by being hard to find.

**Getting in.** `lib.addCommand` registers `/itemspawner` as a restricted command, so FiveM's own
server-side dispatcher checks the `command.itemspawner` ACE before the handler runs. That handler
is the *only* writer of the in-memory session table.

**Staying in.** Every privileged callback then runs four checks, cheapest first:

| Check | Rejects |
|---|---|
| A session exists | Anyone who never ran the command |
| The ACE still holds, re-tested per call | An admin whose permission was pulled mid-session |
| The identifier still matches | Server-ID reuse — a player disconnecting and the next joiner inheriting their slot *and* their session |
| The session is inside its TTL | A panel left open and walked away from |

**What gets trusted.** Nothing the client says about an item. It sends a bare item key; the server
resolves it against its own catalog and reads the label, weight and stack from there. Unknown keys,
blacklisted items, non-integer counts, counts over the cap, oversized or too-deeply-nested metadata,
and offline targets are all rejected *before* anything reaches `AddItem`. Counts above the cap are
rejected rather than clamped, so a malformed request is visible instead of silently shrunk.

There is one `lib.callback.register` call site in the resource, and it is inside the wrapper that
applies the gate — so no endpoint can be added later that forgets it. There are **no** server-side
`RegisterNetEvent`s at all. Every spawn is written to the console and to `lib.logger` with the
acting admin's name, licence, items and recipients.

## How it works

```
/itemspawner ──▶ lib.addCommand (ACE gate) ──▶ session granted ──▶ open event to that client
                                                                          │
client builds the grid from its OWN ox_inventory registry ◀────────────────┘
        │
        └─▶ NUI action ──▶ lib.callback ──▶ session check ──▶ validate ──▶ ox_inventory:AddItem
```

The item catalog is **never sent over the network**. ox_inventory maintains a registry on both
sides, so the client builds the grid from its own copy while the server keeps an independent one
purely as the validation authority. Opening the panel costs one small round trip for presets and
the player list, not a 500-item payload.

The grid is row-windowed, so a 500-item catalog mounts about thirty cards at a time instead of
firing 500 image requests on open.

### Files

```
fxmanifest.lua
configs/config.lua              command name, locale, icon path      (client-safe)
configs/server/security.lua     ACE group, caps, rate limit, blacklist (never sent to clients)
shared/catalog.lua              ox_inventory registry -> categorised catalog (both sides)
shared/log.lua                  tagged console logger
client/main.lua                 locale + module wiring
client/spawner/nui.lua          open event, NUI callbacks, focus
server/main.lua                 locale + module wiring
server/spawner/init.lua         the command and the six guarded callbacks
server/spawner/session.lua      the grant table and its four-check gate
server/spawner/validate.lua     every client payload, rebuilt from scratch
server/spawner/give.lua         target resolution and delivery
server/spawner/presets.lua      per-admin loadout store (data/presets.json)
server/spawner/audit.lua        console + lib.logger trail
web/                            the NUI (React + TypeScript + Vite, prebuilt)
```

## Installation

### Dependencies

| Resource | What it is for |
| --- | --- |
| [ox_inventory](https://github.com/communityox/ox_inventory) | **Required.** The item registry and `AddItem`. |
| [ox_lib](https://github.com/communityox/ox_lib) | Shared library — commands, callbacks, locale, notifications |

sd-itemspawner does **not** touch the database and has no SQL of its own.

### 1. Start the resource

```cfg
ensure ox_lib
ensure ox_inventory
ensure sd-itemspawner
```

The NUI ships prebuilt in `web/build`, so no build step is needed to run it.

### 2. Give yourself permission

`lib.addCommand` creates the `command.itemspawner` ACE for `group.admin` automatically, but nobody
is in that group by default. Add yourself in `server.cfg`:

```cfg
add_principal identifier.license:YOUR_LICENSE_HERE group.admin
```

> [!TIP]
> Find your licence with `status` in the server console while connected, or check the
> `players.json`/txAdmin player list. It looks like `license:1a2b3c4d...`.

Already using `group.admin` for other things? Point the resource at a group of its own instead —
change `Group` in `configs/server/security.lua` to e.g. `group.spawner`, then grant it:

```cfg
add_ace group.spawner command.itemspawner allow
add_principal identifier.license:YOUR_LICENSE_HERE group.spawner
```

### 3. Open it

```
/itemspawner      (or /spawner)
```

Escape closes the panel.

## Configuration

**`configs/config.lua`** — client-safe. Command name (which also names the ACE), its alias, the
locale, and the ox_inventory image path.

**`configs/server/security.lua`** — deliberately excluded from the manifest's `files{}` block, so
it is never sent to a client:

| Setting | Default | What it does |
|---|---|---|
| `Group` | `group.admin` | ACE group handed to `lib.addCommand` |
| `SessionTTL` | `1800` | Seconds a session stays valid; `false` to never expire |
| `MaxCount` | `500` | Hard ceiling on a single item's amount |
| `MaxSelection` | `64` | Most items in one spawn |
| `Metadata` | 16 keys / depth 2 / 128 chars | Bounds on client-supplied metadata |
| `RateLimit` | 30 burst, 0.5/s | Token bucket per admin |
| `NearbyRadius` | `20.0` | Metres for the "nearby" target |
| `Blacklist` | empty | Items nobody can spawn, even with the ACE |
| `MaxPresets` | `40` | Saved loadouts per admin |
| `Logs` | on | Console line and `lib.logger` entry per spawn |

## Building the UI

Only needed if you change the interface.

```bash
cd web
npm install
npm run build
```

Output lands in `web/build` with unhashed filenames to match the manifest's `files{}` globs.
`npm run dev` runs the panel in a browser against a generated mock catalog, so you can work on it
without launching the game.

## Credits

Built by [Samuel Nicol](https://github.com/Samuels-Development).
Licensed under [GPL-3.0](LICENSE).
