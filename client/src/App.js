import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import DocumentList from './components/DocumentList';
import Editor from './components/Editor';
import ShareRedirect from './components/ShareRedirect';
import { getToken, setToken, removeToken } from './utils/auth';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());

  const login = (token) => {
    setToken(token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <Router>
        <Routes>
          <Route path="/register" element={<Auth type="register" />} />
          <Route path="/login" element={<Auth type="login" />} />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <DocumentList />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <PrivateRoute>
                <Editor />
              </PrivateRoute>
            }
          />
          <Route path="/share/:token" element={<ShareRedirect />} />
          <Route path="*" element={<Navigate to="/documents" />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
