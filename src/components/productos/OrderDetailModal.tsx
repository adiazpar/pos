'use client'

import Image from 'next/image'
import { Trash2, Pencil, ImageIcon, ArrowUp, ArrowDown, ChevronDown, CalendarClock, MinusCircle, PlusCircle, AlertTriangle } from 'lucide-react'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { formatCurrency, formatDate, getProductIconUrl } from '@/lib/utils'
import type { Provider } from '@/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'

// ============================================
// PROPS INTERFACE
// ============================================

export interface OrderDetailModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  // Order being viewed
  order: ExpandedOrder | null

  // Products and providers
  providers: Provider[]

  // Form state for editing
  orderItems: OrderFormItem[]
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>
  onUpdateQuantity: (productId: string, quantity: number) => void
  orderTotal: string
  onOrderTotalChange: (total: string) => void
  orderNotes: string
  onOrderNotesChange: (notes: string) => void
  orderEstimatedArrival: string
  onOrderEstimatedArrivalChange: (date: string) => void
  orderProvider: string
  onOrderProviderChange: (providerId: string) => void

  // Receive order state
  receivedQuantities: Record<string, number>
  setReceivedQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>

  // Operation states
  isSaving: boolean
  isReceiving: boolean
  isDeleting: boolean
  error: string

  // Success states
  orderReceived: boolean
  orderDeleted: boolean
  editOrderSaved: boolean

  // Handlers
  onInitializeEditForm: (order: ExpandedOrder) => void
  onInitializeReceiveQuantities: (order: ExpandedOrder) => void
  onSaveEditOrder: () => Promise<boolean>
  onReceiveOrder: () => Promise<boolean>
  onDeleteOrder: () => Promise<boolean>
  getReceiptUrl: (order: ExpandedOrder) => string | null

  // Permissions
  canDelete: boolean
}

// ============================================
// BUTTON COMPONENTS
// ============================================

function GoToReceiveStepButton({ order, onInitialize }: { order: ExpandedOrder; onInitialize: (order: ExpandedOrder) => void }) {
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    onInitialize(order)
    goToStep(3)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
    >
      Recibir
    </button>
  )
}

function GoToEditStepButton({ order, onInitialize }: { order: ExpandedOrder; onInitialize: (order: ExpandedOrder) => void }) {
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    onInitialize(order)
    goToStep(1)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-secondary"
      title="Editar pedido"
    >
      <Pencil className="w-5 h-5" />
    </button>
  )
}

function ConfirmReceiveButton({ onReceive, isReceiving }: { onReceive: () => Promise<boolean>; isReceiving: boolean }) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onReceive()
    if (success) {
      goToStep(5)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={isReceiving}
    >
      {isReceiving ? <Spinner /> : 'Confirmar'}
    </button>
  )
}

function ConfirmDeleteButton({ onDelete, isDeleting }: { onDelete: () => Promise<boolean>; isDeleting: boolean }) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onDelete()
    if (success) {
      goToStep(6)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : 'Eliminar'}
    </button>
  )
}

function ConfirmEditOrderButton({ onSave, isSaving, disabled }: { onSave: () => Promise<boolean>; isSaving: boolean; disabled: boolean }) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onSave()
    if (success) {
      goToStep(2)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={disabled}
    >
      {isSaving ? <Spinner /> : 'Guardar'}
    </button>
  )
}

// ============================================
// COMPONENT
// ============================================

