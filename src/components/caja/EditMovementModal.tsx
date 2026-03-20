'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import { Modal, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_LABELS, getCategoriesForType } from '@/lib/cash'
import type { CashMovement, CashMovementType, CashMovementCategory } from '@/types'

interface EditMovementModalProps {
  isOpen: boolean
  onClose: () => void
  movement: CashMovement | null
  onSave: (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ) => Promise<void>
  onDelete: (movementId: string) => Promise<void>
}

export function EditMovementModal({
  isOpen,
  onClose,
  movement,
  onSave,
  onDelete,
}: EditMovementModalProps) {
  const [type, setType] = useState<CashMovementType>('ingreso')
  const [category, setCategory] = useState<CashMovementCategory | ''>('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset form when movement changes
  useEffect(() => {
    if (movement) {
      setType(movement.type)
      setCategory(movement.category)
      setAmount(movement.amount.toString())
      setNote(movement.note || '')
    }
  }, [movement])

  const handleClose = () => {
    if (!isSaving && !isDeleting) {
      onClose()
    }
  }

  const handleSave = async () => {
    if (!movement || !category) return

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) return

    setIsSaving(true)
    try {
      await onSave(movement, type, category, amountValue, note)
      onClose()
    } catch (err) {
      console.error('Error updating movement:', err)
      alert('Error al actualizar el movimiento')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!movement) return

    setIsDeleting(true)
    try {
      await onDelete(movement.id)
      onClose()
    } catch (err) {
      console.error('Error deleting movement:', err)
      alert('Error al eliminar el movimiento')
    } finally {
      setIsDeleting(false)
    }
  }

  const categories = getCategoriesForType(type)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
    >
      <Modal.Step title="Editar movimiento">
        <Modal.Item>
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
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="edit-category" className="label">Categoria <span className="text-error">*</span></label>
          <select
            id="edit-category"
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
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="edit-amount" className="label">Monto (S/) <span className="text-error">*</span></label>
          <input
            id="edit-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="edit-note" className="label">Nota (opcional)</label>
          <textarea
            id="edit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Descripcion del movimiento..."
            rows={2}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.NextButton className="btn btn-secondary">
            <Trash2 className="w-5 h-5" />
          </Modal.NextButton>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving || !category || !amount || parseFloat(amount) <= 0}
          >
            {isSaving ? <Spinner /> : 'Guardar'}
          </button>
        </Modal.Footer>
      </Modal.Step>

      <Modal.Step title="Eliminar movimiento">
        <Modal.Item>
          <p className="text-text-secondary">
            Estas seguro de que deseas eliminar este movimiento?
          </p>
        </Modal.Item>

        {movement && (
          <Modal.Item>
            <div className="p-4 bg-bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Tipo</span>
                <span className="text-sm font-medium">
                  {movement.type === 'ingreso' ? 'Ingreso' : 'Retiro'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Categoria</span>
                <span className="text-sm font-medium">
                  {CATEGORY_LABELS[movement.category]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Monto</span>
                <span className={`text-sm font-medium ${movement.type === 'ingreso' ? 'text-success' : 'text-error'}`}>
                  {movement.type === 'ingreso' ? '+' : '-'}{formatCurrency(movement.amount)}
                </span>
              </div>
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <p className="text-sm text-error">
            Esta accion no se puede deshacer.
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1">
            Volver
          </Modal.BackButton>
          <button
            type="button"
            onClick={handleDelete}
            className="btn bg-error text-white hover:bg-error/90 flex-1"
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner /> : 'Eliminar'}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
