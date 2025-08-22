const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { generateContent } = require('../services/geminiService');

// Helper function to debounce
const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

// @route   POST api/ai/grammar-check
// @desc    Check grammar and style using AI
// @access  Private
router.post('/grammar-check', auth, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ msg: 'Text is required' });
    }
    try {
        const prompt = `Check the grammar and style of the following text and provide corrections and suggestions:

"""
${text}
"""
`;
        const result = await generateContent(prompt);
        res.json({ suggestion: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/ai/enhance
// @desc    Enhance writing quality using AI
// @access  Private
router.post('/enhance', auth, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ msg: 'Text is required' });
    }
    try {
        const prompt = `Enhance the following text for clarity, tone, and readability. Provide the improved version:

"""
${text}
"""
`;
        const result = await generateContent(prompt);
        res.json({ suggestion: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/ai/summarize
// @desc    Summarize selected text or entire documents using AI
// @access  Private
router.post('/summarize', auth, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ msg: 'Text is required' });
    }
    try {
        const prompt = `Summarize the following text concisely:

"""
${text}
"""
`;
        const result = await generateContent(prompt);
        res.json({ summary: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/ai/complete
// @desc    Context-aware text completion suggestions using AI
// @access  Private
router.post('/complete', auth, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ msg: 'Text is required' });
    }
    try {
        const prompt = `Given the following text, provide a context-aware auto-completion suggestion for the next few words or a sentence:

"""
${text}
"""
`;
        const result = await generateContent(prompt);
        res.json({ completion: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/ai/suggestions
// @desc    AI-powered content recommendations
// @access  Private
router.post('/suggestions', auth, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ msg: 'Text is required' });
    }
    try {
        const prompt = `Based on the following text, provide creative content recommendations or ideas to expand on the topic:

"""
${text}
"""
`;
        const result = await generateContent(prompt);
        res.json({ suggestions: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/ai/realtime-suggestions
// @desc    Provide real-time AI writing suggestions as user types
// @access  Private
router.post('/realtime-suggestions', auth, async (req, res) => {
    const { text } = req.body;
    if (!text || text.trim().length < 10) { // Require minimum text length for suggestions
        return res.json({ suggestion: '' }); // Return empty if not enough text
    }
    try {
        const prompt = `Provide a concise, context-aware writing suggestion or auto-completion for the following text. Focus on improving flow or suggesting the next logical phrase:

"""
${text}
"""
`;
        const result = await generateContent(prompt);
        res.json({ suggestion: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;