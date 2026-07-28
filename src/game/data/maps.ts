import type { MapId } from './types';

export interface MapConfig {
  id: MapId;
  name: string;
  description: string;
  color: number;
}

export const maps: Record<MapId, MapConfig> = {
  meadow: {
    id: 'meadow',
    name: '초원 평지',
    description: '넓은 평지와 보이지 않는 벽. 순수한 정면 승부.',
    color: 0x62c985,
  },
  void: {
    id: 'void',
    name: '공허의 발판',
    description: '발판 아래로 추락하면 피해 15 후 중앙에서 부활.',
    color: 0x9a6bff,
  },
};
