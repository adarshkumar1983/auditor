import React, { useState } from 'react';
import api from '../services/api';
import { getToken } from '../utils/auth';

const AIAssistant = ({ quill }) => {
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getSelectedText = () => {
    if (quill) {
      const selection = quill.getSelection();
      if (selection) {
        return quill.getText(selection.index, selection.length);
      }
    }
    return '';
  };

  const callAI = async (endpoint) => {
    const text = getSelectedText();
    if (!text) {
      setError('Please select some text in the editor first.');
      setAiResponse('');
      return;
    }

    setLoading(true);
    setError('');
    setAiResponse('');

    try {
      const token = getToken();
      const res = await api.post(
                `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5001'}/api/ai/${endpoint}`,
        { text },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );
      setAiResponse(res.data.suggestion || res.data.summary || res.data.completion || res.data.suggestions);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to get AI response.');
      setAiResponse('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>AI Assistant</h3>
      <div style={styles.buttonGroup}>
        <button onClick={() => callAI('grammar-check')} style={styles.button} disabled={loading}>Grammar & Style</button>
        <button onClick={() => callAI('enhance')} style={styles.button} disabled={loading}>Enhance Writing</button>
        <button onClick={() => callAI('summarize')} style={styles.button} disabled={loading}>Summarize</button>
        <button onClick={() => callAI('complete')} style={styles.button} disabled={loading}>Auto-complete</button>
        <button onClick={() => callAI('suggestions')} style={styles.button} disabled={loading}>Content Suggestions</button>
      </div>
      {loading && <p style={styles.loading}>Loading AI response...</p>}
      {error && <p style={styles.error}>{error}</p>}
      {aiResponse && (
        <div style={styles.responseBox}>
          <h4>AI Response:</h4>
          <p>{aiResponse}</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    marginBottom: '20px',
  },
  heading: {
    marginTop: '0',
    marginBottom: '15px',
    color: '#333',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '15px',
  },
  button: {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
  },
  buttonHover: {
    backgroundColor: '#0056b3',
  },
  loading: {
    color: '#007bff',
    fontStyle: 'italic',
  },
  error: {
    color: 'red',
    marginBottom: '10px',
  },
  responseBox: {
    backgroundColor: '#e9ecef',
    padding: '15px',
    borderRadius: '5px',
    border: '1px solid #ced4da',
    marginTop: '15px',
  },
};

export default AIAssistant;
