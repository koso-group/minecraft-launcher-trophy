const request = require('request')

class TrophyParser
{
    constructor (launcher)
    {
        this.launcher = launcher;

        this.url = 
        {
            meta:       this.launcher.launchOptions.url.meta        || 'https://launchermeta.minetrophy.ru',
            resource:   this.launcher.launchOptions.url.resource    || 'https://resources.download.minecraft.net'
        }

    }

    getMinecraftJSON()
    {
        this.launcher.emit('debug', '[MLT][P] Request Minecraft Versions')
        return new Promise(resolve =>
        {
            request.get(this.url.meta + '/mc/game/version_manifest.json', (error, response, body) =>
            {
                if (error) resolve(error)

                const manifest = JSON.parse(body)
      
                this.launcher.emit('debug', '[MLT][P] Resolve Minecraft Version')
                manifest.versions.forEach(version => 
                {
                    if(version.id == this.launcher.launchOptions.version.number)
                        request.get(version.url, (error, response, body) => 
                        {
                            if (error) resolve(error)
      
                            this.launcher.emit('debug', '[MLT][P]: Minecraft version resolved from META JSON')
                            this.minecraftJson = JSON.parse(body)
                            return resolve(this.minecraftJson)
                        })
                })
            })
        })
        .catch((error) => {
            this.launcher.emit('debug', '[MLT][P][ERROR] ' + error)
        })
    }

    getLaunchArguments(json, os, classpath, dirNatives, dirAssets)
    {
        const replaceField = 
        {
            '${auth_player_name}':      this.launcher.launchOptions.auth.username   || 'Player',
            '${version_name}':          this.launcher.launchOptions.version.number,
            '${game_directory}':        'version/' + this.launcher.launchOptions.version.number,
            '${assets_root}':           dirAssets,
            '${assets_index_name}':     json.assetIndex.id,

            '${auth_uuid}':             this.launcher.launchOptions.auth.uuid       || 'null',
            '${auth_access_token}':     this.launcher.launchOptions.auth.token      || 'null',
            '${user_type}':             this.launcher.launchOptions.auth.type       || 'mojang',
            '${version_type}':          this.launcher.launchOptions.version.type    || 'release',


            '-Djava.library.path=${natives_directory}':             '-Djava.library.path=' + dirNatives + '',
            '-Dminecraft.launcher.brand=${launcher_name}':          '-Dminecraft.launcher.brand="TrophyLauncher"',
            '-Dminecraft.launcher.version=${launcher_version}':     '-Dminecraft.launcher.version="V: 4.2.2 RC-1"',
            '${classpath}':                                         classpath
        };

        

        const args = { jvm: [], game: [] }

        args.jvm.push('-Xms' + this.launcher.launchOptions.memory.min);
        args.jvm.push('-Xmx' + this.launcher.launchOptions.memory.max);

        //foreach arg JVM
        this.launcher.emit('debug', '[MLT][P] Parse arguments for JVM')
        json.arguments.jvm.forEach(argument => 
        {
            let allow = true

            if(argument instanceof Object)
            {
                allow = false
                if(argument.rules instanceof Object)
                argument.rules.forEach(rule =>
                {
                    if(rule.os.name)
                    if(rule.os.name == os.name)
                        allow = (rule.action == 'allow')


                    //temp fix
                    if(rule.os.arch) allow = false
                    if(rule.os.version) allow = false
                })
                
                
                // maybe array string
                argument = argument.value
            }



            if(Object.keys(replaceField).includes(argument)) argument = replaceField[argument]

            if(allow) args.jvm.push(argument)
        })

        args.jvm.push(json.mainClass)

        //foreach arg GAME
        this.launcher.emit('debug', '[MLT][P] Parse arguments for GAME')
        json.arguments.game.forEach(element => 
        {
            let allow = true

            if(element instanceof Object)
            {
                //temp skip
                allow = false
            }

            if(Object.keys(replaceField).includes(element)) element = replaceField[element]


            if(allow) args.game.push(element)
        })

        this.launcher.emit('debug', args)

        return args
    }



}

module.exports = TrophyParser