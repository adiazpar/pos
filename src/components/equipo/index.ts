// src/components/equipo/index.ts
// Barrel export for team management components

export { RoleCard } from './RoleCard'
export type { RoleCardProps } from './RoleCard'

export { RoleSelectionContent } from './RoleSelectionContent'
export type { RoleSelectionContentProps } from './RoleSelectionContent'

export { CodeGeneratedContent } from './CodeGeneratedContent'
export type { CodeGeneratedContentProps } from './CodeGeneratedContent'

export { UserDetailsStep } from './UserDetailsStep'
export type { UserDetailsStepProps } from './UserDetailsStep'

export {
  PhoneChangeContent,
  PhoneChangeSaveButton,
  PhoneChangeCancelButton,
} from './PhoneChangeStep'
export type {
  PhoneChangeContentProps,
  PhoneChangeSaveButtonProps,
  PhoneChangeCancelButtonProps,
} from './PhoneChangeStep'

export {
  RoleChangeContent,
  RoleChangeSaveButton,
  RoleChangeCancelButton,
} from './RoleChangeStep'
export type {
  RoleChangeContentProps,
  RoleChangeSaveButtonProps,
  RoleChangeCancelButtonProps,
} from './RoleChangeStep'

export {
  GenerateCodeButton,
  ConfirmDeleteCodeButton,
} from './InviteModalButtons'
export type {
  GenerateCodeButtonProps,
  ConfirmDeleteCodeButtonProps,
} from './InviteModalButtons'

export { TeamMemberListItem } from './TeamMemberListItem'
export type { TeamMemberListItemProps } from './TeamMemberListItem'

export { InviteCodeListItem } from './InviteCodeListItem'
export type { InviteCodeListItemProps } from './InviteCodeListItem'
