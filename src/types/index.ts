export type VehicleStatus = 'available' | 'rented' | 'maintenance';
export type ContractStatus = 'active' | 'finished' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
}

export interface Client {
  id: string;
  created_at: string;
  name: string;
  cpf_cnpj: string;
  rg: string | null;
  birth_date: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  cnh_url: string | null;
  address_proof_url: string | null;
}

export interface Vehicle {
  id: string;
  created_at: string;
  plate: string;
  renavam: string | null;
  model: string;
  year: number | null;
  color: string | null;
  category: string | null;
  status: VehicleStatus;
  daily_rate: number;
  photos_urls: string[] | null;
}

export interface Contract {
  id: string;
  created_at: string;
  client_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_value: number;
  payment_method: string | null;
  deposit: number;
  balance: number;
  status: ContractStatus;
  client?: Client;
  vehicle?: Vehicle;
  metadata?: any;
}

export interface Expense {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  vehicle_id: string | null;
}

export interface SystemSettings {
  id?: string;
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  logo_url: string;
  currency: string;
  daily_rental_start_time: string;
  daily_rental_end_time: string;
  contract_clauses: string[];
}
