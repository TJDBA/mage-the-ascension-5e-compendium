# Mage the Ascension 5e Compendium

A content compendium for **Mage: The Ascension 5th Edition (M5)**, built for the
[WoD5e](https://github.com/WoD5E-Developers/wod5e) game system on Foundry VTT.

It adds two compendium packs:

- **Spheres** — the nine Spheres (Correspondence, Entropy, Forces, Life, Matter, Mind, Prime, Spirit, Time), each with its full rank 1–5 effects.
- **Factions** — the nine Traditions and the five Technocracy Conventions, with affiliation and affinity Spheres.

## Requirements

- Foundry VTT v13 or v14
- The **WoD5e** system installed and active

## Install

In Foundry, **Add-on Modules → Install Module**, paste this manifest URL:

```
https://raw.githubusercontent.com/TJDBA/Mage-the-Ascension-5e-Compendium/main/module.json
```

Then enable the module in your world and open the **Spheres** and **Factions** compendia from the Compendium Packs sidebar.

## Building the packs (for developers)

The packs are compiled from the editable JSON under `src/` into Foundry's
LevelDB format under `packs/`.

```
npm install
node build.mjs
```

Each item gets a deterministic id derived from its filename, so rebuilds keep
item references stable across your worlds.

## License & attribution

This is unofficial, fan-made content for personal use.

Portions of the materials are the copyrights and trademarks of Paradox
Interactive AB, and are used with permission. All rights reserved.
For more information please visit [worldofdarkness.com](https://www.worldofdarkness.com).

Game mechanics text is used with permission under the Community Content
Agreement for the Storytellers Vault.

Code and data files in this repository are provided for personal use.
