import { createContext } from 'react'

export const PausePlaybackContext = createContext<(() => void) | null>(null)
