const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const User = require('../models/User');
const crypto = require('crypto');
const xss = require('xss');

// @route   GET api/documents
// @desc    Get all documents for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [
                { owner: req.user.id },
                { 'sharedWith.user': req.user.id }
            ]
        }).populate('owner', 'username').populate('sharedWith.user', 'username');
        res.json(documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/documents
// @desc    Create a new document
// @access  Private
router.post('/', auth, async (req, res) => {
    const { title } = req.body;
    try {
        const newDocument = new Document({
            title: xss(title) || 'Untitled Document',
            owner: req.user.id,
        });

        const document = await newDocument.save();
        res.json(document);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/documents/:id
// @desc    Get a specific document by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('owner', 'username')
            .populate('sharedWith.user', 'username');

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // Check if user is owner or has access
        const isOwner = document.owner._id.toString() === req.user.id;
        const hasAccess = document.sharedWith.some(share => share.user._id.toString() === req.user.id);

        if (!isOwner && !hasAccess) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        res.json(document);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/documents/:id
// @desc    Update a document
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { title, content } = req.body;
    try {
        let document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // Check if user is owner or editor
        const isOwner = document.owner.toString() === req.user.id;
        const isEditor = document.sharedWith.some(share =>
            share.user.toString() === req.user.id && share.role === 'editor'
        );

        if (!isOwner && !isEditor) {
            return res.status(403).json({ msg: 'Access denied: Not owner or editor' });
        }

        if (title) document.title = xss(title);
        if (content) document.content = content; // Quill Delta content is complex, XSS handled by Quill/frontend
        document.updatedAt = Date.now();

        await document.save();
        res.json(document);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // Check if user is owner
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: Not owner' });
        }

        await document.deleteOne();
        res.json({ msg: 'Document removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/documents/:id/share
// @desc    Share a document with another user
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
    const { email, role } = req.body;
    try {
        let document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // Only owner can share
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: Only owner can share' });
        }

        const userToShareWith = await User.findOne({ email: xss(email) });
        if (!userToShareWith) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Prevent sharing with self
        if (userToShareWith.id === req.user.id) {
            return res.status(400).json({ msg: 'Cannot share document with yourself' });
        }

        // Check if already shared with this user
        const alreadyShared = document.sharedWith.some(share =>
            share.user.toString() === userToShareWith.id
        );

        if (alreadyShared) {
            // Update existing share role
            document.sharedWith = document.sharedWith.map(share =>
                share.user.toString() === userToShareWith.id ? { user: userToShareWith.id, role } : share
            );
        } else {
            document.sharedWith.push({ user: userToShareWith.id, role });
        }

        await document.save();
        res.json(document);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/documents/:id/generate-share-link
// @desc    Generate a shareable link for a document
// @access  Private (Owner only)
router.post('/:id/generate-share-link', auth, async (req, res) => {
    try {
        let document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // Only owner can generate share link
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: Only owner can generate share link' });
        }

        // Generate a unique token
        const shareToken = crypto.randomBytes(16).toString('hex');

        document.shareToken = shareToken;
        await document.save();

        // Construct the shareable URL (frontend URL)
        const shareLink = `${process.env.CLIENT_URL}/share/${shareToken}`;

        res.json({ shareLink });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/documents/share/:token
// @desc    Get document ID by share token
// @access  Public
router.get('/share/:token', async (req, res) => {
    try {
        const document = await Document.findOne({ shareToken: req.params.token });

        if (!document) {
            return res.status(404).json({ msg: 'Invalid or expired share link' });
        }

        // Return document ID and title for frontend redirection
        res.json({ documentId: document._id, title: document.title });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
