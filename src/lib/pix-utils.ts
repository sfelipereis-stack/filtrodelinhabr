
import { PIX_CONFIG } from '../constants';

function formatField(id: string, value: string): string {
  return id + value.length.toString().padStart(2, '0') + value;
}

function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(amount: number): string {
  const val = amount.toFixed(2);
  let payload = "000201";
  
  // ID 26: Merchant Account Info
  const merchantInfo = "0014br.gov.bcb.pix" + formatField("01", PIX_CONFIG.key);
  payload += formatField("26", merchantInfo);
  payload += "52040000"; // Merchant Category Code
  payload += "5303986";  // Currency BRL
  payload += formatField("54", val); // Value
  payload += "5802BR";   // Country Code
  payload += formatField("59", PIX_CONFIG.name); // Name
  payload += formatField("60", PIX_CONFIG.city); // City
  payload += formatField("62", formatField("05", "***")); // ID Transação
  payload += "6304"; // CRC Header
  
  return payload + calculateCRC16(payload);
}
