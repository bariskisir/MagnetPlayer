import { useRef } from 'react'
import { Upload } from 'lucide-react'

export default function TorrentFileUpload({
  connected,
  busy,
  onUpload,
}: {
  connected: boolean
  busy: boolean
  onUpload: (file: File) => Promise<boolean>
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".torrent,application/x-bittorrent"
        aria-label="Choose a .torrent file"
        hidden
        disabled={!connected || busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void onUpload(file)
        }}
      />
      <button
        type="button"
        className="badge upload-torrent-button"
        onClick={() => input.current?.click()}
        disabled={!connected || busy}
        title={connected ? undefined : 'Connect the helper to upload a .torrent file.'}
      >
        <Upload size={14} /> Upload .torrent
      </button>
    </>
  )
}
