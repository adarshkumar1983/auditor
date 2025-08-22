import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../utils/auth';
import { useAuth } from '../App';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Only run once on mount

  const fetchDocuments = async () => {
    try {
      const token = getToken();
      const res = await api.get('/api/documents', {
        headers: {
          'x-auth-token': token,
        },
      });
      setDocuments(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to fetch documents');
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      }
    }
  };

  const createDocument = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = getToken();
      const res = await api.post(
        '/api/documents',
        { title: newDocumentTitle },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );
      setDocuments([...documents, res.data]);
      setNewDocumentTitle('');
      navigate(`/documents/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create document');
    }
  };

  const deleteDocument = async (id) => {
    setError('');
    try {
      const token = getToken();
      await api.delete(`/api/documents/${id}`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setDocuments(documents.filter((doc) => doc._id !== id));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete document');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>My Documents</h2>
        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
      </div>
      <form onSubmit={createDocument} style={styles.createForm}>
        <input
          type="text"
          placeholder="New document title"
          value={newDocumentTitle}
          onChange={(e) => setNewDocumentTitle(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.createButton}>Create Document</button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.documentGrid}>
        {documents.map((doc) => (
          <div key={doc._id} style={styles.documentCard}>
            <h3 style={styles.documentTitle} onClick={() => navigate(`/documents/${doc._id}`)}>
              {doc.title}
            </h3>
            <p style={styles.documentOwner}>Owner: {doc.owner?.username || 'Unknown'}</p>
            <p style={styles.documentDate}>Last Updated: {new Date(doc.updatedAt).toLocaleDateString()}</p>
            <button onClick={() => deleteDocument(doc._id)} style={styles.deleteButton}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f2f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  heading: {
    color: '#333',
  },
  logoutButton: {
    padding: '10px 15px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  createForm: {
    display: 'flex',
    marginBottom: '20px',
  },
  input: {
    flexGrow: '1',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginRight: '10px',
    fontSize: '16px',
  },
  createButton: {
    padding: '10px 15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  error: {
    color: 'red',
    marginBottom: '15px',
  },
  documentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  documentCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  documentTitle: {
    color: '#007bff',
    cursor: 'pointer',
    marginBottom: '10px',
    fontSize: '1.2em',
  },
  documentOwner: {
    fontSize: '0.9em',
    color: '#666',
  },
  documentDate: {
    fontSize: '0.8em',
    color: '#888',
    marginBottom: '10px',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '10px',
    alignSelf: 'flex-start',
  },
};

export default DocumentList;