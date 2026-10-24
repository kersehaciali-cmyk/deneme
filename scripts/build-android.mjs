import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const androidRoot = resolve(projectRoot, 'android')
const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const result = spawnSync(wrapper, ['assembleDebug'], {
  cwd: androidRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.status !== 0) process.exit(result.status ?? 1)

const apk = resolve(androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
if (!existsSync(apk)) throw new Error(`APK bulunamadı: ${apk}`)

const releaseDirectory = resolve(projectRoot, 'release')
const target = resolve(releaseDirectory, 'Tesisat-PRO-debug.apk')
mkdirSync(releaseDirectory, { recursive: true })
copyFileSync(apk, target)
process.stdout.write(`\nAPK hazır: ${target}\n`)

