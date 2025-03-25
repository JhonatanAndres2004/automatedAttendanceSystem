document.addEventListener('DOMContentLoaded', () => {
  async function cargarDatos() {
    try {
      const response = await fetch('/api/datos');
      if (!response.ok) {
        throw new Error('Error when loading data');
      }
      const datos = await response.json();
      const container = document.getElementById('data-container');
      container.innerHTML = '';
      datos.forEach(student => {
        const element = document.createElement('div');
        element.textContent = `${student.nombre} ${student.apellido}`;
        container.appendChild(element);
      });
    } catch (error) {
      console.error('Error:', error);
    }
  }
  cargarDatos();
});


