import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  Timestamp,
  getDocs,
  deleteDoc
} from 'firebase/firestore';

import {
  saveVehiclesLocally,
  loadVehiclesLocally,
  addPendingAction,
  getPendingActions,
  clearPendingActions,
  isOnline
} from './offlineStorage';

// Interface para o veículo
export interface Vehicle {
  id?: string;
  placa: string;
  modelo: string;
  cor: string;
  responsavel: string;
  telefone: string;
  observacoes: string;
  entrada: string;
  saida: string | null;
  status: 'DENTRO' | 'SAIU';
  timestamp: any;
}

// Referência da coleção
const vehiclesRef = collection(db, 'vehicles');

// Adicionar novo veículo
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'timestamp'>) => {
  try {
    if (!isOnline()) {
      const offlineVehicle = {
        ...vehicleData,
        id: `offline_${Date.now()}`,
        timestamp: Timestamp.now()
      };
      
      const vehicles = loadVehiclesLocally();
      vehicles.push(offlineVehicle);
      saveVehiclesLocally(vehicles);
      
      addPendingAction({
        type: 'add',
        data: offlineVehicle,
        timestamp: Date.now()
      });
      
      return offlineVehicle.id;
    }

    const docRef = await addDoc(vehiclesRef, {
      ...vehicleData,
      timestamp: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar veículo:', error);
    throw error;
  }
};

// Atualizar veículo
export const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
  try {
    if (!isOnline()) {
      const vehicles = loadVehiclesLocally();
      const index = vehicles.findIndex(v => v.id === id);
      
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...data };
        saveVehiclesLocally(vehicles);
        
        addPendingAction({
          type: 'update',
          data: vehicles[index],
          timestamp: Date.now()
        });
      }
      return;
    }

    const vehicleRef = doc(db, 'vehicles', id);
    await updateDoc(vehicleRef, data);
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    throw error;
  }
};

// Observar veículos em tempo real com suporte offline
export const subscribeToVehicles = (callback: (vehicles: Vehicle[]) => void) => {
  // Se estiver online, inscreve-se para atualizações em tempo real
  if (isOnline()) {
    const q = query(vehiclesRef, orderBy('timestamp', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const vehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vehicle[];
      
      // Salva os dados mais recentes localmente
      saveVehiclesLocally(vehicles);
      callback(vehicles);
    }, (error) => {
      console.error('Erro no onSnapshot:', error);
      // Em caso de erro, carrega dados do localStorage
      const offlineVehicles = loadVehiclesLocally();
      callback(offlineVehicles);
    });
  }
  
  // Se estiver offline, carrega dados do localStorage
  const offlineVehicles = loadVehiclesLocally();
  callback(offlineVehicles);
  
  // Retorna uma função vazia para cleanup
  return () => {};
};

// Buscar veículos por data
export const getVehiclesByDate = async (startDate: Date, endDate: Date) => {
  try {
    const q = query(
      vehiclesRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Vehicle[];
  } catch (error) {
    console.error('Erro ao buscar veículos por data:', error);
    throw error;
  }
};

// Deletar todos os veículos
export const deleteAllVehicles = async () => {
  try {
    const snapshot = await getDocs(vehiclesRef);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Erro ao deletar todos os veículos:', error);
    throw error;
  }
};

// Sincronizar dados pendentes quando voltar online
export const syncPendingActions = async () => {
  if (!isOnline()) return;

  const pendingActions = getPendingActions();
  
  for (const action of pendingActions) {
    try {
      switch (action.type) {
        case 'add':
          const { id, ...vehicleData } = action.data;
          await addDoc(vehiclesRef, {
            ...vehicleData,
            timestamp: Timestamp.now()
          });
          break;
          
        case 'update':
          if (action.data.id && !action.data.id.startsWith('offline_')) {
            const vehicleRef = doc(db, 'vehicles', action.data.id);
            const { id, ...updateData } = action.data;
            await updateDoc(vehicleRef, updateData);
          }
          break;
      }
    } catch (error) {
      console.error('Erro ao sincronizar ação:', error);
    }
  }
  
  clearPendingActions();
}; 