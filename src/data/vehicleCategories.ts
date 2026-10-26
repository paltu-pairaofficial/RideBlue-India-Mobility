import { VehicleCategoryConfig } from '../types';

export const VEHICLE_CATEGORIES: VehicleCategoryConfig[] = [
  {
    id: 'economy',
    name: 'Economy',
    tagline: 'Pocket-friendly everyday city rides',
    luggage: '1 large or 2 small bags',
    description: 'Compact hatchbacks for city commutes and everyday travel.',
    suitableFor: 'Everyday, budget-conscious rides',
    availableInWB: true,
  },
  {
    id: 'sedan',
    name: 'Sedan',
    tagline: 'Comfortable executive sedans with ample boot space',
    luggage: '2 large suitcases + hand luggage',
    description: 'Premium sedans with enhanced legroom, air conditioning, and professional drivers.',
    suitableFor: 'Business meetings, airport runs, and relaxed standard travel',
    availableInWB: true,
  },
  {
    id: 'suv',
    name: 'SUV',
    tagline: 'Spacious high-ground clearance cabins',
    luggage: '3 large suitcases + backpacks',
    description: 'Spacious SUVs suited to family travel, highway routes, and extra luggage.',
    suitableFor: 'Family trips, highway journeys, and groups with heavy luggage',
    availableInWB: true,
  },
  {
    id: 'xl',
    name: 'XL',
    tagline: 'Extra space for groups and intercity routes',
    luggage: '4 large suitcases',
    description: 'Large-capacity vehicles for comfortable long-distance group tours.',
    suitableFor: 'Larger groups, weddings, and intercity trips across West Bengal',
    availableInWB: true,
  },
  {
    id: 'airport_transfer',
    name: 'Airport Transfer',
    tagline: 'Punctual pickup with flight tracking & luggage assist',
    luggage: 'Up to 3 large suitcases',
    description: 'Dedicated airport transfer service with 45 minutes complimentary wait time and Howrah/Kolkata toll management included.',
    suitableFor: 'Trips to or from Netaji Subhash Chandra Bose International Airport (CCU)',
    availableInWB: true,
  },
];
