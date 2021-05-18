const fs = require('fs')
const path = require('path')
const request = require('request')
const checksum = require('checksum')
const Zip = require('adm-zip')
const child = require('child_process')
const { exception } = require('console')

let counter = -1;

class TrophyUtils
{
    constructor (launcher, parser)
    {
        this.launcher = launcher;
        this.parser = parser;


        this.baseRequest = request.defaults(
        {
            pool: { maxSockets: 2 },
            timeout: 10000
        })

    }

    async downloadUpdate(json)
    {
        counter = 0
        const collections = []
        

        //download jar, natives, artifacts(libs), assets, (addons?)

        const dirVersion = path.resolve(
            path.join(
                this.launcher.launchOptions.launcherPath,
                'versions', 
                this.launcher.launchOptions.version.number
        ))

        if (!fs.existsSync(dirVersion) || !fs.readdirSync(dirVersion).length)
            fs.mkdirSync(dirVersion, { recursive: true })

        if(this.launcher.launchOptions.version.jsonDownload || false) { }

        let name = this.launcher.launchOptions.version.number + '.jar',
            file_path = path.join(dirVersion, name)
        /*
        await this.downloadAsync(json.downloads.client.url, dirVersion, this.launcher.launchOptions.version.number, true, 'artifacts-jar')

        if(!fs.existsSync(file_path))
        {
            await this.downloadAsync(downloadable.url, _path, name, true, target)
        }
        else
        {
            if (!await this.checkSum(downloadable.sha1, file_path))
                await this.downloadAsync(downloadable.url, _path, name, true, target)   
        }*/
        const artifact = json.downloads.client
        
        artifact.path = this.launcher.launchOptions.version.number  + '.jar'

        collections.version = await this.downloadUpdateAA([artifact], 'artifacts-jar', dirVersion)



        



        const dirNatives = path.resolve(path.join(this.launcher.launchOptions.launcherPath, 'natives', json.id))

        if (!fs.existsSync(dirNatives) || !fs.readdirSync(dirNatives).length)
            fs.mkdirSync(dirNatives, { recursive: true })

        const natives = async () => 
        {
            let natives = []
            await Promise.all(json.libraries.map(async (lib) => 
            {
                // это мы отсекаем нативки от артифактов ))) лолблять)) гениально пизда
                if (!lib.downloads || !lib.downloads.classifiers) return
                if (!this.fetchRule(lib)) return
                    
               
                let native = []
                switch('windows')
                {
                    case 'osx': native =        lib.downloads.classifiers['natives-osx'] || lib.downloads.classifiers['natives-macos'];
                        break
                    case 'windows': native =    lib.downloads.classifiers['natives-windows']
                        break
                    case 'linux': native =      lib.downloads.classifiers['natives-linux']
                        break
                }

                natives.push(native)
            }))
            return natives
        }

        //RETURNED NATIVESLIST -D JAVA_natives
        collections.natives = await this.downloadUpdateAA(await natives(), 'natives', dirNatives, true)


        
        const dirLibraries = path.resolve(path.join(this.launcher.launchOptions.launcherPath, 'libraries'))

        const libraries = async () => 
        {
            let libraries = []

            await Promise.all(json.libraries.map(async (lib) => 
            {
                if (!lib.downloads || !lib.downloads.artifact)  return
                if(!this.fetchRule(lib)) return
                    
               
                let library = lib.downloads.artifact

                libraries.push(library)
            }))
            return libraries
        }

        //RETURNED CLASSPATH -CP
        collections.libraries = await this.downloadUpdateAA(await libraries(), 'libraries', dirLibraries)



        




        const dirAssets = path.resolve(path.join(this.launcher.launchOptions.launcherPath, 'assets'))

        if (!fs.existsSync(dirAssets) || !fs.readdirSync(dirAssets).length)
            fs.mkdirSync(dirAssets, { recursive: true })

        

        if(!fs.existsSync(path.join(dirAssets, 'indexes', json.assetIndex.id + '.json')))
        {
            await this.downloadAsync(json.assetIndex.url, path.join(dirAssets, 'indexes'), json.assetIndex.id + '.json', true, 'asset-json')
        }

        const assetsJSON = JSON.parse(fs.readFileSync(path.join(dirAssets, 'indexes', json.assetIndex.id + '.json'), { encoding: 'utf8' }))

        this.launcher.emit('progress', {
            type: 'assets',
            task: 0,
            total: Object.keys(assetsJSON.objects).length
          })

        const assets = async () => 
        {
            let assets = []

            await Promise.all(Object.keys(assetsJSON.objects).map(async (asset) => 
            {
                const hash = assetsJSON.objects[asset].hash
                const size = assetsJSON.objects[asset].size
                const hashSS = hash.substring(0, 2)

               
                let downloadable = 
                {
                    path: 'objects/' + hashSS + '/' + hash,
                    sha1: hash,
                    size: size,
                    url: this.parser.url.resource + '/' + hashSS + '/' + hash
                }

                assets.push(downloadable)
            }))
            return assets
        }

        await this.downloadUpdateAA(await assets(), 'assets', dirAssets)

        const ret =
        {
            dir: 
            {
                version: dirVersion,
                natives: dirNatives,
                libraries: dirLibraries,
                assets: dirAssets
            },
            collections: collections
        }
        return ret
    }

