
export type VolumeType = '20ft' | '40ft' | 'Time' | 'Other' | string;

export interface Rate {
    id: string; // Unique ID for loop keys
    volume_type: VolumeType;
    headcount: number; // Base number of workers provided
    rate_per_person: number; // In 10,000 KRW unit (e.g. 8 means 80,000)
    notes?: string;
}

export interface Team {
    id: string;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Client {
    id: string;
    name: string;
    address?: string;
    manager?: string; // Name of the manager or '회사'
    contact_info?: string;
    rates: Rate[];
    commission_type?: 'Percent' | 'PerPerson'; // Default: PerPerson
    commission_rate?: number; // Used if type is Percent
    fee_per_person?: number; // Used if type is PerPerson (e.g., 5000)
    businessRegistrationImages?: string[] | null; // Changed to array of strings (or null) - in DB it's JSON string
    businessOwnerNames?: string[] | null; // Changed to array of strings - in DB it's JSON string
    businessRegistrationNumbers?: string[] | null; // Changed to array of strings - in DB it's JSON string
    taxInvoiceEmail?: string | null;
    payType?: 'INDIVIDUAL' | 'TOTAL'; // Default: INDIVIDUAL
    isTaxFree?: boolean; // Default: false
    teamId: string;
    team?: { name: string }; // For Global View
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Worker {
    id: string;
    name: string;
    phone: string;
    resident_id_front?: string | null; // 6 digits for age/verification
    address?: string | null; // Simple address for pickup
    bank_name?: string | null;
    bank_account?: string | null;
    residentRegistrationNumber?: string | null;
    bankBookImage?: string | null;
    skill_level: string;
    contract_type?: string | null; // 정규 vs 비정기
    notes?: string | null;
    status: string;
    teamId: string;
    team?: { name: string }; // For Global View
    createdAt?: Date;
    updatedAt?: Date;
}

export interface WorkLog {
    id: string;
    date: string; // YYYY-MM-DD
    clientId: string;
    start_time?: string | null; // HH:mm
    worker_ids: string[]; // virtual field for UI

    // Work Details
    volume_type: string;
    quantity: number;
    status: 'Normal' | 'Waiting' | 'Cancelled'; // Status
    waiting_rate?: number | null; // e.g. 0.3 or 0.5 (30% or 50%)
    manualWaitingBillable?: number | null;
    manualWaitingWorkerPay?: number | null;

    // Financials (Snapshot at time of work)
    unit_price: number; // Rate per person (Net Pay)
    total_payment_to_workers: number; // unit_price * workers * quantity (or logic variation)

    billable_amount: number; // Base amount to bill client
    is_billed: boolean;
    is_paid_to_workers: boolean;

    isTaxFree?: boolean; // New
    isPaidFromClient?: boolean; // New

    notes?: string;
    teamId: string;
    team?: { name: string }; // For Global View
}
