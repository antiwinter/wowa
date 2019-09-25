# WoWA

[![cover](https://coveralls.io/repos/github/antiwinter/wowa/badge.svg?branch=master)](https://coveralls.io/github/antiwinter/wowa?branch=master)
[![status](https://travis-ci.org/antiwinter/wowa.svg?branch=master)](https://travis-ci.org/antiwinter/wowa)
[![npm](https://img.shields.io/npm/v/wowa.svg)](https://www.npmjs.com/package/wowa)
[![npm](https://img.shields.io/npm/l/wowa.svg)](https://github.com/antiwinter/wowa/blob/master/LICENSE)
[![install size](https://packagephobia.now.sh/badge?p=wowa)](https://packagephobia.now.sh/result?p=wowa)

**Recent Notice**

- Add support for `PTR` and `BETA` mode, see [switch modes](#switch-modes)
- Now `ls` only prints short message, if you want detailed message, use `wowa ls -l`
- Add support for [TukUI](https://tukui.org). `wowa add 0-tukui`, `wowa search tukui:elvui`
- Add support for WoW Classic, use `wowa switch` to switch mode between `_classic_` and `_retail_`, use `wowa ls` to check which mode you are in. When switched to `_classic_` mode, **wowa** will download the correct addon version that matches **1.13.x**
- [curse](https://www.curseforge.com/wow/addons), [wowinterface](https://www.wowinterface.com/addons.php), [github](https://github.com), [tukui](https://tukui.org) are supported
- node version supported: **node 10**, **node 12**
- node version NOT supported: **node 8**

---

**WoWA** stands for World of Warcraft Assistant, it is designed to help managing WoW addons, uploading WCL logs, etc.

There used to be some command line manager for WoW addons in the past, but are mostly out of maintaince at this time. A list of these projects can be found in the [related prjects](#related-projects) section.

As comparing to these projects, **WoWA** offers serveral advantages:

- Better CLI interface: colorful and meaningful
- Concurrency: when installing or updating, WoWA can take advantage of multi-processing
- **wowaads.json** file: this is the file where WoWA stores addon information. Unlike other projects, WoWA stores this file in the **WTF** folder. This design benifits people when they want to backup their WoW setting. Backing up one **WTF** folder is enough

## Install

```
npm install -g wowa
```

## Setup WoW path

The WoW path configuration file is located at `%APPDATA%/wowa/wow_path.txt` on Windows, and `~/.wowa/wow_path.txt` on macOS or Linux.

Normally **wowa** would remind you to edit this file if it cannot find the game at its default location.

## Usage

### Quick reference

**To install an addon**

```
wowa add deadly-boss-mods                       # install dbm from curse
wowa add curse:deadly-boss-mods                 # install dbm from curse
wowa add mmoui:8814-DeadlyBossMods              # install dbm from wowinterface
wowa add 8814-DeadlyBossMods                    # install dbm from wowinterface
wowa add deadlybossmods/deadlybossmods          # install dbm from github
wowa add bigwigsmods/bigwigs/classic            # install bigwigs (classic branch) from github
wowa add antiwinter/dlt                         # install dlt from github
```

**To search an addon**

```
wowa search dbm                                 # search for dbm automatically
wowa search mmoui:dbm                           # search for dbm only from wowinterface
```

### Installing an addon

![](https://raw.githubusercontent.com/antiwinter/scrap/master/wowa/ins1-min.gif)

### Search for an addon

![](https://raw.githubusercontent.com/antiwinter/scrap/master/wowa/search-min.gif)

**Note:** that WoWA manages addons by keys (keys are provided by [curse](https://www.curseforge.com)) not by addon names, sometimes they are different. If you are not sure a key for an addon, you can search that addon by some fuzzy name, and the search result provides the correct key to use.

### Installing two or more addons

![](https://raw.githubusercontent.com/antiwinter/scrap/master/wowa/ins2-min.gif)

### Removing an addon

![](https://raw.githubusercontent.com/antiwinter/scrap/master/wowa/rm-min.gif)

### Update all installed addons

![](https://raw.githubusercontent.com/antiwinter/scrap/master/wowa/update-min.gif)

### List all installed addons

![](https://raw.githubusercontent.com/antiwinter/scrap/master/wowa/ls-min.gif)

### Import local addons

If use **wowa** for the first time, you need to import your local addon. Then **wowa** can manage them for you.

```
wowa import
```

### Switch modes

```
wowa sw                 switch between _retail_ and _classic_
wowa sw --ptr           switch mode to: retail PTR
wowa sw --beta          switch mode to: retail BETA
wowa sw --retail        switch mode to: retail formal
wowa sw --retail-ptr    switch mode to: retail PTR
wowa sw --retail-beta   switch mode to: retail BETA
wowa sw --classic       switch mode to: classic formal
wowa sw --classic-ptr   switch mode to: classic PTR
wowa sw --classic-beta  switch mode to: classic BETA
```

## Related projects

### Actively maintained

- ![stars](https://img.shields.io/github/stars/Saionaro/wow-addons-updater?style=social) [Saionaro/wow-addons-updater](https://github.com/Saionaro/wow-addons-updater) - `GUI`
- ![stars](https://img.shields.io/github/stars/AcidWeb/CurseBreaker?style=social) [AcidWeb/CurseBreaker](https://github.com/AcidWeb/CurseBreaker) - `CLI`
- ![stars](https://img.shields.io/github/stars/erikabp123/ClassicAddonManager?style=social) [erikabp123/ClassicAddonManager](https://github.com/erikabp123/ClassicAddonManager) - `GUI`
- ![stars](https://img.shields.io/github/stars/ogri-la/wowman?style=social) [ogri-la/wowman](https://github.com/ogri-la/wowman) - `GUI`
- ![stars](https://img.shields.io/github/stars/layday/instawow?style=social) [layday/instawow](https://github.com/layday/instawow) - `CLI`
- ![stars](https://img.shields.io/github/stars/nazarov-tech/wowa?style=social) [nazarov-tech/wowa](https://github.com/nazarov-tech/wowa) - `CLI`
- ![stars](https://img.shields.io/github/stars/kuhnertdm/wow-addon-updater?style=social) [kuhnertdm/wow-addon-updater](https://github.com/kuhnertdm/wow-addon-updater) - `CLI`
- ![stars](https://img.shields.io/github/stars/DayBr3ak/wow-better-cli?style=social) [DayBr3ak/wow-better-cli](https://github.com/DayBr3ak/wow-better-cli) - `CLI`
- ![stars](https://img.shields.io/github/stars/vargen2/Addon?style=social) [vargen2/Addon](https://github.com/vargen2/Addon) - `GUI`
- ![stars](https://img.shields.io/github/stars/Lund259/WoW-Addon-Manager?style=social) [Lund259/WoW-Addon-Manager](https://github.com/Lund259/WoW-Addon-Manager) - `GUI`
- ![stars](https://img.shields.io/github/stars/ephraim/lcurse?style=social) [ephraim/lcurse](https://github.com/ephraim/lcurse) - `GUI`

### Not Actively maintained

- ![stars](https://img.shields.io/github/stars/WorldofAddons/worldofaddons?style=social) [WorldofAddons/worldofaddons](https://github.com/WorldofAddons/worldofaddons) - `GUI`
- ![stars](https://img.shields.io/github/stars/wttw/wowaddon?style=social) [wttw/wowaddon](https://github.com/wttw/wowaddon) - `CLI`
- ![stars](https://img.shields.io/github/stars/OpenAddOnManager/OpenAddOnManager?style=social) [OpenAddOnManager/OpenAddOnManager](https://github.com/OpenAddOnManager/OpenAddOnManager) - `GUI`
- ![stars](https://img.shields.io/github/stars/vargen2/addonmanager?style=social) [vargen2/addonmanager](https://github.com/vargen2/addonmanager) - `GUI`
- ![stars](https://img.shields.io/github/stars/zekesonxx/wow-cli?style=social) [zekesonxx/wow-cli](https://github.com/zekesonxx/wow-cli) - `CLI`
- ![stars](https://img.shields.io/github/stars/acdtrx/wowam?style=social) [acdtrx/wowam](https://github.com/acdtrx/wowam) - `CLI`
- ![stars](https://img.shields.io/github/stars/Sumolari/WAM?style=social) [Sumolari/WAM](https://github.com/Sumolari/WAM) - `CLI`
- ![stars](https://img.shields.io/github/stars/qwezarty/wow-addon-manager?style=social) [qwezarty/wow-addon-manager](https://github.com/qwezarty/wow-addon-manager) - `CLI`
- ![stars](https://img.shields.io/github/stars/sysworx/wowam?style=social) [sysworx/wowam](https://github.com/sysworx/wowam) - `GUI`
- ![stars](https://img.shields.io/github/stars/JonasKnarbakk/GWAM?style=social) [JonasKnarbakk/GWAM](https://github.com/JonasKnarbakk/GWAM) - `GUI`
- ![stars](https://img.shields.io/github/stars/SeriousBug/WoWutils?style=social) [SeriousBug/WoWutils](https://github.com/SeriousBug/WoWutils) - `CLI`

## Roadmap

- [x] Support projects on wowinterface.com
- [x] Support projects on github.com
- [ ] Game version detection
- [x] Add test cases
- [x] Support projects on tukui.org
- [x] **Support WoW Classic !**
- [x] Import existing addons
- [x] Check **wowa** updates
- [ ] Optimize color scheme
- [ ] Shrink size of package
- [ ] Support releasing UI (addons list, together with settings) to github.com
- [ ] Support backing up to github.com
- [ ] Support restoring from github.com
- [ ] Support uploading to warcraftlogs.com
