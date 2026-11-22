import { MultiSplitIndoorOption, MultiSplitOutdoorUnit } from '../types/hvac';

export const MULTI_SPLIT_INDOOR_OPTIONS: MultiSplitIndoorOption[] = [
  { code: '22', kw: 2.2, pingRange: '2–3 坪', pipeSize: '2分 / 3分', wallModelPrefix: '22型壁掛', ductModelPrefix: '22型吊隱' },
  { code: '28', kw: 2.8, pingRange: '3–5 坪', pipeSize: '2分 / 3分', wallModelPrefix: '28型壁掛', ductModelPrefix: '28型吊隱' },
  { code: '36', kw: 3.6, pingRange: '4–6 坪', pipeSize: '2分 / 3分', wallModelPrefix: '36型壁掛', ductModelPrefix: '36型吊隱' },
  { code: '40', kw: 4.1, pingRange: '6–7 坪', pipeSize: '2分 / 3分', wallModelPrefix: '40型壁掛', ductModelPrefix: '40型吊隱' },
  { code: '50', kw: 5.0, pingRange: '7–8 坪', pipeSize: '2分 / 4分', wallModelPrefix: '50型壁掛', ductModelPrefix: '50型吊隱' },
  { code: '63', kw: 6.3, pingRange: '9–10 坪', pipeSize: '2分 / 4分', wallModelPrefix: '63型壁掛', ductModelPrefix: '63型吊隱' },
  { code: '71', kw: 7.1, pingRange: '10–12 坪', pipeSize: '2分 / 5分', wallModelPrefix: '71型壁掛', ductModelPrefix: '71型吊隱' },
  { code: '81', kw: 8.1, pingRange: '12–14 坪', pipeSize: '2分 / 5分', wallModelPrefix: '81型壁掛', ductModelPrefix: '81型吊隱' },
  { code: '90', kw: 9.0, pingRange: '14–16 坪', pipeSize: '2分 / 5分', wallModelPrefix: '90型壁掛', ductModelPrefix: '90型吊隱' },
];

const hitachiUnit = (
  id: string,
  model: string,
  ratedCoolingKw: number,
  series: string,
  combos: Array<{ label: string; combinations: string[] }>
): MultiSplitOutdoorUnit => ({
  id,
  brand: '日立',
  series,
  model,
  ratedCoolingKw,
  ratedHeatingKw: ratedCoolingKw,
  minRooms: 2,
  maxRooms: Math.max(...combos.map((item) => item.label.includes('5') ? 5 : item.label.includes('4') ? 4 : item.label.includes('3') ? 3 : 2)),
  minTotalKw: 0,
  maxTotalKw: 99,
  maxOverloadRatio: 1,
  portSpecs: [],
  maxSinglePipeM: 0,
  maxTotalPipeM: 0,
  maxHeightDiffM: 0,
  dimensions: '',
  powerSupply: '',
  allowedCodes: [],
  presets: combos.map((item) => ({
    label: item.label,
    roomSummary: '',
    indoorCodes: item.combinations,
    note: '',
  })),
});

export const MULTI_SPLIT_OUTDOOR_UNITS: MultiSplitOutdoorUnit[] = [
  hitachiUnit('hit-50np', 'RAM-50NP', 5.0, 'R32 尊榮／頂級系列', [
    { label: '1對2', combinations: ['22+22', '22+36', '28+28'] },
  ]),
  hitachiUnit('hit-63np', 'RAM-63NP', 6.3, 'R32 尊榮／頂級系列', [
    { label: '1對2', combinations: ['22+40', '22+50', '28+36', '36+36'] },
  ]),
  hitachiUnit('hit-71np', 'RAM-71NP', 7.2, 'R32 尊榮／頂級系列', [
    { label: '1對2', combinations: ['22+50', '28+50', '36+40', '36+36', '40+40'] },
  ]),
  hitachiUnit('hit-83np', 'RAM-83NP', 8.5, 'R32 尊榮／頂級系列', [
    { label: '1對2', combinations: ['22+63', '22+71', '28+63', '36+50', '40+40', '40+50'] },
  ]),
  hitachiUnit('hit-86np', 'RAM-86NP', 8.5, 'R32 頂級系列', [
    { label: '1對3', combinations: ['22+22+40', '22+22+50', '22+28+36', '22+28+50', '22+36+36', '22+36+40', '22+40+40', '28+28+36', '28+28+40'] },
  ]),
  hitachiUnit('hit-93np', 'RAM-93NP', 9.0, 'R32 尊榮／頂級系列', [
    { label: '1對2', combinations: ['22+71', '22+81', '28+63', '28+71', '36+63', '40+50', '50+50'] },
    { label: '1對3', combinations: ['22+22+63', '22+36+36', '22+36+50', '22+40+50', '28+28+50', '28+36+36', '28+36+40', '28+40+40', '36+36+40'] },
  ]),
  hitachiUnit('hit-108np', 'RAM-108NP', 10.1, 'R32 尊榮／頂級系列', [
    { label: '1對2', combinations: ['22+90', '28+81', '36+71', '40+71'] },
    { label: '1對3', combinations: ['22+22+71', '22+28+63', '28+36+50', '28+40+50'] },
    { label: '1對4', combinations: ['22+22+28+28', '22+28+28+28'] },
  ]),
  hitachiUnit('hit-130np', 'RAM-130NP', 13.0, 'R32 頂級系列', [
    { label: '1對2', combinations: ['50+50', '63+63', '71+71'] },
    { label: '1對3', combinations: ['22+22+81', '22+28+90', '28+50+63', '28+40+71', '28+28+81', '28+28+71'] },
    { label: '1對4', combinations: ['22+22+36+50', '28+28+40+63', '28+36+36+71'] },
    { label: '1對5', combinations: ['22+22+22+36+63', '22+22+28+28+81'] },
  ]),
  hitachiUnit('hit-160np', 'RAM-160NP', 16.0, 'R32 頂級系列', [
    { label: '1對2', combinations: ['71+81', '71+90', '81+81', '81+90'] },
    { label: '1對3', combinations: ['22+50+81', '36+63+71', '40+71+71', '50+71+71'] },
    { label: '1對4', combinations: ['36+40+40+90', '40+50+50+63', '50+50+50+63'] },
    { label: '1對5', combinations: ['22+28+28+36+90', '36+36+40+50', '36+36+36+71'] },
  ]),
  hitachiUnit('hit-50hp', 'RAM-50HP', 5.0, '冷暖型', [
    { label: '1對2', combinations: ['22+28', '22+36', '28+28'] },
  ]),
  hitachiUnit('hit-50qp', 'RAM-50QP', 5.0, '冷專型', [
    { label: '1對2', combinations: ['22+28', '22+36', '28+28'] },
  ]),
];
