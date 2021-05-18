# Minecraft Launcher for NODE.JS
## minecraft-launcher-trophy

Minecraft Launcher modeule for parse and run classic version.json from Mojang LAUNCHERMETA 

## Featuers  ✨Magic ✨
- Run Minecraft
- Spoofing META URL's
- Downloads and Update resources
- Event Callback's 


## Getting Started  ✨Magic ✨

```javascript
const TrophyModule = require('./minecraft-launcher-trophy')
const trophyLauncher = new TrophyModule.TrophyClient()

//minecraft option set
let launchOptions =
{
    url:
    {
        //meta:     "https://launchermeta.mojang.com",
        //resource: "https://resources.download.minecraft.net"
    },
    //javaPath: "java",
    launcherPath: "../minecraft",

    version:
    {
        //jsonDownload:   true,
        number:         "1.16.5",
        type:           "release"
    },
    auth:
    {
        username:   "meatsuko",
        uuid:       "meatsuko",
        token:      "shalala",
        type:       "trophy"
    },

    //detached: false,
    memory: 
    {
        min: "8G",
        max: "32G"
    }
}

//event emits callback
trophyLauncher.on('progress', (e) => console.log(e));
trophyLauncher.on('download-status', (e) => console.log(e));

trophyLauncher.on('debug', (e) => console.log(e));
trophyLauncher.on('data', (e) => console.log(e));
//run miencraft
trophyLauncher.launch(launchOptions)
```