import { useAuthModal } from './use-auth-modal';

type ActionType = 'like' | 'comment' | 'share' | 'general';

export function useJoinDialog() {
  const { openModal } = useAuthModal();

  const openDialog = (_type: ActionType = 'general') => {
    openModal('login');
  };

  const closeDialog = () => {};

  return {
    isOpen: false,
    actionType: 'general' as ActionType,
    openDialog,
    closeDialog,
  };
}
