
export const OPERATORS = ['WaterLabs', '환경부', '한전', '시그넷', 'EV infra', 'ChargeV', 'Tesla'];
export const HIGHWAYS = [
    '경부고속도로',
    '서해안고속도로',
    '호남고속도로',
    '영동고속도로',
    '중부고속도로',
    '남해고속도로',
];

export const REST_AREAS: { [key: string]: string[] } = {
    '경부고속도로': ['안성휴게소', '천안삼거리휴게소', '죽전휴게소', '금강휴게소', '칠곡휴게소'],
    '서해안고속도로': ['화성휴게소', '행담도휴게소', '서산휴게소', '고창고인돌휴게소'],
    '호남고속도로': ['정읍휴게소', '백양사휴게소', '곡성휴게소', '주암휴게소'],
    '영동고속도로': ['덕평자연휴게소', '여주휴게소', '횡성휴게소', '강릉대관령휴게소'],
    '중부고속도로': ['이천휴게소', '음성휴게소', '오창휴게소', '산청휴게소'],
    '남해고속도로': ['함안휴게소', '진영휴게소', '섬진강휴게소', '보성녹차휴게소'],
};

export const CONNECTOR_TYPES: ('DC Combo' | 'CHAdeMO' | 'AC Type 2')[] = ['DC Combo', 'CHAdeMO', 'AC Type 2'];

export const ESTIMATED_PRICE_PER_KWH = 300; // 원 (고속도로 급속충전 평균가)
