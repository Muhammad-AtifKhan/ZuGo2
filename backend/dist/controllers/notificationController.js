"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = exports.clearNotifications = exports.markAllAsRead = exports.markAsRead = exports.createNotification = void 0;
const firebase_1 = require("../config/firebase");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// Create a new notification
const createNotification = async (req, res) => {
    try {
        const data = req.body;
        if (Array.isArray(data)) {
            const batch = firebase_1.db.batch();
            const results = [];
            for (const item of data) {
                const docRef = firebase_1.db.collection('notifications').doc();
                batch.set(docRef, {
                    ...item,
                    createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                results.push(docRef.id);
            }
            await batch.commit();
            return res.status(201).json({ success: true, ids: results });
        }
        // Single item
        const notificationData = {
            ...data,
            createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
            read: false
        };
        const docRef = await firebase_1.db.collection('notifications').add(notificationData);
        res.status(201).json({ id: docRef.id, ...notificationData });
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createNotification = createNotification;
const markAsRead = async (req, res) => {
    try {
        const id = req.params.id;
        await firebase_1.db.collection('notifications').doc(id).update({
            read: true,
            readAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids))
            return res.status(400).json({ error: 'Invalid payload' });
        const batch = firebase_1.db.batch();
        for (const id of ids) {
            batch.update(firebase_1.db.collection('notifications').doc(id), {
                read: true,
                readAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.markAllAsRead = markAllAsRead;
const clearNotifications = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids))
            return res.status(400).json({ error: 'Invalid payload' });
        const batch = firebase_1.db.batch();
        for (const id of ids) {
            batch.delete(firebase_1.db.collection('notifications').doc(id));
        }
        await batch.commit();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.clearNotifications = clearNotifications;
const getNotifications = async (req, res) => {
    try {
        const { userId, target, tripId } = req.query;
        // Allow fetching either by userId or by tripId
        if (!userId && !tripId)
            return res.status(400).json({ error: 'Missing userId or tripId' });
        let query = firebase_1.db.collection('notifications');
        if (tripId) {
            query = query.where('actionId', '==', String(tripId));
        }
        else if (target === 'driver') {
            query = query.where('driverId', '==', String(userId)).where('target', '==', 'driver');
        }
        else if (target === 'transporter') {
            query = query.where('transporterId', '==', String(userId)).where('target', '==', 'transporter');
        }
        else {
            query = query.where('userId', '==', String(userId));
        }
        const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
        const notifications = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            });
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getNotifications = getNotifications;
