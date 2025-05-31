import { Vehicle } from './firebase';

const STORAGE_KEY = 'offline_vehicles';
const PENDING_ACTIONS_KEY = 'pending_actions';

interface PendingAction {
  type: 'add' | 'update' | 'delete';
  data: Vehicle;
  timestamp: number;
}

// Salva veículos no localStorage
export const saveVehiclesLocally = (vehicles: Vehicle[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  } catch (error) {
    console.error('Erro ao salvar veículos localmente:', error);
  }
};

// Carrega veículos do localStorage
export const loadVehiclesLocally = (): Vehicle[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar veículos localmente:', error);
    return [];
  }
};

// Adiciona uma ação pendente para sincronização
export const addPendingAction = (action: PendingAction) => {
  try {
    const pendingActions = getPendingActions();
    pendingActions.push(action);
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
  } catch (error) {
    console.error('Erro ao adicionar ação pendente:', error);
  }
};

// Obtém ações pendentes
export const getPendingActions = (): PendingAction[] => {
  try {
    const data = localStorage.getItem(PENDING_ACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao obter ações pendentes:', error);
    return [];
  }
};

// Limpa ações pendentes
export const clearPendingActions = () => {
  try {
    localStorage.removeItem(PENDING_ACTIONS_KEY);
  } catch (error) {
    console.error('Erro ao limpar ações pendentes:', error);
  }
};

// Verifica se há conexão com a internet
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Adiciona listeners para eventos de online/offline
export const setupConnectivityListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}; 