import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ParkingControlApp from './App';

// Mock do Firebase
jest.mock('./services/firebase', () => ({
  subscribeToVehicles: jest.fn((callback) => {
    callback([]);
    return () => {};
  }),
  addVehicle: jest.fn(),
  updateVehicle: jest.fn(),
}));

describe('ParkingControlApp', () => {
  test('renders parking control app', () => {
    render(<ParkingControlApp />);
    const titleElement = screen.getByText(/Controle de Estacionamento/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('should show form inputs', () => {
    render(<ParkingControlApp />);
    expect(screen.getByPlaceholderText(/ABC-1234/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Honda Civic/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Branco/i)).toBeInTheDocument();
  });
});
