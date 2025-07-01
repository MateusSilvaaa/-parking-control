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
  deleteDoc,
  getDoc
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
    console.log('=== ADD VEHICLE DEBUG ===');
    console.log('Dados recebidos:', vehicleData);
    console.log('Online status:', isOnline());
    
    if (!isOnline()) {
      console.log('Offline - salvando localmente');
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
      
      console.log('Veículo adicionado offline:', offlineVehicle.id);
      return offlineVehicle.id;
    }

    console.log('Online - tentando adicionar ao Firebase...');
    const docRef = await addDoc(vehiclesRef, {
      ...vehicleData,
      timestamp: Timestamp.now()
    });
    
    console.log('Veículo adicionado ao Firebase:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('=== ERRO NO ADD VEHICLE ===');
    console.error('Erro completo:', error);
    console.error('Tipo do erro:', typeof error);
    console.error('Mensagem do erro:', (error as Error).message);
    
    // Se for erro de permissão, salva offline
    if ((error as any).code === 'permission-denied') {
      console.log('Erro de permissão - salvando offline');
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
      
      console.log('Veículo salvo offline devido a erro de permissão:', offlineVehicle.id);
      return offlineVehicle.id;
    }
    
    throw error;
  }
};

// Verificar se um veículo existe no Firebase
export const checkVehicleExists = async (id: string): Promise<boolean> => {
  try {
    if (!isOnline()) return false;
    
    const vehicleRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(vehicleRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Erro ao verificar existência do veículo:', error);
    return false;
  }
};

// Atualizar veículo
export const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
  try {
    console.log('=== UPDATE VEHICLE DEBUG ===');
    console.log('ID recebido:', id);
    console.log('Tipo do ID:', typeof id);
    console.log('Dados recebidos:', data);
    console.log('Online status:', isOnline());
    
    // Validação do ID
    if (!id || typeof id !== 'string') {
      throw new Error(`ID inválido: ${id}`);
    }
    
    if (!isOnline()) {
      console.log('Offline - salvando localmente');
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
        console.log('Veículo atualizado localmente com sucesso');
      } else {
        console.error('Veículo não encontrado no localStorage:', id);
        throw new Error('Veículo não encontrado localmente');
      }
      return;
    }

    // Se o ID começa com 'offline_', não pode atualizar no Firebase
    if (id.startsWith('offline_')) {
      console.log('Veículo criado offline - salvando apenas localmente');
      const vehicles = loadVehiclesLocally();
      const index = vehicles.findIndex(v => v.id === id);
      
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...data };
        saveVehiclesLocally(vehicles);
        console.log('Veículo offline atualizado localmente');
      } else {
        console.error('Veículo offline não encontrado:', id);
        throw new Error('Veículo offline não encontrado');
      }
      return;
    }

    console.log('Online - verificando se veículo existe no Firebase...');
    const exists = await checkVehicleExists(id);
    
    if (!exists) {
      console.log('Veículo não existe no Firebase - salvando localmente');
      const vehicles = loadVehiclesLocally();
      const index = vehicles.findIndex(v => v.id === id);
      
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...data };
        saveVehiclesLocally(vehicles);
        console.log('Veículo atualizado localmente (não existe no Firebase)');
      } else {
        throw new Error('Veículo não encontrado localmente nem no Firebase');
      }
      return;
    }

    console.log('Veículo existe no Firebase - atualizando...');
    const vehicleRef = doc(db, 'vehicles', id);
    await updateDoc(vehicleRef, data);
    console.log('Veículo atualizado com sucesso no Firebase');
    
  } catch (error) {
    console.error('=== ERRO NO UPDATE VEHICLE ===');
    console.error('ID que causou erro:', id);
    console.error('Dados que causaram erro:', data);
    console.error('Erro completo:', error);
    console.error('Tipo do erro:', typeof error);
    console.error('Mensagem do erro:', (error as Error).message);
    
    // Se for erro de permissão do Firebase
    if ((error as any).code === 'permission-denied') {
      throw new Error('Sem permissão para atualizar este veículo no Firebase');
    }
    
    // Se for erro de documento não encontrado
    if ((error as any).code === 'not-found') {
      throw new Error('Veículo não encontrado no Firebase');
    }
    
    // Se for erro de rede
    if ((error as any).code === 'unavailable') {
      throw new Error('Erro de conexão com o Firebase');
    }
    
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

// Migrar veículos criados offline para o Firebase
export const migrateOfflineVehicles = async () => {
  if (!isOnline()) return;

  try {
    console.log('Tentando migrar veículos offline...');
    const vehicles = loadVehiclesLocally();
    const offlineVehicles = vehicles.filter(v => v.id && v.id.startsWith('offline_'));
    
    if (offlineVehicles.length === 0) {
      console.log('Nenhum veículo offline para migrar');
      return;
    }

    console.log(`Migrando ${offlineVehicles.length} veículos offline...`);
    
    for (const offlineVehicle of offlineVehicles) {
      try {
        const { id, ...vehicleData } = offlineVehicle;
        
        // Adiciona ao Firebase
        const docRef = await addDoc(vehiclesRef, {
          ...vehicleData,
          timestamp: Timestamp.now()
        });
        
        console.log(`Veículo migrado: ${id} -> ${docRef.id}`);
        
        // Remove do localStorage
        const updatedVehicles = vehicles.filter(v => v.id !== id);
        saveVehiclesLocally(updatedVehicles);
        
      } catch (error) {
        console.error('Erro ao migrar veículo offline:', error);
      }
    }
    
    console.log('Migração de veículos offline concluída');
  } catch (error) {
    console.error('Erro na migração de veículos offline:', error);
  }
}; 