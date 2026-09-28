import { spawn } from 'node:child_process'

export function openBrowser(url: string) {
  const command =
    process.platform === 'win32'
      ? 'rundll32.exe'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open'
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url]
  const child = spawn(command, args, { windowsHide: true, stdio: 'ignore', detached: true })
  child.on('error', () => console.log('Open the connection link above in your browser.'))
  child.unref()
}
