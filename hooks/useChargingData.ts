import { useState, useEffect } from 'react';
import type { ChargingSession, ApiChargerInfo } from '../types';
import { HIGHWAYS } from '../constants';

const API_ENDPOINT = 'https://apis.data.go.kr/B552584/EvCharger/getChargerInfo';

// Helper to parse YYYYMMDDHHMMSS into a Date object
const parseApiDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length !== 14) return null;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const hour = parseInt(dateStr.substring(8, 10), 10);
    const minute = parseInt(dateStr.substring(10, 12), 10);
    const second = parseInt(dateStr.substring(12, 14), 10);
    const date = new Date(year, month, day, hour, minute, second);
    return isNaN(date.getTime()) ? null : date;
};

// Helper to map charger type codes to our types
const mapConnectorType = (typeCode: string): ChargingSession['connectorType'] => {
    switch (typeCode) {
        case '04':
        case '05':
        case '06':
        case '08': // This is slow DC, but let's keep it for now
        case '10':
            return 'DC Combo';
        case '01':
        case '03':
            return 'CHAdeMO';
        case '02':
        case '07':
            return 'AC Type 2';
        default:
            return 'Unknown';
    }
};

// Helper to infer highway from address
const inferHighway = (address: string): string => {
    if (!address) return '기타';
    for (const highway of HIGHWAYS) {
        if (address.includes(highway) || address.includes(highway.replace('고속도로', ''))) {
            return highway;
        }
    }
    return '기타';
};

const transformData = (apiItems: ApiChargerInfo[]): ChargingSession[] => {
    if (!Array.isArray(apiItems)) return [];
    
    const sessions: ChargingSession[] = [];
    apiItems.forEach(item => {
        // Include all chargers, not just fast chargers
        const outputKw = parseFloat(item.output) || 50; // Default to 50kW if not specified
        
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        if (isNaN(lat) || isNaN(lng)) {
            return; // Skip only if coordinates are completely invalid
        }

        // Create mock session data since API might not have actual session data
        const now = new Date();
        const startTime = parseApiDate(item.lastTsdt) || new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last week
        const endTime = parseApiDate(item.lastTedt) || new Date(startTime.getTime() + Math.random() * 2 * 60 * 60 * 1000); // 1-2 hours later
        
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        const chargeAmount = Math.max(5, outputKw * Math.min(durationHours, 2)); // At least 5kWh, max 2 hours

        sessions.push({
            id: `${item.statId}-${item.chgerId}`,
            stationId: item.statId,
            operator: item.busiNm || item.bnm || '알 수 없음',
            startTime,
            endTime,
            chargeAmount,
            location: item.statNm || '휴게소',
            highway: inferHighway(item.addr),
            connectorType: mapConnectorType(item.chgerType),
            lat,
            lng,
        });
    });
    return sessions;
};

export const useChargingData = (apiKey: string | null) => {
    const [data, setData] = useState<ChargingSession[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!apiKey) {
                setData([]);
                setError('API 인증키가 설정되지 않았습니다. 설정 페이지에서 키를 입력해주세요.');
                return;
            }
            
            setLoading(true);
            setError(null);
            setTotalCount(0);

            try {
                const url = new URL(API_ENDPOINT);
                // The serviceKey from data.go.kr often needs to be decoded if copied from URL
                url.searchParams.append('serviceKey', decodeURIComponent(apiKey));
                url.searchParams.append('pageNo', '1');
                url.searchParams.append('numOfRows', '9999'); 
                url.searchParams.append('dataType', 'JSON');
                // Filter for highway rest areas ('고속도로 휴게소')
                url.searchParams.append('kindDetail', 'C001');
                
                const response = await fetch(url.toString());

                if (!response.ok) {
                    throw new Error(`API 요청 실패: Status ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.resultCode !== '00' && result.resultMsg) {
                    if (result.resultMsg.includes('SERVICE KEY IS NOT REGISTERED')) {
                       throw new Error('API 인증키가 유효하지 않습니다. 키를 확인해주세요.');
                    }
                    throw new Error(`API 오류: ${result.resultMsg}`);
                }

                setTotalCount(result.totalCount || 0);
                const transformed = transformData(result.items?.item);
                setData(transformed);
                setLastUpdated(new Date());

                if (result.totalCount > 0 && transformed.length === 0) {
                     setError("데이터를 불러왔지만 처리 가능한 충전소 정보가 없습니다. API 응답을 확인해주세요.");
                }
                
                console.log('API Response:', result);
                console.log('Transformed sessions:', transformed.length);
                
            } catch (e: any) {
                setError(e.message || '데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.');
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        // 초기 데이터 로드
        fetchData();
        
        // 5분(300,000ms)마다 자동 업데이트
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        
        // 컴포넌트 언마운트 시 인터벌 정리
        return () => clearInterval(interval);
    }, [apiKey]);

    return { data, loading, error, totalCount, lastUpdated };
};