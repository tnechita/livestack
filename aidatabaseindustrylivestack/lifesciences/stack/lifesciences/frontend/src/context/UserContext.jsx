import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setApiUser } from '../utils/api';

const UserContext = createContext(null);

const ROLE_META = {
  admin:           { label: 'Admin',           color: '#C74634', desc: 'Full access to all data' },
  analyst:         { label: 'Analyst',          color: '#437C94', desc: 'Read all, write forecasts' },
  fulfillment_mgr: { label: 'Logistics Mgr', color: '#4C825C', desc: 'Regional inventory & cold-chain shipping' },
  supply_planner:    { label: 'Supply Planner', color: '#AA643B', desc: 'Products & regulatory signals' },
  viewer:          { label: 'Viewer',           color: '#7A736E', desc: 'Read-only access' },
};

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch users on mount
  useEffect(() => {
    api.users.list()
      .then(async data => {
        setUsers(data);
        // Default to admin for full access on first load
        const admin = data.find(u => u.ROLE === 'admin') || data[0];
        if (admin) {
          await api.users.startSession(admin.USERNAME);
          setCurrentUser(admin);
          setApiUser(admin.USERNAME);
        }
      })
      .catch(err => {
        console.warn('Failed to load demo users:', err);
        // Fallback so app still works
        const fallback = { USERNAME: 'admin_jess', FULL_NAME: 'Jessica Chen', ROLE: 'admin', REGION: null };
        api.users.startSession(fallback.USERNAME)
          .then(() => {
            setCurrentUser(fallback);
            setApiUser(fallback.USERNAME);
          })
          .catch(sessionErr => console.warn('Failed to start demo session:', sessionErr));
      })
      .finally(() => setLoading(false));
  }, []);

  const switchUser = useCallback(async (username) => {
    const user = users.find(u => u.USERNAME === username);
    if (user) {
      await api.users.startSession(user.USERNAME);
      setCurrentUser(user);
      setApiUser(user.USERNAME);
    }
  }, [users]);

  return (
    <UserContext.Provider value={{ currentUser, users, switchUser, loading, ROLE_META }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be inside UserProvider');
  return ctx;
}

export { ROLE_META };
