import React, { useState, useEffect, ChangeEvent } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DescriptionIcon from '@mui/icons-material/Description';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import './theme.css';

import { 
  Vehicle,
  addVehicle,
  updateVehicle,
  subscribeToVehicles,
  deleteAllVehicles,
  syncPendingActions,
  migrateOfflineVehicles,
  deleteVehicle
} from './services/firebase';

import {
  setupConnectivityListeners,
  isOnline
} from './services/offlineStorage';

const ParkingControlApp = () => {
  const [activeTab, setActiveTab] = useState('entrada');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'timestamp'>>({
    placa: '',
    modelo: '',
    cor: '',
    responsavel: '',
    telefone: '',
    observacoes: '',
    entrada: '',
    saida: null,
    status: 'DENTRO'
  });
  const [reportType, setReportType] = useState('hoje');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  // Filtros avançados
  const [reportStatus, setReportStatus] = useState(''); // '' | 'DENTRO' | 'SAIU'
  const [reportModelo, setReportModelo] = useState('');
  const [reportResponsavel, setReportResponsavel] = useState('');
  const [reportTag, setReportTag] = useState('');
  const [reportPlaca, setReportPlaca] = useState('');
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getNextTagNumber = (): string => {
    // Coleta todos os números de TAG existentes
    const existingTags = vehicles
      .map(v => v.telefone) // Usamos o campo telefone para armazenar a TAG
      .filter(tag => /^\d+$/.test(tag)) // Filtra apenas tags que são números
      .map(tag => parseInt(tag, 10)) // Converte para número
      .sort((a, b) => a - b); // Ordena numericamente
    
    // Encontra o próximo número disponível
    let nextNumber = 1;
    for (const tag of existingTags) {
      if (tag === nextNumber) {
        nextNumber++;
      } else if (tag > nextNumber) {
        break; // Encontramos um "buraco" na sequência
      }
    }
    
    // Formata o número com zeros à esquerda (ex: 01, 02, etc.)
    return nextNumber.toString().padStart(2, '0');
  };

  // Save to localStorage whenever vehicles change
  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  // Inscrever-se para atualizações em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToVehicles((updatedVehicles) => {
      setVehicles(updatedVehicles);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Atualiza o formulário quando um veículo é selecionado para edição
  useEffect(() => {
    if (editingVehicle) {
      const vehicle = vehicles.find(v => v.id === editingVehicle);
      if (vehicle) {
        setFormData({
          placa: vehicle.placa,
          modelo: vehicle.modelo,
          cor: vehicle.cor,
          responsavel: vehicle.responsavel,
          telefone: vehicle.telefone,
          observacoes: vehicle.observacoes,
          entrada: vehicle.entrada,
          saida: vehicle.saida,
          status: vehicle.status
        });
      }
    }
  }, [editingVehicle, vehicles]);

  useEffect(() => {
    // Configura listeners de conectividade
    const cleanup = setupConnectivityListeners(
      async () => {
        setIsOffline(false);
        // Tenta sincronizar dados pendentes quando voltar online
        try {
          await syncPendingActions();
          await migrateOfflineVehicles();
        } catch (error) {
          console.error('Erro ao sincronizar dados:', error);
        }
      },
      () => setIsOffline(true)
    );

    // Inscreve-se para atualizações de veículos
    const unsubscribe = subscribeToVehicles(setVehicles);

    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  // Toast timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value.toUpperCase()
    }));
  };
  
  // Função para lidar com a tecla Enter nos campos
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita o comportamento padrão do Enter
      
      // Usa tabIndex para mover para o próximo campo
      const inputs = document.querySelectorAll('input, textarea');
      const currentIndex = Array.from(inputs).indexOf(e.currentTarget);
      
      if (currentIndex < inputs.length - 1) {
        // Se não for o último campo, move para o próximo campo
        (inputs[currentIndex + 1] as HTMLElement).focus();
      } else {
        // Se for o último campo (observações), foca no botão Confirmar Entrada
        const confirmButton = document.querySelector('.confirm-button') as HTMLElement;
        if (confirmButton) {
          confirmButton.focus();
        }
      }
    }
  };

  const handleEntrada = async () => {
    try {
      const newVehicle = {
        ...formData,
        entrada: new Date().toLocaleString('pt-BR'),
      };

      const vehicleId = await addVehicle(newVehicle);

      // Se estiver offline, atualiza o estado local imediatamente
      if (!isOnline()) {
        const offlineVehicle = {
          ...newVehicle,
          id: vehicleId,
          timestamp: new Date()
        };
        setVehicles(prev => [offlineVehicle, ...prev]);
      }

      setFormData({
        placa: '',
        modelo: '',
        cor: '',
        responsavel: '',
        telefone: '',
        observacoes: '',
        entrada: '',
        saida: null,
        status: 'DENTRO'
      });
      setToast({ message: 'Veículo registrado com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      alert('Erro ao registrar entrada do veículo');
      setToast({ message: 'Erro ao registrar entrada do veículo', type: 'error' });
    }
  };

  const handleSaida = async (vehicleId: string | undefined) => {
    if (!vehicleId) return;
    
    try {
      console.log('handleSaida - ID do veículo:', vehicleId);
      
      const saidaData = {
        saida: new Date().toLocaleString('pt-BR'),
        status: 'SAIU' as const
      };

      console.log('Dados de saída:', saidaData);

      await updateVehicle(vehicleId, saidaData);

      // Se estiver offline ou se o veículo foi criado offline, atualiza o estado local imediatamente
      if (!isOnline() || vehicleId.startsWith('offline_')) {
        console.log('Atualizando estado local para saída');
        setVehicles(prev => prev.map(vehicle => 
          vehicle.id === vehicleId 
            ? { ...vehicle, ...saidaData }
            : vehicle
        ));
      }
      
      console.log('Saída registrada com sucesso');
      setToast({ message: 'Saída registrada com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      alert('Erro ao registrar saída do veículo');
      setToast({ message: 'Erro ao registrar saída do veículo', type: 'error' });
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    if (vehicle.id) {
      setEditingVehicle(vehicle.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingVehicle) return;
    
    try {
      console.log('handleSaveEdit - ID do veículo:', editingVehicle);
      
      const updateData = {
        ...formData,
        // Mantém o timestamp original
        timestamp: vehicles.find(v => v.id === editingVehicle)?.timestamp
      };

      console.log('Dados para atualização:', updateData);

      // Atualiza no Firebase
      await updateVehicle(editingVehicle, updateData);

      // Se estiver offline ou se o veículo foi criado offline, atualiza o estado local imediatamente
      if (!isOnline() || editingVehicle.startsWith('offline_')) {
        console.log('Atualizando estado local');
        setVehicles(prev => prev.map(vehicle => 
          vehicle.id === editingVehicle 
            ? { ...vehicle, ...updateData }
            : vehicle
        ));
      }

      // Limpa o formulário e sai do modo de edição
      setFormData({
        placa: '',
        modelo: '',
        cor: '',
        responsavel: '',
        telefone: '',
        observacoes: '',
        entrada: '',
        saida: null,
        status: 'DENTRO'
      });
      setEditingVehicle(null);
      console.log('Edição salva com sucesso');
      setToast({ message: 'Alterações salvas com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      alert('Erro ao salvar as alterações do veículo');
      setToast({ message: 'Erro ao salvar as alterações do veículo', type: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditingVehicle(null);
    // Limpa o formulário ao cancelar
    setFormData({
      placa: '',
      modelo: '',
      cor: '',
      responsavel: '',
      telefone: '',
      observacoes: '',
      entrada: '',
      saida: null,
      status: 'DENTRO'
    });
  };

  // Relatório Functions
  const getReportData = (): Vehicle[] => {
    const today = new Date().toDateString();
    let filtered = vehicles;

    // Filtro por tipo de relatório (já existente)
    switch (reportType) {
      case 'hoje':
        filtered = filtered.filter(v => {
          const entryDate = new Date(v.entrada.split(' ')[0].split('/').reverse().join('-'));
          return entryDate.toDateString() === today;
        });
        break;
      case 'periodo':
        if (!reportStartDate || !reportEndDate) return [];
        const start = new Date(reportStartDate);
        const end = new Date(reportEndDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(v => {
          const entryDate = new Date(v.entrada);
          return entryDate >= start && entryDate <= end;
        });
        break;
      case 'todos':
        // nada
        break;
      case 'dentro':
        filtered = filtered.filter(v => v.status === 'DENTRO');
        break;
      default:
        break;
    }

    // Filtros avançados
    if (reportStatus) filtered = filtered.filter(v => v.status === reportStatus);
    if (reportModelo) filtered = filtered.filter(v => v.modelo && v.modelo.toLowerCase().includes(reportModelo.toLowerCase()));
    if (reportResponsavel) filtered = filtered.filter(v => v.responsavel && v.responsavel.toLowerCase().includes(reportResponsavel.toLowerCase()));
    if (reportTag) filtered = filtered.filter(v => v.telefone && v.telefone.toLowerCase().includes(reportTag.toLowerCase()));
    if (reportPlaca) filtered = filtered.filter(v => v.placa && v.placa.toLowerCase().includes(reportPlaca.toLowerCase()));

    return filtered;
  };

  const calculateDuration = (entrada: string, saida: string | null): string => {
    if (!saida) return 'Em andamento';
    const start = new Date(entrada);
    const end = new Date(saida);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  const generateExcelReport = () => {
    const data = getReportData();
    const headers = ['Placa', 'Modelo', 'Cor', 'Responsável', 'TAG', 'Entrada', 'Saída', 'Duração', 'Status', 'Observações'];
    
    // Cria uma tabela HTML que o Excel pode abrir diretamente
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Relatório de Estacionamento</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;
    
    // Adiciona os dados
    data.forEach(v => {
      htmlContent += `
        <tr>
          <td>${v.placa}</td>
          <td>${v.modelo || ''}</td>
          <td>${v.cor || ''}</td>
          <td>${v.responsavel || ''}</td>
          <td>${v.telefone || ''}</td>
          <td>${v.entrada}</td>
          <td>${v.saida || ''}</td>
          <td>${calculateDuration(v.entrada, v.saida)}</td>
          <td>${v.status}</td>
          <td>${v.observacoes || ''}</td>
        </tr>
      `;
    });
    
    // Fecha a tabela e o HTML
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Cria um Blob com o conteúdo HTML
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_estacionamento_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filterVehicles = (vehicle: Vehicle): boolean => {
    const matchesSearch = 
      vehicle.telefone.includes(searchTerm.toUpperCase()) ||  // TAG é verificada primeiro
      vehicle.placa.includes(searchTerm.toUpperCase()) ||
      vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.responsavel.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'dentro') return vehicle.status === 'DENTRO' && matchesSearch;
    if (activeTab === 'historico') return vehicle.status === 'SAIU' && matchesSearch;
    return matchesSearch;
  };

  const vehiclesDentro = vehicles.filter(v => v.status === 'DENTRO').length;
  const vehiclesSaiu = vehicles.filter(v => v.status === 'SAIU').length;
  
  // Função para calcular o total de veículos de hoje, independente do status
  const getTotalVehiclesToday = (): number => {
    const today = new Date().toDateString();
    return vehicles.filter(vehicle => {
      try {
        // Formato brasileiro: DD/MM/AAAA HH:MM:SS
        const dateParts = vehicle.entrada.split(' ')[0].split('/');
        if (dateParts.length !== 3) return false;
        
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Meses em JS são 0-11
        const year = parseInt(dateParts[2]);
        
        const entryDate = new Date(year, month, day);
        return entryDate.toDateString() === today;
      } catch (e) {
        return false; // Em caso de erro no parsing da data
      }
    }).length;
  };
  
  const totalVehiclesToday = getTotalVehiclesToday();
  const reportData = getReportData();

  return (
    <div className="app-container">
      {/* Toast/Alerta visual */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === 'error' ? '#dc3545' : '#28a745',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            transition: 'opacity 0.3s',
            opacity: toast ? 1 : 0
          }}
        >
          {toast.message}
        </div>
      )}
      <header className="header">
        <div className="logo-container">
          <img src="/images/rincon-logo.png" alt="Rincon Security" className="logo" />
          <h1 className="app-title">Controle de Estacionamento</h1>
        </div>
        <div className="status-indicators">
          <span className="status-inside">Veículos dentro: {vehiclesDentro}</span>
          <span className="status-exit">Veículos que saíram: {vehiclesSaiu}</span>
          <span className="status-left">Total hoje: {totalVehiclesToday}</span>
        </div>
        <div className="connection-status">
          {isOffline ? (
            <div className="offline-indicator">
              <WifiOffIcon />
              <span>Offline</span>
            </div>
          ) : (
            <div className="online-indicator">
              <CloudDoneIcon />
              <span>Online</span>
            </div>
          )}
        </div>
      </header>

      <div className="nav-tabs">
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          borderBottom: '2px solid #d4af37',
          backgroundColor: '#1a1a1a'
        }}>
          <button
            onClick={() => setActiveTab('entrada')}
            className={`nav-tab ${activeTab === 'entrada' ? 'active' : ''}`}
            style={{ border: 'none' }}
          >
            <AddIcon /> Entrada
          </button>
          <button
            onClick={() => setActiveTab('dentro')}
            className={`nav-tab ${activeTab === 'dentro' ? 'active' : ''}`}
            style={{ border: 'none' }}
          >
            <DirectionsCarIcon /> Dentro ({vehiclesDentro})
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`nav-tab ${activeTab === 'historico' ? 'active' : ''}`}
            style={{ border: 'none' }}
          >
            <LogoutIcon /> Histórico
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`nav-tab ${activeTab === 'relatorios' ? 'active' : ''}`}
            style={{ border: 'none' }}
          >
            <DescriptionIcon /> Relatórios
          </button>
        </div>
      </div>

      <div className="content">
        {/* Entrada Tab */}
        {activeTab === 'entrada' && (
              <div className="fade-in">
                <div className="form-container">
                  <h2 className="form-title">Nova Entrada</h2>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Placa do Veículo
                      </label>
                      <input
                        type="text"
                        name="placa"
                        value={formData.placa}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="ABC-1234"
                        className="form-control text-lg font-mono"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        TAG
                      </label>
                      <input
                        type="text"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: 001"
                        className="form-control"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        Modelo do Veículo
                      </label>
                      <input
                        type="text"
                        name="modelo"
                        value={formData.modelo}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: Honda Civic"
                        className="form-control"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        Cor
                      </label>
                      <input
                        type="text"
                        name="cor"
                        value={formData.cor}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: Branco"
                        className="form-control"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        Responsável
                      </label>
                      <input
                        type="text"
                        name="responsavel"
                        value={formData.responsavel}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nome do responsável"
                        className="form-control"
                      />
                    </div>
                    
                    <div className="form-group md:col-span-2">
                      <label className="form-label">
                        Observações
                      </label>
                      <textarea
                        name="observacoes"
                        value={formData.observacoes}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Observações adicionais..."
                        rows={2}
                        className="form-control"
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '2.5rem' }}>
                    <button
                      type="button"
                      onClick={handleEntrada}
                      className="btn confirm-button"
                      style={{ 
                        minWidth: '220px', 
                        padding: '1rem 2rem',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEntrada();
                        }
                      }}
                    >
                      Confirmar Entrada
                    </button>
                  </div>
                </div>
            </div>
        )}

        {/* Relatórios Tab */}
        {activeTab === 'relatorios' && (
          <div className="w-full max-w-800">
            <div className="report-controls">
              <h2 className="form-title">Gerar Relatório</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Tipo de Relatório</label>
                  <div className="report-type-selector">
                    <button 
                      onClick={() => setReportType('hoje')} 
                      className={`report-type-option ${reportType === 'hoje' ? 'active' : ''}`}
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => setReportType('periodo')} 
                      className={`report-type-option ${reportType === 'periodo' ? 'active' : ''}`}
                    >
                      Período Específico
                    </button>
                    <button 
                      onClick={() => setReportType('todos')} 
                      className={`report-type-option ${reportType === 'todos' ? 'active' : ''}`}
                    >
                      Todos os Registros
                    </button>
                    <button 
                      onClick={() => setReportType('dentro')} 
                      className={`report-type-option ${reportType === 'dentro' ? 'active' : ''}`}
                    >
                      Veículos Dentro
                    </button>
                  </div>
                </div>

                {reportType === 'periodo' && (
                  <div className="date-range">
                    <div className="date-picker">
                      <label className="form-label">Data Inicial</label>
                      <input 
                        type="date" 
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="date-picker">
                      <label className="form-label">Data Final</label>
                      <input 
                        type="date" 
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>
                )}

                {/* Filtros avançados */}
                <div className="form-grid mt-4">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={reportStatus} onChange={e => setReportStatus(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="DENTRO">Dentro</option>
                      <option value="SAIU">Saiu</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Modelo</label>
                    <input className="form-control" type="text" value={reportModelo} onChange={e => setReportModelo(e.target.value)} placeholder="Ex: Honda Civic" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Responsável</label>
                    <input className="form-control" type="text" value={reportResponsavel} onChange={e => setReportResponsavel(e.target.value)} placeholder="Nome do responsável" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TAG</label>
                    <input className="form-control" type="text" value={reportTag} onChange={e => setReportTag(e.target.value)} placeholder="Ex: 001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placa</label>
                    <input className="form-control" type="text" value={reportPlaca} onChange={e => setReportPlaca(e.target.value)} placeholder="Ex: ABC-1234" />
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={generateExcelReport}
                    disabled={reportData.length === 0}
                    className="btn"
                  >
                    <GetAppIcon />
                    Baixar Excel/CSV ({reportData.length} registros)
                  </button>
                </div>
              </div>
            </div>

            <div className="form-container mt-4">
              <div className="p-4 border-b border-gray-200">
                <h3 className="form-title">
                  Preview do Relatório - {reportData.length} registros
                </h3>
                {reportType === 'hoje' && <p className="text-sm">Veículos de hoje</p>}
                {reportType === 'periodo' && reportStartDate && reportEndDate && (
                  <p className="text-sm">
                    Período: {new Date(reportStartDate).toLocaleDateString('pt-BR')} até {new Date(reportEndDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {reportType === 'dentro' && <p className="text-sm">Veículos atualmente no estacionamento</p>}
                {reportType === 'todos' && <p className="text-sm">Histórico completo</p>}
              </div>
              
              <div className="p-4">
                {/* Totais e estatísticas do relatório */}
                {reportData.length > 0 && (
                  <div className="report-stats">
                    <div className="report-stat-card"><strong>Total filtrado:</strong> {reportData.length}</div>
                    <div className="report-stat-card"><strong>Dentro:</strong> {reportData.filter(v => v.status === 'DENTRO').length}</div>
                    <div className="report-stat-card"><strong>Saiu:</strong> {reportData.filter(v => v.status === 'SAIU').length}</div>
                    <div className="report-stat-card"><strong>Tempo médio de permanência:</strong> {(() => {
                      const saidos = reportData.filter(v => v.status === 'SAIU' && v.entrada && v.saida);
                      if (saidos.length === 0) return 'N/A';
                      const totalMs = saidos.reduce((acc, v) => {
                        const start = new Date(v.entrada).getTime();
                        const end = v.saida ? new Date(v.saida).getTime() : 0;
                        return acc + (end - start);
                      }, 0);
                      const avgMs = totalMs / saidos.length;
                      const hours = Math.floor(avgMs / (1000 * 60 * 60));
                      const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
                      return `${hours}h ${minutes}min`;
                    })()}</div>
                  </div>
                )}
                {reportData.length === 0 ? (
                  <div className="empty-state">
                    <DescriptionIcon className="empty-state-icon" />
                    Nenhum registro encontrado para os critérios selecionados
                  </div>
                ) : (
                  <div className="vehicle-list max-h-96 overflow-y-auto">
                    {reportData.map((vehicle) => (
                      <div key={vehicle.id} className="vehicle-card">
                        <div className="vehicle-card-header">
                          <div className="flex items-center">
                            <span className="vehicle-plate">
                              {vehicle.placa}
                            </span>
                            <span className={`vehicle-status ${
                              vehicle.status === 'DENTRO' 
                                ? 'status-inside' 
                                : 'status-left'
                            }`}
                              style={vehicle.status === 'SAIU' ? { background: '#dc3545', color: 'white', borderRadius: '16px', padding: '2px 8px', marginLeft: '8px', fontWeight: 'bold' } : { borderRadius: '16px' }}>
                              {vehicle.status}
                            </span>
                          </div>
                          <div className="text-sm">
                            Duração: {calculateDuration(vehicle.entrada, vehicle.saida)}
                          </div>
                        </div>
                        
                        <div className="vehicle-details">
                          {vehicle.modelo && <div><strong>Modelo:</strong> {vehicle.modelo}</div>}
                          {vehicle.cor && <div><strong>Cor:</strong> {vehicle.cor}</div>}
                          {vehicle.responsavel && <div><strong>Responsável:</strong> {vehicle.responsavel}</div>}
                          {vehicle.telefone && <div><strong>TAG:</strong> {vehicle.telefone}</div>}
                          <div><strong>Entrada:</strong> {vehicle.entrada}</div>
                          {vehicle.saida && <div><strong>Saída:</strong> {vehicle.saida}</div>}
                        </div>
                        
                        {vehicle.observacoes && (
                          <div className="mt-2 text-sm">
                            <strong>Obs:</strong> {vehicle.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="form-title mb-4">Ações Avançadas</h3>
              <button
                onClick={async () => {
                  if (window.confirm('Tem certeza que deseja apagar apenas os registros filtrados? Esta ação não pode ser desfeita.')) {
                    try {
                      // Deleta apenas os veículos filtrados
                      for (const v of reportData) {
                        if (v.id) {
                          await deleteVehicle(v.id);
                        }
                      }
                      setVehicles(vehicles.filter(v => !reportData.some(r => r.id === v.id)));
                      setToast({ message: 'Registros filtrados apagados com sucesso!', type: 'success' });
                    } catch (error) {
                      console.error('Erro ao apagar registros filtrados:', error);
                      setToast({ message: 'Erro ao apagar registros filtrados.', type: 'error' });
                    }
                  }
                }}
                className="btn btn-danger mb-4"
                disabled={reportData.length === 0}
              >
                <CloseIcon />
                Apagar Registros Filtrados
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.')) {
                    try {
                      await deleteAllVehicles();
                      setVehicles([]); // Mantemos isso para atualização imediata da UI
                    } catch (error) {
                      console.error('Erro ao apagar histórico:', error);
                      alert('Erro ao apagar o histórico. Por favor, tente novamente.');
                    }
                  }
                }}
                className="btn btn-secondary"
              >
                <CloseIcon />
                Apagar Todo o Histórico
              </button>
            </div>
          </div>
        )}

        {/* Dentro e Histórico Tabs */}
        {(activeTab === 'dentro' || activeTab === 'historico') && (
          <div className="w-full max-w-800">
            {/* Search Bar */}
            <div className="search-container">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por placa, modelo ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Vehicle List */}
            <div className="vehicle-list">
              {vehicles.filter(filterVehicles).length === 0 ? (
                <div className="empty-state">
                  <DirectionsCarIcon className="empty-state-icon" />
                  {activeTab === 'dentro' ? 'Nenhum veículo no estacionamento' : 'Nenhum registro encontrado'}
                </div>
              ) : (
                vehicles
                  .filter(filterVehicles)
                  .map((vehicle: Vehicle, idx: number) => (
                    <div key={vehicle.id} className={`vehicle-card fade-in${idx % 2 === 1 ? ' zebra' : ''}`}>
                      {editingVehicle === vehicle.id ? (
                        // Modo de Edição
                        <div className="form-container edit-form">
                          <h2 className="form-title">Editando Veículo</h2>
                          
                          <div className="form-grid">
                            <div className="form-group">
                              <label className="form-label">
                                Placa do Veículo
                              </label>
                              <input
                                type="text"
                                name="placa"
                                value={formData.placa}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="ABC-1234"
                                className="form-control text-lg font-mono"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label className="form-label">
                                TAG
                              </label>
                              <input
                                type="text"
                                name="telefone"
                                value={formData.telefone}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: 001"
                                className="form-control"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label className="form-label">
                                Modelo do Veículo
                              </label>
                              <input
                                type="text"
                                name="modelo"
                                value={formData.modelo}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: Honda Civic"
                                className="form-control"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label className="form-label">
                                Cor
                              </label>
                              <input
                                type="text"
                                name="cor"
                                value={formData.cor}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: Branco"
                                className="form-control"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label className="form-label">
                                Responsável
                              </label>
                              <input
                                type="text"
                                name="responsavel"
                                value={formData.responsavel}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Nome do responsável"
                                className="form-control"
                              />
                            </div>
                            
                            <div className="form-group md:col-span-2">
                              <label className="form-label">
                                Observações
                              </label>
                              <textarea
                                name="observacoes"
                                value={formData.observacoes}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Observações adicionais..."
                                rows={2}
                                className="form-control"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-center gap-10 mt-10">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="btn save-button"
                              style={{ 
                                minWidth: '220px', 
                                padding: '1rem 2rem',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              Salvar Alterações
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="btn btn-secondary"
                              style={{ 
                                minWidth: '220px', 
                                padding: '1rem 2rem',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="vehicle-card-header">
                                <span className="vehicle-plate">
                                  {vehicle.placa}
                                </span>
                                <span className={`vehicle-status ${
                                  vehicle.status === 'DENTRO' 
                                    ? 'status-inside' 
                                    : 'status-left'
                                }`}
                                  style={vehicle.status === 'SAIU' ? { background: '#dc3545', color: 'white', borderRadius: '16px', padding: '2px 8px', marginLeft: '8px', fontWeight: 'bold' } : { borderRadius: '16px' }}>
                                  {vehicle.status}
                                </span>
                              </div>
                              
                              <div className="vehicle-details">
                                {vehicle.modelo && (
                                  <div><strong>Modelo:</strong> {vehicle.modelo}</div>
                                )}
                                {vehicle.cor && (
                                  <div><strong>Cor:</strong> {vehicle.cor}</div>
                                )}
                                {vehicle.responsavel && (
                                  <div><strong>Responsável:</strong> {vehicle.responsavel}</div>
                                )}
                                {vehicle.telefone && (
                                  <div><strong>TAG:</strong> {vehicle.telefone}</div>
                                )}
                                <div><strong>Entrada:</strong> {vehicle.entrada}</div>
                                {vehicle.saida && (
                                  <div><strong>Saída:</strong> {vehicle.saida}</div>
                                )}
                              </div>
                              
                              {vehicle.observacoes && (
                                <div className="mt-2 text-sm">
                                  <strong>Obs:</strong> {vehicle.observacoes}
                                </div>
                              )}
                            </div>
                            
                            <div className="vehicle-actions">
                              <button
                                onClick={() => handleEdit(vehicle)}
                                className="btn btn-secondary"
                              >
                                <EditIcon />
                                Editar
                              </button>
                              {vehicle.status === 'DENTRO' && (
                                <button
                                  onClick={() => vehicle.id && handleSaida(vehicle.id)}
                                  className="btn btn-danger"
                                >
                                  <LogoutIcon />
                                  Saída
                                </button>
                              )}
                            </div>
                          </div>
                          {activeTab === 'historico' && vehicle.status === 'SAIU' && (
                            <button
                              className="btn mt-2"
                              style={{ fontSize: '0.9rem', padding: '0.3rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '16px' }}
                              onClick={() => {
                                setFormData({
                                  placa: vehicle.placa,
                                  modelo: vehicle.modelo,
                                  cor: vehicle.cor,
                                  responsavel: vehicle.responsavel,
                                  telefone: vehicle.telefone,
                                  observacoes: vehicle.observacoes,
                                  entrada: '',
                                  saida: null,
                                  status: 'DENTRO'
                                });
                                setActiveTab('entrada');
                              }}
                            >
                              Reentrar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingControlApp;
