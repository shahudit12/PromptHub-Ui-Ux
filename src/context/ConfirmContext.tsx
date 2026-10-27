import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ConfirmationModal, type ConfirmationVariant } from '../components/common/ConfirmationModal';

export interface ConfirmOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
}

export type ConfirmFn = {
  (input: string | ConfirmOptions): Promise<boolean>;
  confirm: (input: string | ConfirmOptions) => Promise<boolean>;
};

interface ConfirmContextValue {
  confirm: ConfirmFn;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface ConfirmQueueItem {
  id: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
  isResolved?: boolean;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<ConfirmQueueItem[]>([]);
  const lastActiveOptionsRef = useRef<ConfirmOptions>({ message: '' });
  const queueRef = useRef<ConfirmQueueItem[]>(queue);
  queueRef.current = queue;

  // Safety drain: If provider unmounts while confirmations are pending, resolve them with false to prevent hung promises
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (!item.isResolved) {
          item.isResolved = true;
          try {
            item.resolve(false);
          } catch {}
        }
      });
    };
  }, []);

  const activeItem = queue[0];
  const isOpen = Boolean(activeItem);

  if (activeItem) {
    lastActiveOptionsRef.current = activeItem.options;
  }

  const confirm = useCallback((input: string | ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const options: ConfirmOptions =
        typeof input === 'string'
          ? {
              message: input,
              confirmText: 'Confirm',
              cancelText: 'Cancel',
              variant: 'danger',
            }
          : {
              ...input,
              confirmText: input.confirmText || 'Confirm',
              cancelText: input.cancelText || 'Cancel',
              variant: input.variant || 'primary',
            };

      const newItem: ConfirmQueueItem = {
        id: Math.random().toString(36).substring(2, 9) + Date.now(),
        options,
        resolve,
        isResolved: false,
      };

      setQueue((prev) => [...prev, newItem]);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [current, ...rest] = prev;
      if (!current.isResolved) {
        current.isResolved = true;
        queueMicrotask(() => {
          try {
            current.resolve(true);
          } catch {}
        });
      }
      return rest;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [current, ...rest] = prev;
      if (!current.isResolved) {
        current.isResolved = true;
        queueMicrotask(() => {
          try {
            current.resolve(false);
          } catch {}
        });
      }
      return rest;
    });
  }, []);

  // Callable function with attached .confirm property for flexible destructuring
  const confirmCallable = confirm as ConfirmFn;
  confirmCallable.confirm = confirm;

  const currentOptions = activeItem ? activeItem.options : lastActiveOptionsRef.current;

  return (
    <ConfirmContext.Provider value={{ confirm: confirmCallable }}>
      {children}
      <ConfirmationModal
        isOpen={isOpen}
        itemId={activeItem?.id}
        title={currentOptions.title}
        message={currentOptions.message}
        confirmText={currentOptions.confirmText}
        cancelText={currentOptions.cancelText}
        variant={currentOptions.variant}
        icon={currentOptions.icon}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};
