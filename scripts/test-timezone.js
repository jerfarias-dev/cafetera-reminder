// Script de prueba para verificar la zona horaria
const obtenerFechaActualMexico = () => {
  const ahora = new Date();
  // Convertir a zona horaria de México (UTC-6)
  const fechaMexico = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  return fechaMexico.toISOString().split('T')[0];
};

console.log('🕘 Comparación de fechas:');
console.log('UTC:', new Date().toISOString().split('T')[0]);
console.log('México:', obtenerFechaActualMexico());
console.log('Hora México:', new Date().toLocaleString("es-MX", {timeZone: "America/Mexico_City"}));
console.log('Hora UTC:', new Date().toISOString());

// También probar con la fecha de ejemplo
const fechaEjemplo = new Date('2025-09-26T19:30:00-06:00'); // 7:30 PM México
console.log('\n📅 Ejemplo específico:');
console.log('Fecha México (7:30 PM):', fechaEjemplo.toLocaleString("es-MX", {timeZone: "America/Mexico_City"}));
console.log('Fecha UTC:', fechaEjemplo.toISOString());
console.log('Solo fecha México:', new Date(fechaEjemplo.toLocaleString("en-US", {timeZone: "America/Mexico_City"})).toISOString().split('T')[0]);
console.log('Solo fecha UTC:', fechaEjemplo.toISOString().split('T')[0]);