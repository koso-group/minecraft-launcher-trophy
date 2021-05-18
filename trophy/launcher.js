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


        this.parser = new TrophyParser(this)
        this.utils = new TrophyUtils(this, this.parser)


        const minecraftJSON = await this.parser.getMinecraftJSON();
        this.emit('debug', minecraftJSON)


        this.createDirectory(this.launchOptions.launcherPath)
        //this.createDirectory()
        const updateResult = await this.utils.downloadUpdate(minecraftJSON)
        this.emit('debug', updateResult)

        const launchArguments = this.parser.getLaunchArguments(minecraftJSON, this.utils.toCP(updateResult), updateResult.dir.natives, updateResult.dir.assets);
        const __launchArguments = [].concat(launchArguments.jvm, launchArguments.game)
        this.emit('debug', __launchArguments.join(' '))
        return this.runMinecraft(__launchArguments)
    }   

    runMinecraft(launchArguments)
    {
        this.emit('debug', launchArguments)

        const process_minecraft = child.spawn(
            this.launchOptions.javaPath || 'java',
            launchArguments,
            {
                cwd: this.launchOptions.launcherPath,
                detached: this.launchOptions.detached || false
            }
        )

        //redirect IO threads
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