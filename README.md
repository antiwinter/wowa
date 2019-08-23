# WoWA

[![cover](https://coveralls.io/repos/github/antiwinter/wowa/badge.svg?branch=master)](https://coveralls.io/github/antiwinter/wowa?branch=master)
[![status](https://travis-ci.org/antiwinter/wowa.svg?branch=master)](https://travis-ci.org/antiwinter/wowa)
[![npm](https://img.shields.io/npm/v/wowa.svg)](https://www.npmjs.com/package/wowa)
[![npm](https://img.shields.io/npm/l/wowa.svg)](https://github.com/antiwinter/wowa/blob/master/LICENSE)
[![install size](https://packagephobia.now.sh/badge?p=wowa)](https://packagephobia.now.sh/result?p=wowa)

**Updates on Aug 23 2019**

- [@dkrustko](https://github.com/dkrutsko) has made a nice collection of [classic addons](https://dave.krutsko.net/classic-addons/) - with wowa links.
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

**Note 1:** WoWA does not support managing the addons you've already installed (manually or by twitch client), you have to install those addons one more time via WoWA.

## Install

```
npm install -g wowa
```

## Usage

### Quick reference

**To install an addon**

```
wowa add deadly-boss-mods                       # install dbm from curse
wowa add curse:deadly-boss-mods                 # install dbm from curse
wowa add mmoui:8814-DeadlyBossMods              # install dbm from wowinterface
wowa add 8814-DeadlyBossMods                    # install dbm from wowinterface
wowa add deadlybossmods/deadlybossmods          # install dbm from github
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

## Related projects

**Commandline implementations**

- [wow-cli](https://github.com/zekesonxx/wow-cli)
- [wowam](https://github.com/acdtrx/wowam)
- [wam](https://github.com/Sumolari/WAM)
- [wow-better-cli](https://github.com/DayBr3ak/wow-better-cli)

**GUI implementations**

- [wowman](https://github.com/ogri-la/wowman)

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
