import type { Temperature } from '../clients/dto/create-client.dto.js';
import type { ClientIndustryItem, RawClientIndustryEmbed } from '../clients/types/client.types.js';

export interface MapClientPin {
  id: string;
  companyName: string;
  lat: number;
  lng: number;
  address: string | null;
  buildingName: string | null;
  prefecture: string | null;
  /** 業種（複数可）。主業種が先頭に来るとは限らないため、表示側でisPrimaryを見て並べ替える */
  industries: ClientIndustryItem[];
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
  building_name: string | null;
  prefecture: string | null;
  temperature: Temperature;
  sales_stage: { id: string; name: string; is_closed: boolean };
  office: { id: string; name: string } | null;
  industries: RawClientIndustryEmbed[] | null;
}

function mapIndustries(raw: RawClientIndustryEmbed[] | null): ClientIndustryItem[] {
  if (!raw) return [];
  return raw
    .filter((i): i is RawClientIndustryEmbed & { industry: NonNullable<RawClientIndustryEmbed['industry']> } =>
      Boolean(i.industry),
    )
    .map((i) => ({ id: i.industry.id, name: i.industry.name, isPrimary: i.is_primary }));
}

export function mapMapClientRow(row: RawMapClientRow): MapClientPin {
  return {
    id: row.id,
    companyName: row.company_name,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    buildingName: row.building_name,
    prefecture: row.prefecture,
    industries: mapIndustries(row.industries),
    temperature: row.temperature,
    salesStage: { id: row.sales_stage.id, name: row.sales_stage.name, isClosed: row.sales_stage.is_closed },
    office: row.office ? { id: row.office.id, name: row.office.name } : null,
  };
}
