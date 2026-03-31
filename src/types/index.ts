export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'in_sale';
export type ContractStatus = 'active' | 'finished' | 'cancelled';
export type SaleContractStatus = 'active' | 'paid' | 'overdue' | 'cancelled';

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
  sale_price?: number | null;
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

// ── Rental-to-Sale Module ───────────────────────────────────────────────────

export interface SaleContract {
  id: string;
  created_at: string;
  client_id: string;
  vehicle_id: string;
  sale_price: number;
  down_payment: number;
  installments: number;          // 1–36
  installment_value: number;
  due_day: number;               // day-of-month for monthly invoices
  status: SaleContractStatus;
  notes: string | null;
  client?: Client;
  vehicle?: Vehicle;
  installment_records?: SaleInstallment[];
}

export interface SaleInstallment {
  id: string;
  created_at: string;
  sale_contract_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_at: string | null;
  paid_amount: number | null;
  receipt_sent: boolean;
  whatsapp_sent: boolean;
  status: 'pending' | 'paid' | 'overdue';
  notes: string | null;
}
