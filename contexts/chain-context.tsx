"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ChainKey, CONTRACTS, DEFAULT_CHAIN, getChainConfig } from '@/config/contract'
import { useSwitchChain, useAccount } from 'wagmi'
import { toast } from 'sonner'

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
  const { switchChain } = useSwitchChain()
  const { isConnected, chain: walletChain } = useAccount()

  // Load saved chain preference from localStorage
  useEffect(() => {
    const savedChain = localStorage.getItem('paycrypt_selected_chain') as ChainKey
    if (savedChain && CONTRACTS[savedChain]) {
      setSelectedChainState(savedChain)
    }
    setIsLoading(false)
  }, [])

  // Sync UI when user manually switches chains in wallet
  useEffect(() => {
    if (isConnected && walletChain) {
      const matchingChain = Object.entries(CONTRACTS).find(
        ([_, config]) => config.chainId === walletChain.id
      )
      
      if (matchingChain) {
        const [chainKey] = matchingChain as [ChainKey, any]
        if (chainKey !== selectedChain) {
          setSelectedChainState(chainKey)
          localStorage.setItem('paycrypt_selected_chain', chainKey)
          console.log(`🔄 Wallet switched to ${walletChain.name}, updating UI`)
        }
      }
    }
  }, [walletChain, isConnected])

  // Save chain preference when it changes and switch wallet chain
  const setSelectedChain = async (chain: ChainKey) => {
    setSelectedChainState(chain)
    localStorage.setItem('paycrypt_selected_chain', chain)
    
    // If wallet is connected, prompt user to switch chains
    if (isConnected && switchChain) {
      try {
        const chainId = CONTRACTS[chain].chainId
        await switchChain({ chainId })
        toast.success(`Switched to ${CONTRACTS[chain].name} network`)
      } catch (error: any) {
        console.error('Failed to switch chain:', error)
        if (error.message?.includes('User rejected')) {
          toast.info('Chain switch cancelled')
        } else {
          toast.error(`Failed to switch to ${CONTRACTS[chain].name}. Please switch manually in your wallet.`)
        }
      }
    }
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
