import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { getToken } from '../utils/auth';
import AIAssistant from './AIAssistant';

const TOOLBAR_OPTIONS = [
  [{'header': [1, 2, 3, false]}],
  [{'list': 'ordered'}, {'list': 'bullet'}],
  ['bold', 'italic', 'underline'],
  ['link', 'image'],
  [{'align': []}],
  ['clean']
];

const Editor = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const quillRef = useRef(null); // Ref to ReactQuill component
  const [quill, setQuill] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('Loading...');
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [realtimeSuggestion, setRealtimeSuggestion] = useState('');
  const realtimeSuggestionTimeoutRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const s = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5001');
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Get Quill instance once ReactQuill component is mounted
  useEffect(() => {
    if (quillRef.current) {
      const editorInstance = quillRef.current.getEditor();
      setQuill(editorInstance);
      editorInstance.disable(); // Disable initially
      editorInstance.setText('Loading...');
    }
  }, [quillRef.current]);

  // Fetch current user details
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }
        const res = await api.get('/api/auth/me', {
          headers: {
            'x-auth-token': token,
          },
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.error('Failed to fetch current user:', err);
        navigate('/login');
      }
    };
    fetchCurrentUser();
  }, [navigate]);

  // Load document content and permissions
  useEffect(() => {
    if (socket == null || quill == null || currentUser == null) return;

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    api.get(`/api/documents/${documentId}`, {
      headers: {
        'x-auth-token': token,
      },
    })
    .then(res => {
      const doc = res.data;
      setDocumentTitle(doc.title);
      quill.setContents(doc.content);

      const ownerId = doc.owner._id;
      const isDocOwner = ownerId === currentUser._id;
      const isEditor = doc.sharedWith.some(share => share.user._id === currentUser._id && share.role === 'editor');

      setIsOwner(isDocOwner);
      setCanEdit(isDocOwner || isEditor);

      if (isDocOwner || isEditor) {
        quill.enable(); // Enable editing for owners/editors
      } else {
        quill.disable(); // Keep disabled for viewers
      }

      socket.emit('join-document', documentId, currentUser._id, currentUser.username);
    })
    .catch(err => {
      setError(err.response?.data?.msg || 'Failed to load document');
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
    });

  }, [socket, quill, documentId, navigate, currentUser]);

  // Handle text changes and real-time AI suggestions
  useEffect(() => {
    if (socket == null || quill == null || !canEdit) return;

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', documentId, delta);

      // Real-time AI suggestions (debounced)
      clearTimeout(realtimeSuggestionTimeoutRef.current);
      realtimeSuggestionTimeoutRef.current = setTimeout(async () => {
        const currentText = quill.getText();
        if (currentText.trim().length > 10) { // Only request if enough text
          try {
            const token = getToken();
            const res = await api.post(
              `/api/ai/realtime-suggestions`,
              { text: currentText },
              {
                headers: {
                  'x-auth-token': token,
                },
              }
            );
            setRealtimeSuggestion(res.data.suggestion);
          } catch (err) {
            console.error('Error fetching real-time AI suggestion:', err);
            setRealtimeSuggestion('');
          }
        } else {
          setRealtimeSuggestion('');
        }
      }, 1000); // Debounce for 1 second
    };
    quill.on('text-change', textChangeHandler);

    return () => {
      quill.off('text-change', textChangeHandler);
      clearTimeout(realtimeSuggestionTimeoutRef.current);
    };
  }, [socket, quill, documentId, canEdit]);

  // Receive changes from other users
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta) => {
      quill.updateContents(delta);
    };
    socket.on('receive-changes', handler);

    return () => {
      socket.off('receive-changes', handler);
    };
  }, [socket, quill]);

  // Handle cursor activity
  useEffect(() => {
    if (socket == null || quill == null || currentUser == null) return;

    const handler = (range, source) => {
      if (source === 'user') {
        socket.emit('cursor-activity', documentId, currentUser._id, range);
      }
    };
    quill.on('selection-change', handler);

    const receiveCursorHandler = (userId, selection) => {
      if (userId !== currentUser._id) {
        // Highlight other user's selection
        const editor = quill.getEditor();
        const currentSelection = editor.getSelection(); // Save current user's selection

        editor.setSelection(selection.index, selection.length, 'silent'); // Apply other user's selection
        // You might want to add a custom format/blot to visually distinguish
        // other users' cursors/selections (e.g., different background color)
        // For now, it will just move the cursor/selection.

        // Restore current user's selection after a short delay or on next user input
        // This is a simplified approach and might not be ideal for complex scenarios.
        setTimeout(() => {
          if (currentSelection) {
            editor.setSelection(currentSelection.index, currentSelection.length, 'silent');
          }
        }, 100);
      }
    };
    socket.on('cursor-activity', receiveCursorHandler);

    return () => {
      quill.off('selection-change', handler);
      socket.off('cursor-activity', receiveCursorHandler);
    };
  }, [socket, quill, documentId, currentUser]);

  // Handle user presence
  useEffect(() => {
    if (socket == null) return;

    const userJoinedHandler = (userId, username) => {
      console.log(`User ${username} (${userId}) joined.`);
    };

    const userLeftHandler = (userId) => {
      console.log(`User ${userId} left.`);
    };

    const activeUsersHandler = (users) => {
      setActiveUsers(users);
    };

    socket.on('user-joined', userJoinedHandler);
    socket.on('user-left', userLeftHandler);
    socket.on('active-users', activeUsersHandler);

    return () => {
      socket.off('user-joined', userJoinedHandler);
      socket.off('user-left', userLeftHandler);
      socket.off('active-users', activeUsersHandler);
    };
  }, [socket]);

  // Auto-save functionality
  useEffect(() => {
    if (socket == null || quill == null || !canEdit) return;

    const interval = setInterval(() => {
      socket.emit('save-document', documentId, quill.getContents());
    }, 30000); // Auto-save every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill, documentId, canEdit]);

  const handleManualSave = () => {
    if (socket && quill && canEdit) {
      socket.emit('save-document', documentId, quill.getContents());
      alert('Document saved!');
    }
  };

  const handleShare = async () => {
    try {
      const token = getToken();
      await api.post(`/api/documents/${documentId}/share`, { email: shareEmail, role: shareRole }, {
        headers: {
          'x-auth-token': token,
        },
      });
      alert(`Document shared with ${shareEmail} as ${shareRole}.`);
      setShowShareModal(false);
      setShareEmail('');
      setShareRole('viewer');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to share document');
      console.error(err);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const token = getToken();
      const res = await api.post(`/api/documents/${documentId}/generate-share-link`, {}, {
        headers: {
          'x-auth-token': token,
        },
      });
      setGeneratedShareLink(res.data.shareLink);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to generate share link');
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{documentTitle}</h1>
        {canEdit && (
          <button onClick={handleManualSave} style={styles.saveButton}>
            Save Document
          </button>
        )}
        {isOwner && (
          <>
            <button onClick={() => setShowShareModal(true)} style={styles.shareButton}>
              Share Document
            </button>
            <button onClick={handleGenerateShareLink} style={styles.shareButton}>
              Generate Share Link
            </button>
          </>
        )}
        <button onClick={() => navigate('/documents')} style={styles.backButton}>Back to Documents</button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.activeUsersContainer}>
        Active Users: {activeUsers.join(', ')}
      </div>
      {generatedShareLink && (
        <div style={styles.shareLinkDisplay}>
          Share Link: <a href={generatedShareLink} target="_blank" rel="noopener noreferrer">{generatedShareLink}</a>
        </div>
      )}
      {realtimeSuggestion && (
        <div style={styles.realtimeSuggestionContainer}>
          AI Suggestion: {realtimeSuggestion}
        </div>
      )}
      <div style={styles.editorContainer}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          modules={{ toolbar: TOOLBAR_OPTIONS }}
          readOnly={!canEdit} // Set readOnly based on canEdit
          style={styles.quillEditor}
        />
      </div>
      {isOwner && (
        <div style={styles.aiAssistantContainer}>
          <AIAssistant quill={quill} />
        </div>
      )}

      {showShareModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>Share Document</h2>
            <input
              type="email"
              placeholder="User Email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              style={styles.input}
            />
            <select value={shareRole} onChange={(e) => setShareRole(e.target.value)} style={styles.select}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <div style={styles.modalActions}>
              <button onClick={handleShare} style={styles.modalButtonPrimary}>Share</button>
              <button onClick={() => setShowShareModal(false)} style={styles.modalButtonSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f2f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  title: {
    margin: 0,
    color: '#333',
  },
  saveButton: {
    padding: '8px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '10px',
  },
  shareButton: {
    padding: '8px 15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '10px',
  },
  backButton: {
    padding: '8px 15px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '10px',
  },
  error: {
    color: 'red',
    padding: '10px 20px',
  },
  activeUsersContainer: {
    padding: '10px 20px',
    backgroundColor: '#e9ecef',
    borderBottom: '1px solid #ddd',
    fontSize: '0.9em',
    color: '#555',
  },
  shareLinkDisplay: {
    padding: '10px 20px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    margin: '10px 20px',
    wordBreak: 'break-all',
  },
  realtimeSuggestionContainer: {
    padding: '10px 20px',
    backgroundColor: '#e0f7fa',
    color: '#006064',
    border: '1px solid #b2ebf2',
    borderRadius: '4px',
    margin: '10px 20px',
    wordBreak: 'break-all',
  },
  editorContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
  },
  quillEditor: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minHeight: 'calc(100vh - 200px)',
    display: 'flex',
    flexDirection: 'column',
  },
  aiAssistantContainer: {
    padding: '20px',
    backgroundColor: '#e9ecef',
    borderTop: '1px solid #ddd',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '350px',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    backgroundColor: '#fff',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  modalButtonPrimary: {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  modalButtonSecondary: {
    padding: '10px 15px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default Editor;