const fs = require('fs')
const path = require('path')
const request = require('request')
const checksum = require('checksum')
const Zip = require('adm-zip')
const child = require('child_process')

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
        return new Promise(resolve =>
        {
            request.get(this.url.meta + '/mc/game/version_manifest.json', (error, response, body) =>
            {
                if (error) resolve(error)

                const manifest = JSON.parse(body)
      
                manifest.versions.forEach(version => 
                {
                    if(version.id == this.launcher.launchOptions.version.number)
                        request.get(version.url, (error, response, body) => 
                        {
                            if (error) resolve(error)
      
                            this.launcher.emit('debug', '[MLT]: Parsed version from version manifest')
                            this.minecraftJson = JSON.parse(body)
                            return resolve(this.minecraftJson)
                        })
                })
            })
        })
    }

    getLaunchArguments(json, classpath, dirNatives, dirAssets)
    {
        const replaceField = 
        {
            '${auth_player_name}': this.launcher.launchOptions.auth.username || 'Player',
            '${version_name}': this.launcher.launchOptions.version.number,
            '${game_directory}': 'version/' + this.launcher.launchOptions.version.number,
            '${assets_root}': dirAssets,
            '${assets_index_name}': json.assetIndex.id,

            '${auth_uuid}': this.launcher.launchOptions.auth.uuid || 'null',
            '${auth_access_token}': this.launcher.launchOptions.auth.token || 'null',
            '${user_type}': this.launcher.launchOptions.auth.type || 'mojang',
            '${version_type}': this.launcher.launchOptions.version.type || 'release',


            '-Djava.library.path=${natives_directory}': '-Djava.library.path=' + dirNatives + '',
            '-Dminecraft.launcher.brand=${launcher_name}': '-Dminecraft.launcher.brand="TrophyLauncher"',
            '-Dminecraft.launcher.version=${launcher_version}': '-Dminecraft.launcher.version="V: 4.2.2 RC-1"',
            '${classpath}': classpath
        };

        

        const args = { jvm: [], game: [] }

        //foreach arg JVM
        json.arguments.jvm.forEach(element => 
        {
            let allow = true

            if(element instanceof Object)
            {
                //temp skip
                allow = false
            }

            if(Object.keys(replaceField).includes(element)) element = replaceField[element]

            if(allow) args.jvm.push(element)
        })

        args.jvm.push(json.mainClass)

        //foreach arg GAME
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