const Document = require('../models/Document');

module.exports = (io) => {
    const usersInDocument = {}; // { documentId: { userId: username, ... }, ... }

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('join-document', async (documentId, userId, username) => {
            socket.join(documentId);
            console.log(`User ${username} (${userId}) joined document ${documentId}`);

            // Add user to presence list
            if (!usersInDocument[documentId]) {
                usersInDocument[documentId] = {};
            }
            usersInDocument[documentId][userId] = username;

            // Emit current document content
            try {
                const document = await Document.findById(documentId);
                if (document) {
                    socket.emit('load-document', document.content);
                } else {
                    socket.emit('document-not-found');
                }
            } catch (error) {
                console.error('Error loading document:', error);
                socket.emit('document-error', 'Error loading document');
            }

            // Notify others in the room that a user joined and send updated user list
            io.to(documentId).emit('user-joined', userId, username);
            io.to(documentId).emit('active-users', Object.values(usersInDocument[documentId]));
        });

        socket.on('send-changes', (documentId, delta) => {
            socket.to(documentId).emit('receive-changes', delta);
        });

        socket.on('save-document', async (documentId, content) => {
            try {
                const document = await Document.findById(documentId);
                if (document) {
                    document.content = content;
                    document.updatedAt = Date.now();
                    await document.save();
                    io.to(documentId).emit('document-saved');
                    console.log(`Document ${documentId} saved.`);
                }
            } catch (error) {
                console.error('Error saving document:', error);
                io.to(documentId).emit('document-save-error', 'Error saving document');
            }
        });

        socket.on('cursor-activity', (documentId, userId, selection) => {
            // Broadcast cursor activity to others in the room
            socket.to(documentId).emit('cursor-activity', userId, selection);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            // Find which document(s) the user was in and remove them from presence list
            for (const documentId in usersInDocument) {
                for (const userId in usersInDocument[documentId]) {
                    if (io.sockets.sockets.get(socket.id) === undefined) { // Check if socket is truly disconnected
                        delete usersInDocument[documentId][userId];
                        io.to(documentId).emit('user-left', userId);
                        io.to(documentId).emit('active-users', Object.values(usersInDocument[documentId]));
                        break; // User found and removed from this document
                    }
                }
            }
        });
    });
};