/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendAnnouncementNotification =
functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(async (snapshot, context) => {

    const announcement = snapshot.data();

    // Sab active drivers ka token fetch karo
    const driversSnapshot = await admin
      .firestore()
      .collection("drivers")
      .where("role", "==", "driver")
      .where("status", "==", "active")
      .get();

    const tokens = [];

    driversSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log("No tokens found for active drivers.");
      return null;
    }

    const message = {
      notification: {
        title: "New Announcement",
        body: announcement.message,
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log("Notifications sent:", response.successCount);
    } catch (error) {
      console.error("Error sending notifications:", error);
    }

    return null;
  });
