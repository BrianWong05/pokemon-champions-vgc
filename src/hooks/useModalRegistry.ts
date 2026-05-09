import { useState, useCallback } from 'react';

export function useModalRegistry<T extends string>(initialModals: Record<T, boolean>) {
  const [modals, setModals] = useState<Record<T, boolean>>(initialModals);

  const openModal = useCallback((modal: T) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: T) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  const toggleModal = useCallback((modal: T) => {
    setModals(prev => ({ ...prev, [modal]: !prev[modal] }));
  }, []);

  const isModalOpen = useCallback((modal: T) => {
    return modals[modal];
  }, [modals]);

  return { modals, openModal, closeModal, toggleModal, isModalOpen };
}
