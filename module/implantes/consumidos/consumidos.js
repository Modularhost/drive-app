import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
  authDomain: "modular-app-16bd6.firebaseapp.com",
  projectId: "modular-app-16bd6",
  storageBucket: "modular-app-16bd6.firebasestorage.app",
  messagingSenderId: "1006327040835",
  appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
  measurementId: "G-GVKBWL9GT9"
};

let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('Error inicializando Firebase:', error);
  throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);

async function configurePersistence() {
  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch (error) {
    console.error('Error al configurar persistencia:', error);
    throw error;
  }
}

const consumidosTableBody = document.querySelector('#consumidos-sub-table tbody');
const consumidosSummary = document.getElementById('consumidos-summary');

async function loadConsumidos() {
  try {
    const consumidosQuery = query(collection(db, 'transito'), where('estado', '==', 'Consumido'));
    const consumidosSnapshot = await getDocs(consumidosQuery);
    const consumidosData = consumidosSnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

    // Ordenar por fechaTraspaso de mayor a menor
    consumidosData.sort((a, b) => {
      const dateA = a.items[0]?.fechaTraspaso ? a.items[0].fechaTraspaso.toDate() : new Date(0);
      const dateB = b.items[0]?.fechaTraspaso ? b.items[0].fechaTraspaso.toDate() : new Date(0);
      return dateB - dateA;
    });

    if (consumidosTableBody) {
      renderConsumidos(consumidosData);
    }
    if (consumidosSummary) {
      updateSummary(consumidosData);
    }
  } catch (error) {
    console.error('Error al cargar datos de Consumidos:', error.message);
    alert('Error al cargar registros: ' + error.message);
  }
}

async function renderConsumidos(data) {
  if (!consumidosTableBody) return;
  consumidosTableBody.innerHTML = '';

  for (const item of data) {
    if (!item.items || item.items.length === 0) {
      console.warn(`No items found for referencia ${item.referencia}`);
      continue;
    }
    const fechaActualizacion = formatDate(item.fechaActualizacion);
    const fechaTraspaso = formatDate(item.items[0]?.fechaTraspaso);
    const contenedorName = await getContenedorName(item.contenedorId);
    const pacienteId = item.items[0]?.pacienteId || 'N/A';

    const row = document.createElement('tr');
    row.classList.add('expandable');
    row.innerHTML = `
      <td>${item.referencia || 'N/A'}</td>
      <td>${item.codigo || 'N/A'}</td>
      <td>${item.descripcion || 'N/A'}</td>
      <td>${item.proveedor || 'N/A'}</td>
      <td>${item.cantidad || 0}</td>
      <td>${pacienteId}</td>
      <td>${contenedorName}</td>
      <td>${fechaTraspaso}</td>
      <td>${fechaActualizacion}</td>
    `;
    consumidosTableBody.appendChild(row);

    const detailRow = document.createElement('tr');
    detailRow.className = 'item-details';
    detailRow.style.display = 'none';
    const subItemRows = await Promise.all(
      item.items.map(async (subItem) => {
        const subContenedorName = await getContenedorName(subItem.contenedorId);
        return `
          <tr>
            <td>${subItem.lote || 'N/A'}</td>
            <td>${formatDate(subItem.fechaVencimiento)}</td>
            <td>${subItem.cantidad || 0}</td>
            <td>${subContenedorName}</td>
          </tr>
        `;
      })
    );

    detailRow.innerHTML = `
      <td colspan="9">
        <table class="sub-table-details">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Fecha de Vencimiento</th>
              <th>Cantidad</th>
              <th>Contenedor</th>
            </tr>
          </thead>
          <tbody>
            ${subItemRows.length > 0 ? subItemRows.join('') : '<tr><td colspan="4">No hay ítems registrados</td></tr>'}
          </tbody>
        </table>
      </td>
    `;
    consumidosTableBody.appendChild(detailRow);

    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
    });
  }
}

function updateSummary(consumidosData) {
  if (consumidosSummary) {
    const totalConsumidos = consumidosData.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    consumidosSummary.textContent = `Total: ${totalConsumidos} unidades`;
  }
}

function formatDate(dateObj) {
  if (!dateObj) return 'N/A';
  if (typeof dateObj.toDate === 'function') {
    const date = dateObj.toDate();
    return date && !isNaN(date) ? date.toLocaleDateString('es-ES') : 'N/A';
  }
  if (dateObj instanceof Date && !isNaN(dateObj)) {
    return dateObj.toLocaleDateString('es-ES');
  }
  const parsedDate = new Date(dateObj);
  return parsedDate && !isNaN(parsedDate) ? parsedDate.toLocaleDateString('es-ES') : 'N/A';
}

async function getContenedorName(contenedorId) {
  if (!contenedorId) return 'N/A';
  try {
    const contenedorRef = doc(db, 'contenedores', contenedorId);
    const contenedorDoc = await getDoc(contenedorRef);
    if (!contenedorDoc.exists()) {
      console.warn(`Contenedor con ID ${contenedorId} no encontrado`);
      return 'Contenedor Desconocido';
    }
    const contenedorData = contenedorDoc.data();
    return contenedorData.nombreContenedor || contenedorData.nombre || 'Contenedor Desconocido';
  } catch (error) {
    console.error(`Error al obtener nombre del contenedor ${contenedorId}:`, error);
    return 'Contenedor Desconocido';
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await configurePersistence();
    await loadConsumidos();
  } else {
    console.warn('No hay usuario autenticado');
    alert('Por favor, inicia sesión para continuar');
  }

});
