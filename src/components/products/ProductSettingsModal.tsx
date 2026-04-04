'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronRight, Pencil } from 'lucide-react'
import { TrashIcon } from '@/components/icons'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { SORT_OPTIONS } from '@/lib/products'
import type { ProductCategory, SortPreference } from '@/types'

// ============================================
// PROPS INTERFACE
// ============================================

export interface ProductSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void

  // Categories
  categories: ProductCategory[]
  isCreatingCategory: boolean
  isUpdatingCategory: boolean
  isDeletingCategory: boolean
  onCreateCategory: (name: string) => Promise<ProductCategory | null>
  onUpdateCategory: (id: string, name: string) => Promise<ProductCategory | null>
  onDeleteCategory: (id: string) => Promise<boolean>

  // Settings
  defaultCategoryId: string | null
  sortPreference: SortPreference
  isSavingSettings: boolean
  onUpdateSettings: (updates: { defaultCategoryId?: string | null; sortPreference?: SortPreference }) => Promise<unknown>

  // Error
  error: string
  onClearError: () => void
}

// ============================================
// BUTTON COMPONENTS
// ============================================

interface SaveCategoryButtonProps {
  name: string
  editingCategory: ProductCategory | null
  onSave: () => Promise<void>
  isSaving: boolean
}

function SaveCategoryButton({ name, editingCategory, onSave, isSaving }: SaveCategoryButtonProps) {
  const { goToStep } = useMorphingModal()
  const isValid = name.trim().length > 0
  const hasChanges = editingCategory ? name.trim() !== editingCategory.name : true

  const handleSave = () => {
    goToStep(4)
    onSave()
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      className="btn btn-primary flex-1"
      disabled={isSaving || !isValid || !hasChanges}
    >
      {isSaving ? <Spinner /> : 'Save'}
    </button>
  )
}

interface DeleteCategoryButtonProps {
  onDelete: () => Promise<void>
  isDeleting: boolean
}

function DeleteCategoryButton({ onDelete, isDeleting }: DeleteCategoryButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleDelete = () => {
    goToStep(4)
    onDelete()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : 'Delete'}
    </button>
  )
}

// ============================================
// COMPONENT
// ============================================

