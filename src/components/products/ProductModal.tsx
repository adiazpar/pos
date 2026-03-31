// Shared types for product modals

export interface ProductFormData {
  name: string
  price: string
  categoryId: string
  active: boolean
  generatedIconBlob: Blob | null
}

export interface StockAdjustmentData {
  productId: string
  newStockValue: number
}
