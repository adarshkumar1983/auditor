import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const Auth = ({ type }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = type === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        type === 'register'
          ? { username, email, password } // register needs all 3
          : { email, password };          // login usually needs only email + password

      const res = await api.post(url, payload);

      // save token in your auth context
      login(res.data.token);

      // redirect after success
      navigate('/documents');
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{type === 'register' ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        {type === 'register' && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={styles.input}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          {type === 'register' ? 'Register' : 'Login'}
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
      <p style={styles.switchText}>
        {type === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
        <span
          onClick={() => navigate(type === 'register' ? '/login' : '/register')}
          style={styles.switchLink}
        >
          {type === 'register' ? 'Login' : 'Register'}
        </span>
      </p>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: 'Arial, sans-serif',
  },
  heading: {
    marginBottom: '20px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    padding: '30px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    width: '300px',
  },
  input: {
    marginBottom: '15px',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
  },
  button: {
    padding: '12px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  buttonHover: {
    backgroundColor: '#0056b3',
  },
  error: {
    color: 'red',
    marginTop: '10px',
  },
  switchText: {
    marginTop: '20px',
    color: '#555',
  },
  switchLink: {
    color: '#007bff',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default Auth;