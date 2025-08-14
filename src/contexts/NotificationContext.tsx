import React, { createContext, useContext, useState, ReactNode } from 'react';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface Notification {
  key: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface NotificationContextValue {
  notifications: Record<string, Notification>;
  setNotification: (key: string, type: NotificationType, message: string, metadata?: Record<string, any>) => void;
  getNotification: (key: string) => Notification | undefined;
  hasNotification: (key: string) => boolean;
  clearNotification: (key: string) => void;
  getNotificationsByType: (type: NotificationType) => Notification[];
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, Notification>>({});

  const setNotification = (
    key: string,
    type: NotificationType,
    message: string,
    metadata?: Record<string, any>
  ) => {
    setNotifications(prev => ({
      ...prev,
      [key]: {
        key,
        type,
        message,
        timestamp: Date.now(),
        metadata,
      },
    }));
  };

  const getNotification = (key: string): Notification | undefined => {
    return notifications[key];
  };

  const hasNotification = (key: string): boolean => {
    return key in notifications;
  };

  const clearNotification = (key: string) => {
    setNotifications(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  };

  const getNotificationsByType = (type: NotificationType): Notification[] => {
    return Object.values(notifications).filter(notification => notification.type === type);
  };

  const clearAll = () => {
    setNotifications({});
  };

  const value: NotificationContextValue = {
    notifications,
    setNotification,
    getNotification,
    hasNotification,
    clearNotification,
    getNotificationsByType,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
