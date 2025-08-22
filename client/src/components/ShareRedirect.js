import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ShareRedirect = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocumentId = async () => {
      try {
        const res = await api.get(`/api/documents/share/${token}`);
        const { documentId } = res.data;
        navigate(`/documents/${documentId}`);
      } catch (err) {
        setError(err.response?.data?.msg || 'Invalid share link or document not found.');
        console.error(err);
      }
    };

    if (token) {
      fetchDocumentId();
    } else {
      setError('No share token provided.');
    }
  }, [token, navigate]);

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return <div style={{ padding: '20px' }}>Loading document...</div>;
};

export default ShareRedirect;
