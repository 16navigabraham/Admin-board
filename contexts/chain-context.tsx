"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ChainKey, CONTRACTS, DEFAULT_CHAIN, getChainConfig } from '@/config/contract'

interface ChainContextType {
  selectedChain: ChainKey
  setSelectedChain: (chain: ChainKey) => void
  chainConfig: ReturnType<typeof getChainConfig>
  isLoading: boolean
}

const ChainContext = createContext<ChainContextType | undefined>(undefined)

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChainState] = useState<ChainKey>(DEFAULT_CHAIN)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved chain preference from localStorage
  useEffect(() => {
    const savedChain = localStorage.getItem('paycrypt_selected_chain') as ChainKey
    if (savedChain && CONTRACTS[savedChain]) {
      setSelectedChainState(savedChain)
    }
    setIsLoading(false)
  }, [])

  // Save chain preference when it changes
  const setSelectedChain = (chain: ChainKey) => {
    setSelectedChainState(chain)
    localStorage.setItem('paycrypt_selected_chain', chain)
  }

  const chainConfig = getChainConfig(CONTRACTS[selectedChain].chainId)

  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain, chainConfig, isLoading }}>
      {children}
    </ChainContext.Provider>
  )
}

export function useChain() {
  const context = useContext(ChainContext)
  if (context === undefined) {
    throw new Error('useChain must be used within a ChainProvider')
  }
  return context
}