    async downloadUpdateAA(collections, target, directory, unzip = false)
    {
        counter = 0
        this.launcher.emit('progress', 
        {
            type: target,
            task: counter,
            total: collections.length
        })
        
        await Promise.all(collections.map(async (downloadable) =>
        {
            if (!downloadable) return

            const split = downloadable.path.split('/'), 
                name = split.pop(),
                _path = path.join(directory, split.join('/'))

            let file_path = path.join(directory, downloadable.path)

            if(!fs.existsSync(file_path))
            {
                await this.downloadAsync(downloadable.url, _path, name, true, target)
            }
            else
            {
                if (!await this.checkSum(downloadable.sha1, file_path))
                    await this.downloadAsync(downloadable.url, _path, name, true, target)   
            }

            if(unzip)
            {
                try
                {
                    this.launcher.emit('debug', file_path)
                    new Zip(file_path).extractAllTo(directory, true)
                    //fs.unlinkSync(file_path) //temp rel...
                }
                catch (exception)
                {
                    console.warn(exception)
                }
                
            }
            
            counter++
            this.launcher.emit('progress', 
            {
                type: target,
                task: counter,
                total: collections.length
            })

        }))

        counter -1
        this.launcher.emit('progress', 
        {
            type: target,
            task: counter,
            total: collections.length
        })
        return collections
    }

    fetchRule(lib)
    {
        let allow = false, os = 'windows'

        if(lib.rules) lib.rules.forEach(rule => 
        {
            let action = (rule.action == 'allow') // true/false
            if(rule.os)
            if(rule.os.name == os) allow = action
            else allow = action
        })
        else allow = true

        return allow
    }

    checkSum (hash, file) {
        return new Promise((resolve, reject) => 
        {
          checksum.file(file, (err, sum) => {
            if (err) {
              this.launcher.emit('debug', '[MLT]: Failed to check file hash due to')
              resolve(false)
            } else {
              resolve(hash === sum)
            }
          })
        })
      }
    

    //to-do: refactor
    //copy paste part
    downloadAsync(url, directory, name, retry, type)
    {
        return new Promise(resolve => {
            fs.mkdirSync(directory, { recursive: true })
      
            const _request = this.baseRequest(url)
      
            let receivedBytes = 0
            let totalBytes = 0
      
            _request.on('response', (data) => {
              if (data.statusCode === 404) {
                this.launcher.emit('debug', `[MCLC]: Failed to download ${url} due to: File not found...`)
                resolve(false)
              }
      
              totalBytes = parseInt(data.headers['content-length'])
            })
      
            _request.on('error', async (error) => {
              this.launcher.emit('debug', `[MCLC]: Failed to download asset to ${path.join(directory, name)} due to\n${error}.` +
                          ` Retrying... ${retry}`)
              if (retry) await this.downloadAsync(url, directory, name, false, type)
              resolve()
            })
      
            _request.on('data', (data) => {
              receivedBytes += data.length
              this.launcher.emit('download-status', {
                name: name,
                type: type,
                current: receivedBytes,
                total: totalBytes
              })
            })
      
            const file = fs.createWriteStream(path.join(directory, name))
            _request.pipe(file)
      
            file.once('finish', () => {
              this.launcher.emit('download', name)
              resolve({
                failed: false,
                asset: null
              })
            })
      
            file.on('error', async (e) => {
              this.launcher.emit('debug', `[MCLC]: Failed to download asset to ${path.join(directory, name)} due to\n${e}.` +
                          ` Retrying... ${retry}`)
              if (fs.existsSync(path.join(directory, name))) fs.unlinkSync(path.join(directory, name))
              if (retry) await this.downloadAsync(url, directory, name, false, type)
              resolve()
            })
          })
    }


    toCP(updateResult, separator = ';')
    {
        const classpath = [], ret = []
        updateResult.collections.libraries.forEach( (lib) => 
        {
            classpath.push(path.join(updateResult.dir.libraries, lib.path))
        })
        
        
        classpath.push(path.join(updateResult.dir.version, updateResult.collections.version[0].path))
        return classpath.join(separator);
    }



}

module.exports = TrophyUtils