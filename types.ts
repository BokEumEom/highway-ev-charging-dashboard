export interface ChargingSession {
  id: string;
  stationId: string;
  operator: string;
  startTime: Date;
  endTime: Date;
  chargeAmount: number; // in kWh
  location: string; // Rest area name
  highway: string;
  connectorType: 'DC Combo' | 'CHAdeMO' | 'AC Type 2' | 'Unknown';
  lat: number;
  lng: number;
}

export type Page = 'overview' | 'operator-comparison' | 'regional-analysis' | 'time-pattern' | 'competitive-analysis' | 'settings';

export interface FilterState {
    dateRange: { start: Date | null; end: Date | null };
    operators: string[];
    highways: string[];
}

export interface ApiChargerInfo {
    statNm: string;
    statId: string;
    chgerId: string;
    chgerType: string;
    addr: string;
    lat: string;
    lng: string;
    useTime: string;
    busiId: string;
    bnm: string;
    busiNm: string;
    busiCall: string;
    stat: string;
    statUpdDt: string;
    lastTsdt: string; 
    lastTedt: string; 
    nowTsdt: string;
    output: string; 
    method: string;
    zcode: string;
    parkingFree: string;
    kind: string;
    kindDetail: string;
}