export function OrderDetailModal({
  isOpen,
  onClose,
  onExitComplete,
  order,
  providers,
  orderItems,
  setOrderItems,
  onUpdateQuantity,
  orderTotal,
  onOrderTotalChange,
  orderNotes,
  onOrderNotesChange,
  orderEstimatedArrival,
  onOrderEstimatedArrivalChange,
  orderProvider,
  onOrderProviderChange,
  receivedQuantities,
  setReceivedQuantities,
  isSaving,
  isReceiving,
  isDeleting,
  error,
  orderReceived,
  orderDeleted,
  editOrderSaved,
  onInitializeEditForm,
  onInitializeReceiveQuantities,
  onSaveEditOrder,
  onReceiveOrder,
  onDeleteOrder,
  getReceiptUrl,
  canDelete,
}: OrderDetailModalProps) {
  if (!order) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title="Detalle del Pedido"
      size="large"
    >
      {/* Step 0: Order Details */}
      <Modal.Step title="Detalle del Pedido">
        {/* Products list - compact */}
        <Modal.Item>
          <div className="space-y-1">
            {order.expand?.['order_items(order)']?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-text-secondary">{item.productName}</span>
                <span className="text-text-secondary">{item.quantity}x</span>
              </div>
            ))}
          </div>
        </Modal.Item>

        {/* Divider */}
        <Modal.Item>
          <div className="border-t border-dashed border-border" />
        </Modal.Item>

        {/* Details */}
        <Modal.Item>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Total</span>
              <span className="font-semibold">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Proveedor</span>
              <span>{order.expand?.provider?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Estado</span>
              <span className={order.status === 'pending' ? 'text-warning' : 'text-success'}>
                {order.status === 'pending' ? 'Pendiente' : 'Recibido'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Fecha</span>
              <span>{formatDate(new Date(order.date))}</span>
            </div>
            {order.estimatedArrival && order.status === 'pending' && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Llegada est.</span>
                <span>{formatDate(new Date(order.estimatedArrival))}</span>
              </div>
            )}
            {order.receivedDate && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Fecha recibido</span>
                <span>{formatDate(new Date(order.receivedDate))}</span>
              </div>
            )}
            {order.receipt && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Comprobante</span>
                <a
                  href={getReceiptUrl(order) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand"
                >
                  Ver adjunto
                </a>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Notas</span>
                <span className="text-right max-w-[60%] truncate">{order.notes}</span>
              </div>
            )}
          </div>
        </Modal.Item>

        {/* Footer for pending orders */}
        {order.status === 'pending' ? (
          <Modal.Footer>
            {canDelete && (
              <Modal.GoToStepButton
                step={4}
                className="btn-icon !bg-transparent text-error hover:!bg-error-subtle rounded-lg"
                title="Eliminar pedido"
              >
                <Trash2 className="w-5 h-5" />
              </Modal.GoToStepButton>
            )}
            <GoToEditStepButton order={order} onInitialize={onInitializeEditForm} />
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
            <GoToReceiveStepButton order={order} onInitialize={onInitializeReceiveQuantities} />
          </Modal.Footer>
        ) : (
          <Modal.Footer>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cerrar
            </button>
          </Modal.Footer>
        )}
      </Modal.Step>

      {/* Step 1: Edit Order */}
      <Modal.Step title="Editar Pedido" backStep={0}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Products with quantities */}
        <Modal.Item>
          <label className="label">Productos</label>
          <div className="space-y-3">
            {orderItems.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                {/* Product image */}
                <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                  {getProductIconUrl(item.product, '64x64') ? (
                    <Image
                      src={getProductIconUrl(item.product, '64x64')!}
                      alt={item.product.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                {/* Product name */}
                <span className="flex-1 text-sm font-medium truncate min-w-0">
                  {item.product.name}
                </span>
                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 ${
                      item.quantity <= 1 ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'
                    }`}
                  >
                    <MinusCircle className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        setOrderItems(prev => prev.map(i =>
                          i.product.id === item.product.id
                            ? { ...i, quantity: '' as unknown as number }
                            : i
                        ))
                      } else {
                        const num = parseInt(val, 10)
                        if (!isNaN(num)) {
                          onUpdateQuantity(item.product.id, Math.max(1, num))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (isNaN(val) || val < 1) {
                        onUpdateQuantity(item.product.id, 1)
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-10 text-center font-semibold bg-primary text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 active:scale-90"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal.Item>

        {/* Total & Provider */}
        <Modal.Item>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editOrderTotal" className="label">Total pagado (S/) <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <input
                  id="editOrderTotal"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={orderTotal}
                  onChange={e => onOrderTotalChange(e.target.value)}
                  className="input"
                  placeholder="0.00"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(orderTotal) || 0
                      onOrderTotalChange((current + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Incrementar total"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(orderTotal) || 0
                      onOrderTotalChange(Math.max(0, current - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Decrementar total"
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="editOrderProvider" className="label">Proveedor</label>
              <div className="relative">
                <select
                  id="editOrderProvider"
                  value={orderProvider}
                  onChange={e => onOrderProviderChange(e.target.value)}
                  className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`}
                  style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}
                >
                  <option value="">N/A</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </Modal.Item>

        {/* Estimated Arrival */}
        <Modal.Item>
          <label className="label">Fecha estimada de llegada (opcional)</label>
          <div className="relative">
            <div className={`input w-full flex items-center justify-between pointer-events-none ${orderEstimatedArrival ? 'text-text-primary' : 'text-text-tertiary'}`}>
              <span>{orderEstimatedArrival ? formatDate(orderEstimatedArrival) : 'Seleccionar fecha...'}</span>
              <CalendarClock className="w-5 h-5 text-text-tertiary" />
            </div>
            <input
              type="date"
              value={orderEstimatedArrival}
              onChange={e => onOrderEstimatedArrivalChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </Modal.Item>

        {/* Notes */}
        <Modal.Item>
          <label htmlFor="editOrderNotes" className="label">Notas (opcional)</label>
          <textarea
            id="editOrderNotes"
            value={orderNotes}
            onChange={e => onOrderNotesChange(e.target.value)}
            className="input"
            rows={2}
            placeholder="Notas del pedido..."
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
            Cancelar
          </Modal.GoToStepButton>
          <ConfirmEditOrderButton onSave={onSaveEditOrder} isSaving={isSaving} disabled={isSaving || !orderTotal || parseFloat(orderTotal) <= 0} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Edit Success */}
      <Modal.Step title="Pedido actualizado" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {editOrderSaved && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={500}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
              style={{ opacity: editOrderSaved ? 1 : 0 }}
            >
              Pedido actualizado!
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: editOrderSaved ? 1 : 0 }}
            >
              Los cambios han sido guardados
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Cerrar
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Receive Order */}
      <Modal.Step title="Recibir Pedido" backStep={0}>
        <Modal.Item>
          <div className="p-4 rounded-lg bg-bg-muted">
            <div className="flex justify-between mb-2">
              <span className="text-text-secondary">Fecha:</span>
              <span className="font-medium">{formatDate(new Date(order.date))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total pagado:</span>
              <span className="font-bold text-error">-{formatCurrency(order.total)}</span>
            </div>
          </div>
        </Modal.Item>

        <Modal.Item>
          <p className="label">Productos a recibir:</p>
          <p className="text-xs text-text-tertiary mb-2">Ajusta las cantidades si recibiste menos de lo ordenado</p>
          <div className="space-y-3">
            {order.expand?.['order_items(order)']?.map(item => {
              const product = item.expand?.product
              const orderedQty = item.quantity
              const receivedQty = receivedQuantities[item.id] ?? orderedQty
              const isDifferent = receivedQty !== orderedQty

              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                  {/* Product image */}
                  <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product && getProductIconUrl(product, '64x64') ? (
                      <Image
                        src={getProductIconUrl(product, '64x64')!}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-text-tertiary" />
                    )}
                  </div>
                  {/* Product name and ordered qty */}
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{item.productName}</span>
                    <span className="text-xs text-text-tertiary">Ordenado: {orderedQty}</span>
                  </div>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setReceivedQuantities(prev => ({
                        ...prev,
                        [item.id]: Math.max(0, (prev[item.id] ?? orderedQty) - 1)
                      }))}
                      disabled={receivedQty <= 0}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 ${
                        receivedQty <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'
                      }`}
                    >
                      <MinusCircle className="w-5 h-5" />
                    </button>
                    <span className={`w-10 text-center font-semibold ${
                      receivedQty === 0 ? 'text-error' : isDifferent ? 'text-warning' : 'text-text-primary'
                    }`}>
                      {receivedQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceivedQuantities(prev => ({
                        ...prev,
                        [item.id]: (prev[item.id] ?? orderedQty) + 1
                      }))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 active:scale-90"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Modal.Item>

        <Modal.Item>
          <div className="p-3 rounded-lg bg-warning-subtle text-warning text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Al confirmar, el stock aumentara segun las cantidades indicadas.
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
            Atras
          </Modal.GoToStepButton>
          <ConfirmReceiveButton onReceive={onReceiveOrder} isReceiving={isReceiving} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Delete Confirmation */}
      <Modal.Step title="Eliminar pedido" backStep={0}>
        <Modal.Item>
          <p className="text-text-secondary">
            Estas seguro que deseas eliminar el pedido del <strong>{formatDate(new Date(order.date))}</strong>? Esta accion no se puede deshacer.
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
            Cancelar
          </Modal.GoToStepButton>
          <ConfirmDeleteButton onDelete={onDeleteOrder} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Receive Success */}
      <Modal.Step title="Pedido recibido" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {orderReceived && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={500}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
              style={{ opacity: orderReceived ? 1 : 0 }}
            >
              Stock actualizado!
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: orderReceived ? 1 : 0 }}
            >
              El pedido ha sido recibido y el inventario actualizado
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Listo
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 6: Delete Success */}
      <Modal.Step title="Pedido eliminado" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {orderDeleted && (
                <LottiePlayer
                  src="/animations/error.json"
                  loop={false}
                  autoplay={true}
                  delay={500}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
              style={{ opacity: orderDeleted ? 1 : 0 }}
            >
              Pedido eliminado
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: orderDeleted ? 1 : 0 }}
            >
              El pedido ha sido eliminado correctamente
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Listo
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
