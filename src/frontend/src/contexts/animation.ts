import { createContext } from 'react'
import { Animations } from '../types/animations'

export const AnimationContext = createContext<Animations | null>(null)
