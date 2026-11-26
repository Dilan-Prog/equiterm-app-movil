/**
 * Librería de UI de Equiterm (ver src/ui/README.md).
 * Átomos → moléculas → organismos → plantillas. Todo lee colores de `useTheme()`.
 */

// Átomos
export { Text, type TextProps } from './atoms/Text';
export { Icon, resolveIconName, type IconName, type IconProps } from './atoms/Icon';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './atoms/Button';
export { IconButton, type IconButtonProps } from './atoms/IconButton';
export { StatusChip, statusTone, roleTone, toneColors, type StatusChipProps, type ChipTone } from './atoms/StatusChip';
export { Avatar, initials, avatarColor, type AvatarProps } from './atoms/Avatar';
export { Badge, type BadgeProps } from './atoms/Badge';
export { Switch, type SwitchProps } from './atoms/Switch';
export { Radio, Checkbox } from './atoms/Selection';
export { Spinner, type SpinnerProps } from './atoms/Spinner';
export { ProgressBar, type ProgressBarProps } from './atoms/ProgressBar';
export { TextField, type TextFieldProps } from './atoms/TextField';
export { Skeleton, ReportCardSkeleton, type SkeletonProps } from './atoms/Skeleton';
export { Logo, type LogoProps } from './atoms/Logo';

// Moléculas
export { LabeledField, type LabeledFieldProps } from './molecules/LabeledField';
export { SearchBar, type SearchBarProps } from './molecules/SearchBar';
export { FilterChip, OptionChip, type FilterChipProps, type OptionChipProps } from './molecules/Chips';
export { SegmentedControl, type SegmentedControlProps, type SegmentOption } from './molecules/SegmentedControl';
export { ListRow, type ListRowProps } from './molecules/ListRow';
export { DataRow, DataGrid, type DataRowProps, type DataGridProps } from './molecules/DataRow';
export { StepIndicator, type StepIndicatorProps } from './molecules/StepIndicator';
export { AccessCard, type AccessCardProps } from './molecules/AccessCard';
export { Toast, ToastProvider, useToast, type ToastProps, type ToastKind, type ToastAction, type ShowToastOptions } from './molecules/Toast';
export {
  ConnectionBanner,
  useConnectionBanner,
  type ConnectionBannerProps,
  type ConnectionState,
} from './molecules/ConnectionBanner';
export { CollapsibleHeader, type CollapsibleHeaderProps } from './molecules/CollapsibleHeader';

// Organismos
export { TabBar, type TabBarProps, type TabBarItem } from './organisms/TabBar';
export { Header, type HeaderProps, type HeaderAction } from './organisms/Header';
export { SideMenu, type SideMenuProps, type SideMenuItem } from './organisms/SideMenu';
export { ReportCard, type ReportCardProps } from './organisms/ReportCard';
export { ServiceCard, type ServiceCardProps } from './organisms/ServiceCard';
export { OutboxItem, type OutboxItemAction, type OutboxItemProps, type OutboxItemStatus } from './organisms/OutboxItem';
export { ConfirmDialog, DialogFrame, type ConfirmDialogProps } from './organisms/ConfirmDialog';
export { InactivityDialog, type InactivityDialogProps } from './organisms/InactivityDialog';
export { SignaturePad, type SignaturePadProps, type SignatureResult } from './organisms/SignaturePad';
export { EmptyState, type EmptyStateProps } from './organisms/EmptyState';
export { SectionLoader, type SectionLoaderProps } from './organisms/SectionLoader';

// Plantillas
export { Screen, ScreenFooter, type ScreenProps } from './templates/Screen';
