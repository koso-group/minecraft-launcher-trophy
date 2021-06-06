const child = require('child_process')
const path = require('path')
const fs = require('fs')
const EventEmitter = require('events').EventEmitter

const TrophyParser = require('./parser')
const TrophyUtils = require('./utils')

class TrophyLauncher extends EventEmitter
{
    async launch(launchOptions)
    {
        this.launchOptions = { ...launchOptions }
        this.launchOptions.launcherPath = path.resolve(this.launchOptions.launcherPath)
        this.emit('debug', this.launchOptions)

        this.emit('debug', '[MLT][L] Make Parser and Utils')
        this.parser = new TrophyParser(this)
        this.utils = new TrophyUtils(this, this.parser)


        this.emit('debug', '[MLT][L] {GET} Getting Minecraft Version JSON manifest')
        const minecraftJSON = await this.parser.getMinecraftJSON();
        this.emit('debug', minecraftJSON)


        this.createDirectory(this.launchOptions.launcherPath)
        //this.createDirectory()
        this.emit('debug', '[MLT][L] {DL} Check/Download updates for JSON')
        const updateResult = await this.utils.downloadUpdate(minecraftJSON)
        this.emit('debug', updateResult)
        
        const os =
        {
            'name': 'windows',
            'arch': 'x64',
            'version': ''
        }
        this.emit('debug', '[MLT][L] Begin parse Minecraft Launch Arguments')
        const launchArguments = this.parser.getLaunchArguments(minecraftJSON, os, this.utils.toCP(updateResult), updateResult.dir.natives, updateResult.dir.assets);
        const __launchArguments = [].concat(launchArguments.jvm, launchArguments.game)
        this.emit('debug', __launchArguments.join(' '))

        this.emit('debug', '[MLT][L] Launch Minecraft')
        return this.runMinecraft(__launchArguments)
    }   

    runMinecraft(launchArguments)
    {
        this.emit('debug', launchArguments)

        this.emit('debug', '[MLT][L] Run builded process...')
        const process_minecraft = child.spawn(
            this.launchOptions.javaPath || 'java',
            launchArguments,
            {
                cwd: this.launchOptions.launcherPath,
                detached: this.launchOptions.detached || false
            }
        )

        //redirect IO threads
        this.emit('debug', '[MLT][L] Redirect IO Threads')
        process_minecraft.stdout.on('data', (data) => this.emit('data', data.toString('utf-8')))
        process_minecraft.stderr.on('data', (data) => this.emit('data', data.toString('utf-8')))

        //callback
        process_minecraft.on('close', (code) => this.emit('close', code))
        return process_minecraft
    }

    //ref: вынести в UTILS
    createDirectory(directory)
    {
        if (!fs.existsSync(directory)) {
            this.emit('debug', '[MLT]: Attempting to create folder: ' + directory)
            fs.mkdirSync(directory)
          }
    }
}

module.exports = TrophyLauncher