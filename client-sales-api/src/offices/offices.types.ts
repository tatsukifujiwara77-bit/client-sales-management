export interface Office {
  id: string;
  name: string;
  prefecture: string | null;
  address: string | null;
}

export interface RawOfficeRow {
  id: string;
  name: string;
  prefecture: string | null;
  address: string | null;
}

export function mapOfficeRow(row: RawOfficeRow): Office {
  return {
    id: row.id,
    name: row.name,
    prefecture: row.prefecture,
    address: row.address,
  };
}
