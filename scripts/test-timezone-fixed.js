// Script de prueba mejorado para verificar la zona horaria
const obtenerFechaActualMexico = () => {
  const ahora = new Date();
  // México está en UTC-6, así que restamos 6 horas a UTC
  const offsetMexico = 6 * 60 * 60 * 1000; // 6 horas en milisegundos
  const fechaMexico = new Date(ahora.getTime() - offsetMexico);
  return fechaMexico.toISOString().split('T')[0];
};

console.log('🕘 Comparación de fechas (método corregido):');
console.log('UTC:', new Date().toISOString().split('T')[0]);
console.log('México (UTC-6):', obtenerFechaActualMexico());
console.log('Hora actual UTC:', new Date().toISOString());
console.log('Hora México calculada:', new Date(new Date().getTime() - (6 * 60 * 60 * 1000)).toISOString());

// Verificar que funciona en horarios límite
console.log('\n🌅 Pruebas de horarios límite:');

// Simular medianoche UTC (6 PM México del día anterior)
const medianoche = new Date();
medianoche.setUTCHours(0, 0, 0, 0);
console.log('Medianoche UTC:', medianoche.toISOString());
console.log('En México sería:', new Date(medianoche.getTime() - (6 * 60 * 60 * 1000)).toISOString());

// Simular 6 AM UTC (medianoche México)
const seisAM = new Date();
seisAM.setUTCHours(6, 0, 0, 0);
console.log('6 AM UTC:', seisAM.toISOString());
console.log('En México sería:', new Date(seisAM.getTime() - (6 * 60 * 60 * 1000)).toISOString());