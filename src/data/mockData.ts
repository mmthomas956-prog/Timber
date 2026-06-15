import { AppState } from '../types';

export const initialAppState: AppState = {
  logs: [],
  sawnTimber: [],
  frames: [],
  sales: [],
  totalWastageCFT: 0,
  auditLogs: [],
  sizeIntelligence: [
    {
      sizeName: '3x4',
      dimensionsMm: '75x100',
      marketUseCase: 'Premium structural door frames',
      durabilityClass: 'Class 1 - Highly Resistant',
      workingDifficulty: 'Medium - High density, requires carbide blades',
      treatmentSpecs: 'Standard oil-based finish'
    },
    {
      sizeName: '4x3',
      dimensionsMm: '100x75',
      marketUseCase: 'Exterior decking',
      durabilityClass: 'Class 1 - Highly Resistant',
      workingDifficulty: 'High - requires carbide blades',
      treatmentSpecs: 'Heavy chemical pressure treatment'
    },
    {
      sizeName: '2x4',
      dimensionsMm: '50x100',
      marketUseCase: 'General structural studs',
      durabilityClass: 'Class 2 - Resistant',
      workingDifficulty: 'Low - Standard blades suitable',
      treatmentSpecs: 'Standard kiln dried'
    }
  ],
  speciesList: [
    'Merbau',
    'Mahogany',
    'Teak',
    'Pine'
  ],
  frameTypes: [
    'Door Frame',
    'Window Frame',
    'Double Window Frame'
  ],
  frameTypesConfig: [],
  customers: [],
  suppliers: [],
  yieldStandards: [],
  priceListBands: []
};
