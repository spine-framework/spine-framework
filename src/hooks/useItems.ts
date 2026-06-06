import { useState, useEffect } from 'react'
import { Item } from '../types'

interface UseItemsOptions {
  account_id?: string
  type_id?: string
  status?: string
}

export function useItems(options: UseItemsOptions = {}) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [options.account_id, options.type_id, options.status])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      // Mock implementation - would call actual API
      const mockItems: Item[] = [
        {
          id: 'item-1',
          type_id: 'support-ticket',
          account_id: options.account_id || 'default-account',
          title: 'Sample Support Ticket',
          content: { description: 'This is a sample support ticket' },
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      setItems(mockItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const createItem = async (item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> => {
    const newItem: Item = {
      ...item,
      id: `item-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setItems(prev => [...prev, newItem])
    return newItem
  }

  const updateItem = async (id: string, updates: Partial<Item>): Promise<Item> => {
    const updatedItem: Item = {
      ...items.find(item => item.id === id)!,
      ...updates,
      updated_at: new Date().toISOString()
    }
    setItems(prev => prev.map(item => item.id === id ? updatedItem : item))
    return updatedItem
  }

  const deleteItem = async (id: string): Promise<void> => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refresh: loadItems
  }
}
