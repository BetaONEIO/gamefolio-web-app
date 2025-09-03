import { useState } from 'react';

type ActionType = 'like' | 'comment' | 'share' | 'general';

export function useJoinDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('general');

  const openDialog = (type: ActionType = 'general') => {
    setActionType(type);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    actionType,
    openDialog,
    closeDialog,
  };
}