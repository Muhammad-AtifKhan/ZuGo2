// src/utils/cityCoordinates.ts

export interface CityCoordinate {
  name: string;
  latitude: number;
  longitude: number;
}

export const PAKISTAN_CITY_COORDINATES: Record<string, CityCoordinate> = {
  'Lahore': { name: 'Lahore', latitude: 31.5204, longitude: 74.3587 },
  'Karachi': { name: 'Karachi', latitude: 24.8607, longitude: 67.0011 },
  'Islamabad': { name: 'Islamabad', latitude: 33.6844, longitude: 73.0479 },
  'Rawalpindi': { name: 'Rawalpindi', latitude: 33.5909, longitude: 73.0535 },
  'Peshawar': { name: 'Peshawar', latitude: 34.0151, longitude: 71.5249 },
  'Quetta': { name: 'Quetta', latitude: 30.1798, longitude: 66.9750 },
  'Multan': { name: 'Multan', latitude: 30.1575, longitude: 71.5249 },
  'Faisalabad': { name: 'Faisalabad', latitude: 31.4504, longitude: 73.1350 },
  'Gujranwala': { name: 'Gujranwala', latitude: 32.1617, longitude: 74.1883 },
  'Sialkot': { name: 'Sialkot', latitude: 32.4945, longitude: 74.5229 },
  'Sargodha': { name: 'Sargodha', latitude: 32.0836, longitude: 72.6711 },
  'Bahawalpur': { name: 'Bahawalpur', latitude: 29.3957, longitude: 71.6833 },
  'Sukkur': { name: 'Sukkur', latitude: 27.7152, longitude: 68.8574 },
  'Hyderabad': { name: 'Hyderabad', latitude: 25.3960, longitude: 68.3578 },
  'Abbottabad': { name: 'Abbottabad', latitude: 34.1495, longitude: 73.2115 },
  'Mardan': { name: 'Mardan', latitude: 34.1986, longitude: 72.0404 },
  'Swat': { name: 'Swat', latitude: 35.2227, longitude: 72.4258 },
  'Gilgit': { name: 'Gilgit', latitude: 35.9208, longitude: 74.3083 },
  'Gwadar': { name: 'Gwadar', latitude: 25.1216, longitude: 62.3254 },
  'Chitral': { name: 'Chitral', latitude: 35.8510, longitude: 71.7864 },
  'Skardu': { name: 'Skardu', latitude: 35.2971, longitude: 75.6333 },
};

export const getCoordinateForCity = (cityName: string): CityCoordinate | null => {
  // Try exact match
  if (PAKISTAN_CITY_COORDINATES[cityName]) {
    return PAKISTAN_CITY_COORDINATES[cityName];
  }
  
  // Try case-insensitive match
  const searchName = cityName.toLowerCase().trim();
  const foundKey = Object.keys(PAKISTAN_CITY_COORDINATES).find(
    key => key.toLowerCase() === searchName
  );
  
  if (foundKey) {
    return PAKISTAN_CITY_COORDINATES[foundKey];
  }
  
  return null;
};