export function ProductSettingsModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  isCreatingCategory,
  isUpdatingCategory,
  isDeletingCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  defaultCategoryId,
  sortPreference,
  isSavingSettings,
  onUpdateSettings,
  error,
  onClearError,
}: ProductSettingsModalProps) {
  // Local state for form
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null)
  const [actionCompleted, setActionCompleted] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  // Local preferences state (saved on Done, not on change)
  const [localDefaultCategoryId, setLocalDefaultCategoryId] = useState<string | null>(defaultCategoryId)
  const [localSortPreference, setLocalSortPreference] = useState<SortPreference>(sortPreference)

  // Sync local state when props change (e.g., after save)
  useEffect(() => {
    setLocalDefaultCategoryId(defaultCategoryId)
  }, [defaultCategoryId])

  useEffect(() => {
    setLocalSortPreference(sortPreference)
  }, [sortPreference])

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCategoryName('')
      setEditingCategory(null)
      setDeletingCategory(null)
      setActionCompleted(false)
      setActionMessage('')
      setLocalDefaultCategoryId(defaultCategoryId)
      setLocalSortPreference(sortPreference)
      onClearError()
    }
  }, [isOpen, onClearError, defaultCategoryId, sortPreference])

  // Handle category save (create or update)
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return

    let result: ProductCategory | null
    if (editingCategory) {
      result = await onUpdateCategory(editingCategory.id, categoryName.trim())
      if (result) {
        setActionMessage('Category updated')
        setActionCompleted(true)
      }
    } else {
      result = await onCreateCategory(categoryName.trim())
      if (result) {
        setActionMessage('Category created')
        setActionCompleted(true)
      }
    }
  }

  // Handle category delete
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return
    const success = await onDeleteCategory(deletingCategory.id)
    if (success) {
      setActionMessage('Category deleted')
      setActionCompleted(true)
    }
  }

  // Count products per category (would need to be passed in for accurate counts)
  const getCategoryProductCount = (_categoryId: string) => {
    // For now, return 0 - will need to implement product counting
    return 0
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title="Product Settings"
    >
      {/* Step 0: Main menu */}
      <Modal.Step title="Product Settings" hideBackButton>
        <Modal.Item>
          <Modal.GoToStepButton
            step={1}
            className="list-item-clickable list-item-flat w-full text-left"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium block">Categories</span>
              <span className="text-xs text-text-tertiary">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
          </Modal.GoToStepButton>
          <Modal.GoToStepButton
            step={5}
            className="list-item-clickable list-item-flat w-full text-left"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium block">Preferences</span>
              <span className="text-xs text-text-tertiary">
                Default category and sort order
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
          </Modal.GoToStepButton>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Categories list */}
      <Modal.Step title="Categories" backStep={0}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <div>
            {categories.map(category => (
              <div
                key={category.id}
                className="list-item-clickable list-item-flat"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium block truncate">{category.name}</span>
                </div>
                <Modal.GoToStepButton
                  step={2}
                  onClick={() => {
                    setEditingCategory(category)
                    setCategoryName(category.name)
                    setActionCompleted(false)
                  }}
                  className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <Pencil style={{ width: 16, height: 16 }} />
                </Modal.GoToStepButton>
                <Modal.GoToStepButton
                  step={3}
                  onClick={() => {
                    setDeletingCategory(category)
                    setActionCompleted(false)
                  }}
                  className="p-1 text-text-tertiary hover:text-error transition-colors"
                >
                  <TrashIcon style={{ width: 16, height: 16 }} />
                </Modal.GoToStepButton>
              </div>
            ))}
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1">
            Back
          </Modal.CancelBackButton>
          <Modal.GoToStepButton
            step={2}
            onClick={() => {
              setEditingCategory(null)
              setCategoryName('')
              setActionCompleted(false)
            }}
            className="btn btn-primary flex-1"
          >
            <Plus style={{ width: 16, height: 16 }} />
            Add
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Add/Edit category */}
      <Modal.Step title={editingCategory ? 'Edit Category' : 'Add Category'} backStep={1}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <label htmlFor="category-name" className="label">
            Name <span className="text-error">*</span>
          </label>
          <input
            id="category-name"
            type="text"
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            className="input"
            placeholder="E.g.: Snacks"
            autoComplete="off"
            autoFocus
          />
        </Modal.Item>

        <Modal.Footer>
          {editingCategory && (
            <Modal.GoToStepButton
              step={3}
              onClick={() => {
                setDeletingCategory(editingCategory)
                setActionCompleted(false)
              }}
              className="btn btn-secondary"
            >
              <TrashIcon style={{ width: 16, height: 16 }} />
            </Modal.GoToStepButton>
          )}
          <SaveCategoryButton
            name={categoryName}
            editingCategory={editingCategory}
            onSave={handleSaveCategory}
            isSaving={isCreatingCategory || isUpdatingCategory}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Delete category confirmation */}
      <Modal.Step title="Delete Category" backStep={1}>
        <Modal.Item>
          <p className="text-text-secondary">
            Are you sure you want to delete <strong>{deletingCategory?.name}</strong>?
            {getCategoryProductCount(deletingCategory?.id || '') > 0 && (
              <span className="block mt-2 text-sm text-warning">
                Products in this category will become uncategorized.
              </span>
            )}
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1">
            Cancel
          </Modal.GoToStepButton>
          <DeleteCategoryButton
            onDelete={handleDeleteCategory}
            isDeleting={isDeletingCategory}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Success */}
      <Modal.Step title="Done" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {actionCompleted && (
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
              style={{ opacity: actionCompleted ? 1 : 0 }}
            >
              {actionMessage}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton
            step={1}
            onClick={() => {
              setEditingCategory(null)
              setDeletingCategory(null)
              setCategoryName('')
              setActionCompleted(false)
            }}
            className="btn btn-primary flex-1"
          >
            Done
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Preferences */}
      <Modal.Step title="Preferences" backStep={0}>
        <Modal.Item>
          <label htmlFor="default-category" className="label">Default Category</label>
          <select
            id="default-category"
            value={localDefaultCategoryId || ''}
            onChange={(e) => setLocalDefaultCategoryId(e.target.value || null)}
            className={`input ${!localDefaultCategoryId ? 'select-placeholder' : ''}`}
          >
            <option value="">None</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            Pre-selected when adding new products
          </p>
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="sort-preference" className="label">Default Sort</label>
          <select
            id="sort-preference"
            value={localSortPreference}
            onChange={(e) => setLocalSortPreference(e.target.value as SortPreference)}
            className="input"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            Default sorting for the product list
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1">
            Back
          </Modal.CancelBackButton>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={isSavingSettings || (localDefaultCategoryId === defaultCategoryId && localSortPreference === sortPreference)}
            onClick={() => {
              onUpdateSettings({
                defaultCategoryId: localDefaultCategoryId,
                sortPreference: localSortPreference,
              })
            }}
          >
            Save
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
