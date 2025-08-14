import React from 'react';
import { QueryEditor } from './QueryEditor';
import { NotificationProvider } from '../../contexts/NotificationContext';

export const QueryEditorWithNotifications = (props: any) => (
  <NotificationProvider>
    <QueryEditor {...props} />
  </NotificationProvider>
);
