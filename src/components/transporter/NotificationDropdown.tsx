// src/components/transporter/NotificationDropdown.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { Notification } from '../../types/transporter.types';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onNotificationPress: (notification: Notification) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  getTimeAgo: (date: Date) => string;
}

export const NotificationDropdown = ({
  visible,
  onClose,
  notifications,
  unreadCount,
  onNotificationPress,
  onDismiss,
  onMarkAllRead,
  onViewAll,
  getTimeAgo,
}: NotificationDropdownProps) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.dropdown, SHADOWS.large]}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={onMarkAllRead}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const notifTime = notification.time?.toDate
                  ? notification.time.toDate()
                  : new Date(notification.time);

                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.item,
                      !notification.read && styles.unreadItem,
                    ]}
                    onPress={() => onNotificationPress(notification)}
                  >
                    <View style={styles.content}>
                      <Text style={styles.itemTitle}>{notification.title}</Text>
                      <Text style={styles.itemMessage}>{notification.message}</Text>
                      <Text style={styles.itemTime}>{getTimeAgo(notifTime)}</Text>
                    </View>
                    {!notification.read && <View style={styles.unreadDot} />}
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={() => onDismiss(notification.id)}
                    >
                      <Text style={styles.dismissText}>×</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No new notifications</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>View All Notifications →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdown: {
    width: 320,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    marginTop: 70,
    marginRight: SIZES.md,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  markAllText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  unreadItem: {
    backgroundColor: COLORS.infoLight,
  },
  content: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  itemMessage: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 11,
    color: COLORS.textLighter,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 4,
  },
  dismissText: {
    fontSize: 20,
    color: COLORS.textLighter,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: SIZES.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textLighter,
    fontSize: 14,
  },
  viewAllButton: {
    padding: SIZES.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewAllText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
});