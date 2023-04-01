const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.firebaseConfig());

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
exports.updateProfileData = functions.database.ref("/users/{user}")
    .onUpdate((snapshot, context) => {
        functions.logger.log("Updating profile", context.params.user);

        if (snapshot.after.hasChild("homeWorld")) {
            functions.logger.log("homeWorld",
                snapshot.after.child("homeWorld"));
            return null;
        } else {
            const original = snapshot.after.val();
            original.homeWorld = "/worlds/" + original.user.sub;
            const ref = admin.database().ref("/worlds");
            ref.child(original.user.sub)
                .update({owner: original.user.sub});
            return snapshot.after.ref.set(original);
        }
    });
exports.updatePublicDirectory = functions.database.ref("/worlds/{world}/public")
    .onWrite((snapshot, context) => {
        functions.logger.log("updating public directory");
        if (snapshot.after.exists() && snapshot.after.val() == true) {
            admin.database()
                .ref("/directory/" + context.params.world + "/public")
                .set(true);
        } else {
            admin.database()
                .ref("/directory/" + context.params.world)
                .remove();
        }
        return snapshot.after.ref;
    });
exports.updateNames = functions.database
    .ref("/worlds/{world}/name")
    .onUpdate((snapshot, context) => {
        const name = snapshot.after.val();
        const worldId = context.params.world;
        functions.logger.log("New Name", name);
        admin.database()
            .ref("/dir/world_users/" + worldId)
            .once("value", (snap) => {
                functions.logger.log("reading users", snap.numChildren());
                snap.forEach((data) => {
                    functions.logger.log(worldId);
                    functions.logger.log(data);
                    functions.logger.log("fetching User");
                    admin.database().ref("/users/" + data.key +
                        "/directory/worlds/" +
                        worldId + "/name").set(name);
                });
            });
        return snapshot.after.ref;
    });
exports.updateCollaborators = functions.database
    .ref("/worlds/{world}/collaborators/{user}")
    .onWrite((snapshot, context) => {
        functions.logger.log("Updating collaborator", context.params.world);
        functions.logger.log("Updating collaborator", context.params.user);
        if (snapshot.after.exists() && snapshot.after.val() == true) {
            addCollaborator(context.params.user, context.params.world);
        } else {
            removeCollaborator(context.params.user, context.params.world);
        }
        return snapshot.after.ref;
    });


/** remove a collaborator
 * @param {string} collab
 * @param {string} worldId */
function removeCollaborator(collab, worldId) {
    admin.database().ref("/users/" + collab +
        "/directory/worlds/" +
        worldId).remove();
    admin.database().ref("/dir/user_worlds/" + collab + "/" +
        worldId).remove();
    admin.database().ref("/dir/world_users/" + worldId + "/" +
        collab).remove();
    functions
        .logger
        .warn("collaborator removed", worldId);
}

/** add a collaborator
 * @param {string} collab
 * @param {string} worldId */
function addCollaborator(collab, worldId) {
    admin.database().ref("/users/" + collab +
        "/directory/worlds/" +
        worldId).set("write");
    admin.database().ref("/dir/user_worlds/" + collab + "/" +
        worldId).set(true);
    admin.database().ref("/dir/world_users/" + worldId + "/" +
        collab).set(true);
}
