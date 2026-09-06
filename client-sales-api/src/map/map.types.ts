import type { Temperature } from '../clients/dto/create-client.dto.js';

export interface MapClientPin {
  id: string;
  companyName: string;
  lat: number;
  lng: number;
  address: string | null;
  temperature: Temperature;
  salesStage: { id: string; name: string; isClosed: boolean };
  office: { id: string; name: string } | null;
}

export interface RawMapClientRow {
  id: string;
  company_name: string;
  lat: number;
  lng: number;
  address: string | null;
  temperature: Temperature;
  sales_stage: { id: string; name: string; is_closed: boolean };
  office: { id: string; name: string } | null;
}

export function mapMapClientRow(row: RawMapClientRow): MapClientPin {
  return {
    id: row.id,
    companyName: row.company_name,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    temperature: row.temperature,
    salesStage: { id: row.sales_stage.id, name: row.sales_stage.name, isClosed: row.sales_stage.is_closed },
    office: row.office ? { id: row.office.id, name: row.office.name } : null,
  };
}
