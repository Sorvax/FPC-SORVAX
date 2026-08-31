import React, { createContext, useContext, useReducer, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const AppContext = createContext();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getInitialState() {
  return {
    cases: [],
    notifications: [
      { id: 1, type: 'action', message: '1 action requires approval', caseId: 'CASE-0241', read: false }
    ],
    tamperDetected: false,
    tamperedCaseId: null,
    evidenceItems: [],
    evidenceDetailItem: null,
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        )
      };
    case 'ADD_NOTIFICATION': {
      const exists = state.notifications.find(n => n.id === action.payload.id);
      if (exists) return state;
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    }
    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        )
      };
    case 'SET_TAMPER':
      return {
        ...state,
        tamperDetected: action.payload.detected,
        tamperedCaseId: action.payload.caseId
      };
    case 'SET_EVIDENCE_DETAIL':
      return {
        ...state,
        evidenceDetailItem: action.payload
      };
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'RESET_STATE':
      return getInitialState();
    case 'SET_CASES':
      return {
        ...state,
        cases: action.payload
      };
    case 'ADD_EVIDENCE':
      return {
        ...state,
        evidenceItems: [...state.evidenceItems, action.payload]
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, getInitialState());
  const [toasts, setToasts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data from backend
  const loadData = useCallback(async () => {
    try {
      const [cases, evidence] = await Promise.all([
        api.getCases(),
        api.getAllEvidence(),
      ]);
      dispatch({ type: 'SET_STATE', payload: { cases, evidenceItems: evidence, dataLoaded: true } });
      setDataLoaded(true);
    } catch (err) {
      console.error('Failed to load data from backend:', err);
      showToast('Failed to connect to backend server', 'error');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateCase = (id, updates) => {
    dispatch({ type: 'UPDATE_CASE', payload: { id, updates } });
    // Also persist to backend
    api.updateCase(id, updates).catch(err => {
      console.error('Failed to update case on backend:', err);
    });
  };

  const addNotification = (notification) => dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  const clearNotification = (id) => dispatch({ type: 'CLEAR_NOTIFICATION', payload: id });
  const setTamper = (detected, caseId) => dispatch({ type: 'SET_TAMPER', payload: { detected, caseId } });
  const resetState = async () => {
    dispatch({ type: 'RESET_STATE' });
    // Re-fetch fresh data from backend
    try {
      const [cases, evidence] = await Promise.all([
        api.getCases(),
        api.getAllEvidence(),
      ]);
      dispatch({ type: 'SET_STATE', payload: { cases, evidenceItems: evidence } });
    } catch (err) {
      console.error('Failed to reload data:', err);
    }
  };
  const setCases = (cases) => dispatch({ type: 'SET_CASES', payload: cases });
  const setEvidenceDetail = (item) => dispatch({ type: 'SET_EVIDENCE_DETAIL', payload: item });

  const addCase = (newCase) => {
    dispatch({ type: 'SET_CASES', payload: [...state.cases, newCase] });
  };

  const addEvidence = (evidence) => {
    dispatch({ type: 'ADD_EVIDENCE', payload: evidence });
    showToast(`Evidence ${evidence.id} registered. Fingerprint generated.`, 'success');
  };

  const addEvidenceToCase = (caseId, evidence) => {
    dispatch({ type: 'ADD_EVIDENCE', payload: evidence });
    // Also add to case's evidenceItems list
    const currentCases = state.cases;
    const caseData = currentCases.find(c => c.id === caseId);
    if (caseData) {
      const updatedEvidenceItems = [...(caseData.evidenceItems || []), evidence.id];
      dispatch({
        type: 'UPDATE_CASE',
        payload: {
          id: caseId,
          updates: { evidenceItems: updatedEvidenceItems }
        }
      });
    }
    showToast(`Evidence ${evidence.id} registered. Fingerprint generated and integrity verified.`, 'success');
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppContext.Provider value={{
      ...state,
      toasts,
      dataLoaded,
      loadData,
      updateCase,
      addCase,
      addNotification,
      clearNotification,
      setTamper,
      resetState,
      setCases,
      addEvidence,
      addEvidenceToCase,
      setEvidenceDetail,
      showToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
