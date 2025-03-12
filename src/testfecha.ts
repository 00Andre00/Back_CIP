// test-fechas.ts

// Importamos las funciones que queremos probar
const formatearFecha = (fecha: Date | undefined): string => {
    if (!fecha) {
      return 'fecha no registrada';
    }
    
    return fecha.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Lima'
    });
  };
  
  const obtenerFechaEmision = (fechaEmision: Date | undefined): Date => {
    if (fechaEmision) {
      return fechaEmision;
    }
  
    const now = new Date();
    const peruOffset = -5 * 60; // UTC-5 en minutos
    const utcOffset = now.getTimezoneOffset();
    
    return new Date(now.getTime() + (utcOffset + peruOffset) * 60 * 1000);
  };
  
  // Funciones de prueba
  function testFechas() {
    console.log('=== Pruebas de Fechas ===');
    
    // Test 1: Fecha actual
    const fechaActual = obtenerFechaEmision(undefined);
    console.log('\nTest 1: Fecha actual');
    console.log('Fecha actual (objeto Date):', fechaActual);
    console.log('Fecha actual (formateada):', formatearFecha(fechaActual));
    console.log('Fecha actual (ISO):', fechaActual.toISOString());
    console.log('Fecha actual (Timestamp):', fechaActual.getTime());
    
    // Test 2: Fecha específica
    const fechaEspecifica = new Date('2025-02-13T12:00:00');
    console.log('\nTest 2: Fecha específica (2025-02-13)');
    console.log('Fecha específica (formateada):', formatearFecha(fechaEspecifica));
    
    // Test 3: Componentes de la fecha actual
    console.log('\nTest 3: Componentes de la fecha actual');
    console.log('Año:', fechaActual.getFullYear());
    console.log('Mes:', fechaActual.getMonth() + 1); // +1 porque los meses van de 0 a 11
    console.log('Día:', fechaActual.getDate());
    console.log('Hora:', fechaActual.getHours());
    console.log('Minutos:', fechaActual.getMinutes());
    
    // Test 4: Zona horaria
    console.log('\nTest 4: Información de zona horaria');
    console.log('UTC Offset (minutos):', fechaActual.getTimezoneOffset());
    console.log('Hora local:', new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima' }));
  }
  
  // Ejecutar las pruebas
  testFechas();