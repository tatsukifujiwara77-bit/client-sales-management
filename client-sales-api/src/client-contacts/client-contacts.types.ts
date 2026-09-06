export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  isKeyPerson: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawClientContactRow {
  id: string;
  client_id: string;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  is_key_person: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapClientContactRow(row: RawClientContactRow): ClientContact {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    position: row.position,
    department: row.department,
    phone: row.phone,
    email: row.email,
    isKeyPerson: row.is_key_person,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
