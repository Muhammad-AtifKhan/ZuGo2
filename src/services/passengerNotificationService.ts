import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import firestore from '@react-native-firebase/firestore';

type ReminderScheduleParams = {
  bookingId: string;
  passengerId: string;
  tripId: string;
  from: string;
  to: string;
  departureDate: Date;
  reminderMinutes: number;
  source: 'auto' | 'custom';
};

const CHANNEL_ID = 'zugo-passenger-reminders';

const ensureReminderChannel = async () => {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Trip Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
};

const createReminderMessage = (from: string, to: string, minutes: number): string => {
  return `Your trip ${from} to ${to} starts in ${minutes} minutes. Please get ready for boarding.`;
};

const createReminderTitle = (minutes: number): string => {
  return minutes <= 15 ? 'Trip Starting Soon' : 'Trip Reminder';
};

const toDateTimeWithDeparture = (departureDate: Date, departureTime: string): Date => {
  const [hoursRaw, minutesRaw] = departureTime.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  const dateTime = new Date(departureDate);
  dateTime.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return dateTime;
};

const saveReminderRecord = async (params: ReminderScheduleParams, triggerAt: Date) => {
  await firestore().collection('passenger_notifications').add({
    target: 'passenger',
    passengerId: params.passengerId,
    tripId: params.tripId,
    bookingId: params.bookingId,
    type: 'reminder',
    title: createReminderTitle(params.reminderMinutes),
    message: createReminderMessage(params.from, params.to, params.reminderMinutes),
    reminderMinutes: params.reminderMinutes,
    reminderSource: params.source,
    localScheduled: true,
    read: false,
    scheduledFor: firestore.Timestamp.fromDate(triggerAt),
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const schedulePassengerReminder = async (params: ReminderScheduleParams) => {
  const triggerAt = new Date(params.departureDate.getTime() - params.reminderMinutes * 60 * 1000);
  if (triggerAt.getTime() <= Date.now() + 30 * 1000) {
    return false;
  }

  await ensureReminderChannel();

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerAt.getTime(),
  };

  const reminderId = `${params.bookingId}-${params.reminderMinutes}m-${params.source}`;

  await notifee.createTriggerNotification(
    {
      id: reminderId,
      title: createReminderTitle(params.reminderMinutes),
      body: createReminderMessage(params.from, params.to, params.reminderMinutes),
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
      },
      data: {
        bookingId: params.bookingId,
        tripId: params.tripId,
        reminderMinutes: String(params.reminderMinutes),
        source: params.source,
      },
    },
    trigger
  );

  await saveReminderRecord(params, triggerAt);
  return true;
};

type AutoReminderParams = {
  bookingId: string;
  passengerId: string;
  tripId: string;
  from: string;
  to: string;
  travelDate: Date;
  departureTime: string;
};

export const scheduleAutoPreTripReminders = async (params: AutoReminderParams) => {
  const departureDate = toDateTimeWithDeparture(params.travelDate, params.departureTime);

  await Promise.all([
    schedulePassengerReminder({
      bookingId: params.bookingId,
      passengerId: params.passengerId,
      tripId: params.tripId,
      from: params.from,
      to: params.to,
      departureDate,
      reminderMinutes: 30,
      source: 'auto',
    }),
    schedulePassengerReminder({
      bookingId: params.bookingId,
      passengerId: params.passengerId,
      tripId: params.tripId,
      from: params.from,
      to: params.to,
      departureDate,
      reminderMinutes: 15,
      source: 'auto',
    }),
  ]);
};

export const scheduleCustomTripReminder = async (params: {
  bookingId: string;
  passengerId: string;
  tripId: string;
  from: string;
  to: string;
  travelDate: Date;
  departureTime: string;
  reminderMinutes: number;
}) => {
  const departureDate = toDateTimeWithDeparture(params.travelDate, params.departureTime);
  return schedulePassengerReminder({
    bookingId: params.bookingId,
    passengerId: params.passengerId,
    tripId: params.tripId,
    from: params.from,
    to: params.to,
    departureDate,
    reminderMinutes: params.reminderMinutes,
    source: 'custom',
  });
};
