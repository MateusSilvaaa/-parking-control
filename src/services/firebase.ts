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
  getDocs
} from 'firebase/firestore';

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
    const vehicleRef = doc(db, 'vehicles', id);
    await updateDoc(vehicleRef, data);
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    throw error;
  }
};

// Observar veículos em tempo real
export const subscribeToVehicles = (callback: (vehicles: Vehicle[]) => void) => {
  const q = query(vehiclesRef, orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const vehicles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Vehicle[];
    callback(vehicles);
  });
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