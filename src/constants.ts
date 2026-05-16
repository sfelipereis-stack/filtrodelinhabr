
import { Product } from './types';

export const PRODUCTS: Product[] = [
  { 
    id: 1, 
    name: "Filtro 3 Tomadas ABS", 
    type: "abs", 
    img: "filtro_3_abs.jpg", 
    master: 20, 
    masterPrices: { c1: 22.90, c3: 26.90, c5: 34.90 }, 
    unitPrices: { c1: 24.90, c3: 28.90, c5: 36.90 } 
  },
  { 
    id: 2, 
    name: "Filtro 4 Tomadas ABS", 
    type: "abs", 
    img: "filtro_4_abs.jpg", 
    master: 20, 
    masterPrices: { c1: 24.50, c3: 29.50, c5: 38.50 }, 
    unitPrices: { c1: 26.50, c3: 31.50, c5: 40.50 } 
  },
  { 
    id: 3, 
    name: "Filtro 5 Tomadas ABS", 
    type: "abs", 
    img: "filtro_5_abs.jpg", 
    master: 20, 
    masterPrices: { c1: 25.90, c3: 29.90, c5: 38.90 }, 
    unitPrices: { c1: 27.90, c3: 31.90, c5: 40.90 } 
  },
  { 
    id: 4, 
    name: "Filtro 6 Tomadas ABS", 
    type: "abs", 
    img: "filtro_6_abs.jpg", 
    master: 16, 
    masterPrices: { c1: 31.10, c3: 35.25, c5: 39.25 }, 
    unitPrices: { c1: 33.10, c3: 37.25, c5: 41.25 } 
  },
  { 
    id: 5, 
    name: "Filtro 6 Tomadas Metal", 
    type: "metal", 
    img: "filtro_6_metal.jpg", 
    master: 12, 
    masterPrices: { c1: 43.00, c3: 47.00, c5: 51.00 }, 
    unitPrices: { c1: 45.00, c3: 49.00, c5: 53.00 } 
  },
  { 
    id: 6, 
    name: "Filtro 8 Tomadas Metal", 
    type: "metal", 
    img: "filtro_8_metal.jpg", 
    master: 10, 
    masterPrices: { c1: 52.00, c3: 56.00, c5: 60.00 }, 
    unitPrices: { c1: 54.00, c3: 58.00, c5: 62.00 } 
  },
  { 
    id: 7, 
    name: "Filtro 10 Tomadas Metal", 
    type: "metal", 
    img: "filtro_10_metal.jpg", 
    master: 8, 
    masterPrices: { c1: 59.00, c3: 64.00, c5: 68.00 }, 
    unitPrices: { c1: 61.00, c3: 66.00, c5: 70.00 } 
  }
];

export const REGIONS = {
  sudesteSul: ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS'],
  centroOeste: ['GO', 'MT', 'MS', 'DF'],
  nordeste: ['BA', 'PE', 'CE', 'MA', 'PI', 'RN', 'PB', 'AL', 'SE'],
  norte: ['AM', 'PA', 'TO', 'RO', 'RR', 'AP', 'AC']
};

export const PIX_CONFIG = {
  key: "43194137000137",
  name: "ELETRIZEI LTDA",
  city: "SAO PAULO"
};
