'use client'

import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Modal, Spinner } from '@/components/ui'
import { CATEGORY_LABELS, getCategoriesForType } from '@/lib/cash'
import type { CashMovementType, CashMovementCategory, CashSession } from '@/types'

interface AddMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ) => Promise<void>
  currentSession: CashSession | null
}

export function AddMovementModal({
  isOpen,
  onClose,
  onSubmit,
  currentSession,
}: AddMovementModalProps) {
  const [type, setType] = useState<CashMovementType>('ingreso')
  const [category, setCategory] = useState<CashMovementCategory | ''>('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = () => {
    setType('ingreso')
    setCategory('')
    setAmount('')
    setNote('')
  }

  const handleClose = () => {
    if (!isSaving) {
      resetForm()
      onClose()
    }
  }

  const handleSubmit = async () => {
    if (!currentSession || !category) return

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) return

    setIsSaving(true)
    try {
      await onSubmit(type, category, amountValue, note)
      resetForm()
      onClose()
    } catch (err) {
      console.error('Error recording movement:', err)
      alert('Error al registrar el movimiento')
    } finally {
      setIsSaving(false)
    }
  }

  const categories = getCategoriesForType(type)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar movimiento"
    >
      <div className="space-y-4">
        {/* Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setType('ingreso')
              setCategory('')
            }}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              type === 'ingreso'
                ? 'bg-success text-white'
                : 'bg-bg-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            <ArrowDownCircle className="w-5 h-5" />
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => {
              setType('retiro')
              setCategory('')
            }}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              type === 'retiro'
                ? 'bg-error text-white'
                : 'bg-bg-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            <ArrowUpCircle className="w-5 h-5" />
            Retiro
          </button>
        </div>

        {/* Category Select */}
        <div>
          <label htmlFor="movement-category" className="label">Categoria <span className="text-error">*</span></label>
          <select
            id="movement-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CashMovementCategory)}
            className="input"
          >
            <option value="">Seleccionar...</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="movement-amount" className="label">Monto (S/) <span className="text-error">*</span></label>
          <input
            id="movement-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Note */}
        <div>
          <label htmlFor="movement-note" className="label">Nota (opcional)</label>
          <textarea
            id="movement-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Descripcion del movimiento..."
            rows={2}
          />
        </div>
      </div>
      <Modal.Footer>
        <button
          type="button"
          onClick={handleClose}
          className="btn btn-secondary flex-1"
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary flex-1"
          disabled={isSaving || !category || !amount || parseFloat(amount) <= 0}
        >
          {isSaving ? <Spinner /> : 'Registrar'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
