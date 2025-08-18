import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc, writeBatch, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
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

const entregadosTableBody = document.querySelector('#entregados-sub-table tbody');
const entregadosSummary = document.getElementById('entregados-summary');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const returnModal = document.getElementById('return-modal');
const returnDetails = document.getElementById('return-details');
const returnQuantity = document.getElementById('return-quantity');
const confirmReturnBtn = document.getElementById('confirm-return-btn');
const cancelReturnBtn = document.getElementById('cancel-return-btn');
const contenedorModal = document.getElementById('contenedor-modal');
const contenedorList = document.getElementById('contenedor-list');
const cancelContenedorBtn = document.getElementById('cancel-contenedor-btn');
const massTransferModal = document.getElementById('mass-transfer-modal');
const massTransferItems = document.getElementById('mass-transfer-items');
const confirmMassTransferBtn = document.getElementById('confirm-mass-transfer-btn');
const cancelMassTransferBtn = document.getElementById('cancel-mass-transfer-btn');
const transferModal = document.getElementById('transfer-modal');
const transferDetails = document.getElementById('transfer-details');
const transferQuantity = document.getElementById('transfer-quantity');
const confirmTransferBtn = document.getElementById('confirm-transfer-btn');
const cancelTransferBtn = document.getElementById('cancel-transfer-btn');
const selectAllCheckbox = document.getElementById('select-all-entregados');
const massPacienteBtn = document.getElementById('mass-paciente-btn');
const massContenedorBtn = document.getElementById('mass-contenedor-btn');

async function loadTransito() {
  try {
    const entregadosQuery = query(collection(db, 'transito'), where('estado', '==', 'Entregado'));
    const entregadosSnapshot = await getDocs(entregadosQuery);
    const entregadosData = entregadosSnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

    const groupedEntregados = {};
    entregadosData.forEach(item => {
      const ref = item.referencia || 'N/A';
      if (!groupedEntregados[ref]) {
        groupedEntregados[ref] = {
          referencia: ref,
          codigo: item.codigo || 'N/A',
          descripcion: item.descripcion || 'N/A',
          proveedor: item.proveedor || 'N/A',
          cantidad: 0,
          items: [],
          fechaActualizacion: item.fechaActualizacion,
          docIds: []
        };
      }
      groupedEntregados[ref].cantidad += item.cantidad || 0;
      groupedEntregados[ref].items.push(...(item.items || []));
      groupedEntregados[ref].docIds.push(item.docId);
      if (item.fechaActualizacion && (!groupedEntregados[ref].fechaActualizacion || item.fechaActualizacion.toDate() > groupedEntregados[ref].fechaActualizacion.toDate())) {
        groupedEntregados[ref].fechaActualizacion = item.fechaActualizacion;
      }
    });
    const entregadosGroupedData = Object.values(groupedEntregados);

    if (entregadosTableBody) {
      renderEntregados(entregadosGroupedData);
    }
    if (entregadosSummary) {
      updateSummary(entregadosGroupedData);
    }
  } catch (error) {
    console.error('Error al cargar datos de Tránsito:', error.message);
    showSuccessMessage('Error al cargar registros: ' + error.message, false);
  }
}

function showSuccessMessage(message, isSuccess = true) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Modal de mensaje no encontrado, usando alert');
    alert(message);
    return;
  }
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  const modalContent = successModal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.className = `modal-content success-message-container ${isSuccess ? 'success' : 'error'}`;
  }
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
  }, 5000);
}

function showModal(modal) {
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideModal(modal) {
  if (modal) {
    modal.style.display = 'none';
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

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
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

async function handleReturn(transitoIds, itemIndex, quantityToReturn) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();
    const batch = writeBatch(db);

    let transitoDocId, transitoData, itemToReturn;
    for (const id of transitoIds) {
      const transitoRef = doc(db, 'transito', id);
      const transitoDoc = await getDoc(transitoRef);
      if (transitoDoc.exists()) {
        const data = transitoDoc.data();
        if (data.items[itemIndex]) {
          transitoDocId = id;
          transitoData = data;
          itemToReturn = data.items[itemIndex];
          break;
        }
      }
    }

    if (!transitoDocId || !itemToReturn) {
      throw new Error('Ítem no encontrado en Tránsito');
    }

    if (quantityToReturn < 1 || quantityToReturn > itemToReturn.cantidad) {
      throw new Error(`Cantidad inválida: debe ser entre 1 y ${itemToReturn.cantidad}`);
    }

    let updatedItems = [...transitoData.items];
    if (quantityToReturn === itemToReturn.cantidad) {
      updatedItems.splice(itemIndex, 1);
    } else {
      updatedItems[itemIndex] = {
        ...itemToReturn,
        cantidad: itemToReturn.cantidad - quantityToReturn
      };
    }
    const newCantidad = updatedItems.reduce((sum, item) => sum + item.cantidad, 0);

    const transitoRef = doc(db, 'transito', transitoDocId);
    if (newCantidad === 0) {
      batch.delete(transitoRef);
    } else {
      batch.update(transitoRef, {
        items: updatedItems,
        cantidad: newCantidad,
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      });
    }

    const transitoLogRef = doc(collection(db, 'transito', transitoDocId, 'logs'));
    batch.set(transitoLogRef, {
      action: 'modified',
      details: `Devueltas ${quantityToReturn} unidades del ítem con lote "${itemToReturn.lote}" a Mantenedor`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const mantenedorQuery = query(
      collection(db, 'mantenedor'),
      where('referencia', '==', transitoData.referencia)
    );
    const mantenedorSnapshot = await getDocs(mantenedorQuery);
    if (mantenedorSnapshot.empty) {
      throw new Error(`No se encontró un mantenedor para la referencia ${transitoData.referencia}`);
    }

    const mantenedorDoc = mantenedorSnapshot.docs[0];
    const mantenedorRef = doc(db, 'mantenedor', mantenedorDoc.id);
    const mantenedorData = mantenedorDoc.data();

    let mantenedorItems = [...(mantenedorData.items || [])];
    const existingItemIndex = mantenedorItems.findIndex(
      item => item.lote === itemToReturn.lote && item.fechaVencimiento === itemToReturn.fechaVencimiento
    );
    if (existingItemIndex !== -1) {
      mantenedorItems[existingItemIndex] = {
        ...mantenedorItems[existingItemIndex],
        cantidad: mantenedorItems[existingItemIndex].cantidad + quantityToReturn,
        entregado: false
      };
    } else {
      mantenedorItems.push({
        lote: itemToReturn.lote,
        fechaVencimiento: itemToReturn.fechaVencimiento,
        cantidad: quantityToReturn,
        entregado: false
      });
    }
    const mantenedorCantidad = mantenedorItems.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0);
    const mantenedorPrecioTotal = (mantenedorData.precio || 0) * mantenedorCantidad;

    batch.update(mantenedorRef, {
      items: mantenedorItems,
      cantidad: mantenedorCantidad,
      precioTotal: mantenedorPrecioTotal
    });

    const mantenedorLogRef = doc(collection(db, 'mantenedor', mantenedorDoc.id, 'logs'));
    batch.set(mantenedorLogRef, {
      action: 'modified',
      details: `Recibidas ${quantityToReturn} unidades del ítem con lote "${itemToReturn.lote}" desde Tránsito`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    await batch.commit();

    showSuccessMessage(`${quantityToReturn} unidades devueltas a Mantenedor`);
    await loadTransito();
  } catch (error) {
    console.error('Error al procesar devolución:', error);
    showSuccessMessage('Error al devolver ítem: ' + error.message, false);
  }
}

async function handleTransfer(transitoDocId, itemIndex, quantityToTransfer, contenedorId, pacienteId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();
    const batch = writeBatch(db);

    const transitoRef = doc(db, 'transito', transitoDocId);
    const transitoDoc = await getDoc(transitoRef);
    if (!transitoDoc.exists()) {
      throw new Error('Documento de Tránsito no encontrado');
    }
    const transitoData = transitoDoc.data();
    const itemToTransfer = transitoData.items[itemIndex];

    if (!itemToTransfer) {
      throw new Error('Ítem no encontrado en Tránsito');
    }

    if (quantityToTransfer < 1 || quantityToTransfer > itemToTransfer.cantidad) {
      throw new Error(`Cantidad inválida: debe ser entre 1 y ${itemToTransfer.cantidad}`);
    }

    let updatedItems = [...transitoData.items];
    if (quantityToTransfer === itemToTransfer.cantidad) {
      updatedItems.splice(itemIndex, 1);
    } else {
      updatedItems[itemIndex] = {
        ...itemToTransfer,
        cantidad: itemToTransfer.cantidad - quantityToTransfer
      };
    }
    const newCantidad = updatedItems.reduce((sum, item) => sum + item.cantidad, 0);

    if (newCantidad === 0) {
      batch.delete(transitoRef);
    } else {
      batch.update(transitoRef, {
        items: updatedItems,
        cantidad: newCantidad,
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      });
    }

    const transitoLogRef = doc(collection(db, 'transito', transitoDocId, 'logs'));
    batch.set(transitoLogRef, {
      action: 'modified',
      details: `Transferidas ${quantityToTransfer} unidades del ítem con lote "${itemToTransfer.lote}" a Consumidos`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const consumidosRef = doc(collection(db, 'transito'));
    const consumidosData = {
      referencia: transitoData.referencia,
      codigo: transitoData.codigo,
      descripcion: transitoData.descripcion,
      proveedor: transitoData.proveedor,
      estado: 'Consumido',
      cantidad: quantityToTransfer,
      items: [{
        lote: itemToTransfer.lote,
        fechaVencimiento: itemToTransfer.fechaVencimiento,
        cantidad: quantityToTransfer,
        entregado: true,
        fechaTraspaso: new Date(),
        contenedorId: contenedorId || null,
        pacienteId: pacienteId || null
      }],
      fechaActualizacion: new Date(),
      usuario: fullName,
      uid: user.uid,
      contenedorId: contenedorId || null
    };
    batch.set(consumidosRef, consumidosData);

    const consumidosLogRef = doc(collection(db, 'transito', consumidosRef.id, 'logs'));
    const contenedorName = await getContenedorName(contenedorId);
    batch.set(consumidosLogRef, {
      action: 'created',
      details: `Creado registro en Consumidos con ${quantityToTransfer} unidades del ítem con lote "${itemToTransfer.lote}"${contenedorId ? ` en el contenedor ${contenedorName}` : ''}`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    if (contenedorId) {
      const contenedorRef = doc(db, 'contenedores', contenedorId);
      const contenedorDoc = await getDoc(contenedorRef);
      if (!contenedorDoc.exists()) {
        throw new Error(`Contenedor con ID ${contenedorId} no encontrado`);
      }
      const contenedorData = contenedorDoc.data();
      let contenedorItems = [...(contenedorData.items || [])];
      const existingItemIndex = contenedorItems.findIndex(
        item => item.referencia === transitoData.referencia
      );
      if (existingItemIndex !== -1) {
        contenedorItems[existingItemIndex] = {
          ...contenedorItems[existingItemIndex],
          cantidad: contenedorItems[existingItemIndex].cantidad + quantityToTransfer
        };
      } else {
        contenedorItems.push({
          referencia: transitoData.referencia,
          descripcion: transitoData.descripcion,
          ideal: 0,
          cantidad: quantityToTransfer,
          precio: 0
        });
      }
      const contenedorPrecioTotal = contenedorItems.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);

      batch.update(contenedorRef, {
        items: contenedorItems,
        precioTotal: contenedorPrecioTotal,
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      });

      const contenedorLogRef = doc(collection(db, 'contenedores', contenedorId, 'logs'));
      batch.set(contenedorLogRef, {
        action: 'modified',
        details: `Recibidas ${quantityToTransfer} unidades de la referencia "${transitoData.referencia}" desde Tránsito`,
        timestamp: new Date(),
        usuario: fullName,
        uid: user.uid
      });
    }

    await batch.commit();

    showSuccessMessage(`Transferidas ${quantityToTransfer} unidades a Consumidos${contenedorId ? ` y al contenedor ${contenedorName}` : ''}${pacienteId ? ` y al paciente ${pacienteId}` : ''}`);
    await loadTransito();
  } catch (error) {
    console.error('Error al procesar traspaso:', error);
    showSuccessMessage('Error al traspasar ítem: ' + error.message, false);
  }
}

async function handleMassTransfer(selectedItems) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();
    const batch = writeBatch(db);

    for (const { transitoDocId, itemIndex, quantityToTransfer, contenedorId, pacienteId } of selectedItems) {
      const transitoRef = doc(db, 'transito', transitoDocId);
      const transitoDoc = await getDoc(transitoRef);
      if (!transitoDoc.exists()) {
        throw new Error(`Documento de Tránsito ${transitoDocId} no encontrado`);
      }
      const transitoData = transitoDoc.data();
      const itemToTransfer = transitoData.items[itemIndex];

      if (!itemToTransfer) {
        throw new Error(`Ítem ${itemIndex} no encontrado en Tránsito ${transitoDocId}`);
      }

      if (quantityToTransfer < 1 || quantityToTransfer > itemToTransfer.cantidad) {
        throw new Error(`Cantidad inválida para el lote ${itemToTransfer.lote}: debe ser entre 1 y ${itemToTransfer.cantidad}`);
      }

      let updatedItems = [...transitoData.items];
      if (quantityToTransfer === itemToTransfer.cantidad) {
        updatedItems.splice(itemIndex, 1);
      } else {
        updatedItems[itemIndex] = {
          ...itemToTransfer,
          cantidad: itemToTransfer.cantidad - quantityToTransfer
        };
      }
      const newCantidad = updatedItems.reduce((sum, item) => sum + item.cantidad, 0);

      if (newCantidad === 0) {
        batch.delete(transitoRef);
      } else {
        batch.update(transitoRef, {
          items: updatedItems,
          cantidad: newCantidad,
          fechaActualizacion: new Date(),
          usuario: fullName,
          uid: user.uid
        });
      }

      const transitoLogRef = doc(collection(db, 'transito', transitoDocId, 'logs'));
      const contenedorName = await getContenedorName(contenedorId);
      batch.set(transitoLogRef, {
        action: 'modified',
        details: `Transferidas ${quantityToTransfer} unidades del ítem con lote "${itemToTransfer.lote}" a Consumidos${contenedorId ? ` y al contenedor ${contenedorName}` : ''}${pacienteId ? ` y al paciente ${pacienteId}` : ''}`,
        timestamp: new Date(),
        usuario: fullName,
        uid: user.uid
      });

      const consumidosRef = doc(collection(db, 'transito'));
      const consumidosData = {
        referencia: transitoData.referencia,
        codigo: transitoData.codigo,
        descripcion: transitoData.descripcion,
        proveedor: transitoData.proveedor,
        estado: 'Consumido',
        cantidad: quantityToTransfer,
        items: [{
          lote: itemToTransfer.lote,
          fechaVencimiento: itemToTransfer.fechaVencimiento,
          cantidad: quantityToTransfer,
          entregado: true,
          fechaTraspaso: new Date(),
          contenedorId: contenedorId || null,
          pacienteId: pacienteId || null
        }],
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid,
        contenedorId: contenedorId || null
      };
      batch.set(consumidosRef, consumidosData);

      const consumidosLogRef = doc(collection(db, 'transito', consumidosRef.id, 'logs'));
      batch.set(consumidosLogRef, {
        action: 'created',
        details: `Creado registro en Consumidos con ${quantityToTransfer} unidades del ítem con lote "${itemToTransfer.lote}"${contenedorId ? ` en el contenedor ${contenedorName}` : ''}${pacienteId ? ` y al paciente ${pacienteId}` : ''}`,
        timestamp: new Date(),
        usuario: fullName,
        uid: user.uid
      });

      if (contenedorId) {
        const contenedorRef = doc(db, 'contenedores', contenedorId);
        const contenedorDoc = await getDoc(contenedorRef);
        if (!contenedorDoc.exists()) {
          throw new Error(`Contenedor con ID ${contenedorId} no encontrado`);
        }
        const contenedorData = contenedorDoc.data();
        let contenedorItems = [...(contenedorData.items || [])];
        const existingItemIndex = contenedorItems.findIndex(
          item => item.referencia === transitoData.referencia
        );
        if (existingItemIndex !== -1) {
          contenedorItems[existingItemIndex] = {
            ...contenedorItems[existingItemIndex],
            cantidad: contenedorItems[existingItemIndex].cantidad + quantityToTransfer
          };
        } else {
          contenedorItems.push({
            referencia: transitoData.referencia,
            descripcion: transitoData.descripcion,
            ideal: 0,
            cantidad: quantityToTransfer,
            precio: 0
          });
        }
        const contenedorPrecioTotal = contenedorItems.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);

        batch.update(contenedorRef, {
          items: contenedorItems,
          precioTotal: contenedorPrecioTotal,
          fechaActualizacion: new Date(),
          usuario: fullName,
          uid: user.uid
        });

        const contenedorLogRef = doc(collection(db, 'contenedores', contenedorId, 'logs'));
        batch.set(contenedorLogRef, {
          action: 'modified',
          details: `Recibidas ${quantityToTransfer} unidades de la referencia "${transitoData.referencia}" desde Tránsito`,
          timestamp: new Date(),
          usuario: fullName,
          uid: user.uid
        });
      }
    }

    await batch.commit();

    const contenedorName = selectedItems[0]?.contenedorId ? await getContenedorName(selectedItems[0].contenedorId) : 'N/A';
    showSuccessMessage(`Transferidos ${selectedItems.length} ítems a Consumidos${contenedorName !== 'N/A' ? ` y al contenedor ${contenedorName}` : ''}`);
    hideModal(massTransferModal);
    hideModal(contenedorModal);
    await loadTransito();
  } catch (error) {
    console.error('Error al procesar traspaso masivo:', error);
    showSuccessMessage('Error al traspasar ítems: ' + error.message, false);
    hideModal(massTransferModal);
    hideModal(contenedorModal);
  }
}

async function loadContenedoresForModal() {
  try {
    const contenedoresCollection = collection(db, 'contenedores');
    const querySnapshot = await getDocs(contenedoresCollection);
    const contenedores = querySnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    }));
    return contenedores;
  } catch (error) {
    console.error('Error al cargar contenedores:', error);
    showSuccessMessage('Error al cargar contenedores: ' + error.message, false);
    return [];
  }
}

function updateSummary(entregadosData) {
  if (entregadosSummary) {
    const totalEntregados = entregadosData.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    entregadosSummary.textContent = `Total: ${totalEntregados} unidades`;
  }
}

async function renderEntregados(data) {
  if (!entregadosTableBody) return;
  entregadosTableBody.innerHTML = '';
  const selectedReferences = new Set();

  const updateMassActionButtons = () => {
    const hasSelection = selectedReferences.size > 0;
    if (massPacienteBtn) massPacienteBtn.disabled = !hasSelection;
    if (massContenedorBtn) massContenedorBtn.disabled = !hasSelection;
  };

  for (const item of data) {
    if (!item.items || item.items.length === 0) {
      console.warn(`No items found for referencia ${item.referencia}`);
      continue;
    }
    const row = document.createElement('tr');
    const fecha = formatDate(item.fechaActualizacion);
    const checkboxId = `select-${item.docIds.join('-')}`;

    row.innerHTML = `
      <td><input type="checkbox" class="select-item" data-id="${item.docIds.join(',')}" id="${checkboxId}"></td>
      <td class="referencia" data-id="${item.docIds.join(',')}">${item.referencia || 'N/A'}</td>
      <td>${item.codigo || 'N/A'}</td>
      <td>${item.descripcion || 'N/A'}</td>
      <td>${item.proveedor || 'N/A'}</td>
      <td>${item.cantidad || 0}</td>
      <td>${fecha}</td>
    `;
    row.classList.add('expandable');
    entregadosTableBody.appendChild(row);

    const detailRow = document.createElement('tr');
    detailRow.className = 'item-details';
    detailRow.style.display = 'none';
    const subItemRows = item.items.map((subItem, index) => {
      return `
        <tr>
          <td>${subItem.lote || 'N/A'}</td>
          <td>${formatDate(subItem.fechaVencimiento)}</td>
          <td>${subItem.cantidad || 0}</td>
          <td>${subItem.entregado ? 'Sí' : 'No'}</td>
          <td>${formatDate(subItem.fechaTraspaso)}</td>
          <td>
            <div class="button-container">
              <button class="paciente-btn" data-transito-id="${item.docIds[0]}" data-item-index="${index}">Paciente</button>
              <button class="traspasar-btn" data-transito-id="${item.docIds[0]}" data-item-index="${index}" ${subItem.contenedorId || subItem.pacienteId ? '' : 'disabled'}>Traspasar</button>
              <button class="devolucion-btn" data-transito-id="${item.docIds[0]}" data-item-index="${index}">Devolución</button>
              <button class="contenedor-btn" data-transito-id="${item.docIds[0]}" data-item-index="${index}">Contenedor</button>
            </div>
          </td>
        </tr>
      `;
    });

    detailRow.innerHTML = `
      <td colspan="7">
        <table class="sub-table-details">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Fecha de Vencimiento</th>
              <th>Cantidad</th>
              <th>Entregado</th>
              <th>Fecha de Traspaso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${subItemRows.length > 0 ? subItemRows.join('') : '<tr><td colspan="6">No hay ítems registrados</td></tr>'}
          </tbody>
        </table>
      </td>
    `;
    entregadosTableBody.appendChild(detailRow);

    row.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
    });

    row.querySelector('.select-item').addEventListener('change', (e) => {
      const refId = item.docIds.join(',');
      if (e.target.checked) {
        selectedReferences.add(refId);
      } else {
        selectedReferences.delete(refId);
      }
      updateMassActionButtons();
    });
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.select-item');
      checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
        const refId = checkbox.dataset.id;
        if (e.target.checked) {
          selectedReferences.add(refId);
        } else {
          selectedReferences.delete(refId);
        }
      });
      updateMassActionButtons();
    });
  }

  if (massPacienteBtn) {
    massPacienteBtn.addEventListener('click', () => {
      showSuccessMessage('Funcionalidad Paciente no implementada aún', false);
    });
  }

  if (massContenedorBtn) {
    massContenedorBtn.addEventListener('click', async () => {
      const contenedores = await loadContenedoresForModal();
      contenedorList.innerHTML = '';
      if (contenedores.length === 0) {
        contenedorList.innerHTML = '<p>No hay contenedores registrados.</p>';
        showModal(contenedorModal);
        return;
      }
      contenedores.forEach(contenedor => {
        const div = document.createElement('div');
        div.className = 'contenedor-item';
        div.innerHTML = `
          <input type="radio" name="contenedor" value="${contenedor.docId}" id="contenedor-${contenedor.docId}">
          <label for="contenedor-${contenedor.docId}">${contenedor.nombreContenedor || 'Contenedor Desconocido'} (ID: ${contenedor.contenedorId || contenedor.docId})</label>
        `;
        contenedorList.appendChild(div);
      });
      showModal(contenedorModal);

      const massTransferBtn = contenedorModal.querySelector('#mass-transfer-btn');
      const radioButtons = contenedorList.querySelectorAll('input[name="contenedor"]');
      radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
          massTransferBtn.disabled = !contenedorList.querySelector('input[name="contenedor"]:checked');
        });
      });

      massTransferBtn.onclick = async () => {
        const selectedContenedor = contenedorList.querySelector('input[name="contenedor"]:checked');
        if (!selectedContenedor) {
          showSuccessMessage('Por favor, selecciona un contenedor', false);
          return;
        }
        const contenedorId = selectedContenedor.value;
        const contenedorName = selectedContenedor.nextElementSibling.textContent.split(' (')[0];
        const batch = writeBatch(db);

        for (const refId of selectedReferences) {
          const [docId] = refId.split(',');
          const transitoRef = doc(db, 'transito', docId);
          const transitoDoc = await getDoc(transitoRef);
          if (!transitoDoc.exists()) continue;
          const transitoData = transitoDoc.data();
          const updatedItems = transitoData.items.map(item => ({
            ...item,
            contenedorId: contenedorId
          }));
          batch.update(transitoRef, {
            items: updatedItems,
            contenedorId: contenedorId,
            fechaActualizacion: new Date(),
            usuario: await getUserFullName(),
            uid: auth.currentUser.uid
          });
          const transitoLogRef = doc(collection(db, 'transito', docId, 'logs'));
          batch.set(transitoLogRef, {
            action: 'modified',
            details: `Asignado contenedor ${contenedorName} a ítems de la referencia ${transitoData.referencia}`,
            timestamp: new Date(),
            usuario: await getUserFullName(),
            uid: auth.currentUser.uid
          });
        }

        await batch.commit();
        showSuccessMessage(`Contenedor ${contenedorName} asignado a los ítems seleccionados`);

        const selectedItems = [];
        for (const refId of selectedReferences) {
          const [docId] = refId.split(',');
          const transitoRef = doc(db, 'transito', docId);
          const transitoDoc = await getDoc(transitoRef);
          if (!transitoDoc.exists()) continue;
          const transitoData = transitoDoc.data();
          transitoData.items.forEach((item, index) => {
            if (item.contenedorId) {
              selectedItems.push({
                transitoDocId: docId,
                itemIndex: index,
                item: { ...item, referencia: transitoData.referencia },
                contenedorId: item.contenedorId,
                pacienteId: item.pacienteId || null
              });
            }
          });
        }

        if (selectedItems.length === 0) {
          showSuccessMessage('No hay ítems con contenedor seleccionado para traspasar', false);
          hideModal(contenedorModal);
          return;
        }

        massTransferItems.innerHTML = await Promise.all(
          selectedItems.map(async (selectedItem, index) => {
            const contenedorName = await getContenedorName(selectedItem.contenedorId);
            return `
              <div class="mass-transfer-item">
                <p>Referencia: ${selectedItem.item.referencia}, Lote: ${selectedItem.item.lote}, Cantidad Total: ${selectedItem.item.cantidad}, Contenedor: ${contenedorName}</p>
                <label for="transfer-quantity-${index}">Cantidad a Traspasar:</label>
                <input type="number" id="transfer-quantity-${index}" min="1" max="${selectedItem.item.cantidad}" value="${selectedItem.item.cantidad}" data-transito-id="${selectedItem.transitoDocId}" data-item-index="${selectedItem.itemIndex}" data-contenedor-id="${selectedItem.contenedorId}">
              </div>
            `;
          })
        ).then(results => results.join(''));
        hideModal(contenedorModal);
        showModal(massTransferModal);
      };

      cancelContenedorBtn.onclick = () => {
        hideModal(contenedorModal);
      };
    });
  }

  entregadosTableBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('paciente-btn')) {
      showSuccessMessage('Funcionalidad Paciente no implementada aún', false);
    } else if (e.target.classList.contains('traspasar-btn')) {
      const transitoId = e.target.dataset.transitoId;
      const itemIndex = parseInt(e.target.dataset.itemIndex);
      const transitoRef = doc(db, 'transito', transitoId);
      const transitoDoc = await getDoc(transitoRef);
      if (!transitoDoc.exists()) {
        showSuccessMessage('Documento de Tránsito no encontrado', false);
        return;
      }
      const transitoData = transitoDoc.data();
      const item = transitoData.items[itemIndex];
      const contenedorName = await getContenedorName(item.contenedorId);
      transferDetails.innerHTML = `
        Referencia: ${transitoData.referencia || 'N/A'}<br>
        Lote: ${item.lote || 'N/A'}<br>
        Cantidad Total: ${item.cantidad || 0}<br>
        Contenedor: ${contenedorName}
      `;
      transferQuantity.value = 1;
      transferQuantity.max = item.cantidad;
      transferQuantity.dataset.transitoId = transitoId;
      transferQuantity.dataset.itemIndex = itemIndex;
      transferQuantity.dataset.contenedorId = item.contenedorId || '';
      showModal(transferModal);

      confirmTransferBtn.onclick = async () => {
        const quantityToTransfer = parseInt(transferQuantity.value);
        if (quantityToTransfer < 1 || quantityToTransfer > item.cantidad) {
          showSuccessMessage(`Cantidad inválida: debe ser entre 1 y ${item.cantidad}`, false);
          return;
        }
        await handleTransfer(transitoId, itemIndex, quantityToTransfer, item.contenedorId, item.pacienteId);
        hideModal(transferModal);
      };

      cancelTransferBtn.onclick = () => {
        hideModal(transferModal);
      };
    } else if (e.target.classList.contains('devolucion-btn')) {
      const transitoId = e.target.dataset.transitoId;
      const itemIndex = parseInt(e.target.dataset.itemIndex);
      const transitoRef = doc(db, 'transito', transitoId);
      const transitoDoc = await getDoc(transitoRef);
      if (!transitoDoc.exists()) {
        showSuccessMessage('Documento de Tránsito no encontrado', false);
        return;
      }
      const transitoData = transitoDoc.data();
      const item = transitoData.items[itemIndex];
      returnDetails.innerHTML = `
        Referencia: ${transitoData.referencia || 'N/A'}<br>
        Lote: ${item.lote || 'N/A'}<br>
        Cantidad Total: ${item.cantidad || 0}
      `;
      returnQuantity.value = 1;
      returnQuantity.max = item.cantidad;
      returnQuantity.dataset.transitoId = transitoId;
      returnQuantity.dataset.itemIndex = itemIndex;
      showModal(returnModal);

      confirmReturnBtn.onclick = async () => {
        const quantityToReturn = parseInt(returnQuantity.value);
        if (quantityToReturn < 1 || quantityToReturn > item.cantidad) {
          showSuccessMessage(`Cantidad inválida: debe ser entre 1 y ${item.cantidad}`, false);
          return;
        }
        await handleReturn([transitoId], itemIndex, quantityToReturn);
        hideModal(returnModal);
      };

      cancelReturnBtn.onclick = () => {
        hideModal(returnModal);
      };
    } else if (e.target.classList.contains('contenedor-btn')) {
      const transitoId = e.target.dataset.transitoId;
      const itemIndex = parseInt(e.target.dataset.itemIndex);
      const contenedores = await loadContenedoresForModal();
      contenedorList.innerHTML = '';
      if (contenedores.length === 0) {
        contenedorList.innerHTML = '<p>No hay contenedores registrados.</p>';
        showModal(contenedorModal);
        return;
      }
      contenedores.forEach(contenedor => {
        const div = document.createElement('div');
        div.className = 'contenedor-item';
        div.innerHTML = `
          <input type="radio" name="contenedor" value="${contenedor.docId}" id="contenedor-${contenedor.docId}">
          <label for="contenedor-${contenedor.docId}">${contenedor.nombreContenedor || 'Contenedor Desconocido'} (ID: ${contenedor.contenedorId || contenedor.docId})</label>
        `;
        contenedorList.appendChild(div);
      });
      showModal(contenedorModal);

      const massTransferBtn = contenedorModal.querySelector('#mass-transfer-btn');
      const radioButtons = contenedorList.querySelectorAll('input[name="contenedor"]');
      radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
          massTransferBtn.disabled = !contenedorList.querySelector('input[name="contenedor"]:checked');
        });
      });

      massTransferBtn.onclick = async () => {
        const selectedContenedor = contenedorList.querySelector('input[name="contenedor"]:checked');
        if (!selectedContenedor) {
          showSuccessMessage('Por favor, selecciona un contenedor', false);
          return;
        }
        const contenedorId = selectedContenedor.value;
        const contenedorName = selectedContenedor.nextElementSibling.textContent.split(' (')[0];
        const batch = writeBatch(db);

        const transitoRef = doc(db, 'transito', transitoId);
        const transitoDoc = await getDoc(transitoRef);
        if (!transitoDoc.exists()) {
          showSuccessMessage('Documento de Tránsito no encontrado', false);
          return;
        }
        const transitoData = transitoDoc.data();
        const updatedItems = [...transitoData.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], contenedorId: contenedorId };
        batch.update(transitoRef, {
          items: updatedItems,
          contenedorId: contenedorId,
          fechaActualizacion: new Date(),
          usuario: await getUserFullName(),
          uid: auth.currentUser.uid
        });
        const transitoLogRef = doc(collection(db, 'transito', transitoId, 'logs'));
        batch.set(transitoLogRef, {
          action: 'modified',
          details: `Asignado contenedor ${contenedorName} al ítem con lote ${updatedItems[itemIndex].lote}`,
          timestamp: new Date(),
          usuario: await getUserFullName(),
          uid: auth.currentUser.uid
        });
        await batch.commit();
        showSuccessMessage(`Contenedor ${contenedorName} asignado al ítem`);
        hideModal(contenedorModal);

        const selectedItems = [{
          transitoDocId: transitoId,
          itemIndex: itemIndex,
          item: { ...updatedItems[itemIndex], referencia: transitoData.referencia },
          contenedorId: contenedorId,
          pacienteId: updatedItems[itemIndex].pacienteId || null
        }];

        massTransferItems.innerHTML = await Promise.all(
          selectedItems.map(async (selectedItem, index) => {
            const contenedorName = await getContenedorName(selectedItem.contenedorId);
            return `
              <div class="mass-transfer-item">
                <p>Referencia: ${selectedItem.item.referencia}, Lote: ${selectedItem.item.lote}, Cantidad Total: ${selectedItem.item.cantidad}, Contenedor: ${contenedorName}</p>
                <label for="transfer-quantity-${index}">Cantidad a Traspasar:</label>
                <input type="number" id="transfer-quantity-${index}" min="1" max="${selectedItem.item.cantidad}" value="${selectedItem.item.cantidad}" data-transito-id="${selectedItem.transitoDocId}" data-item-index="${selectedItem.itemIndex}" data-contenedor-id="${selectedItem.contenedorId}">
              </div>
            `;
          })
        ).then(results => results.join(''));
        showModal(massTransferModal);
      };

      cancelContenedorBtn.onclick = () => {
        hideModal(contenedorModal);
      };
    }
  });

  if (confirmMassTransferBtn) {
    confirmMassTransferBtn.addEventListener('click', async () => {
      const transferItems = [];
      massTransferItems.querySelectorAll('.mass-transfer-item').forEach(item => {
        const input = item.querySelector('input[type="number"]');
        const quantity = parseInt(input.value);
        if (quantity > 0 && quantity <= parseInt(input.max)) {
          transferItems.push({
            transitoDocId: input.dataset.transitoId,
            itemIndex: parseInt(input.dataset.itemIndex),
            quantityToTransfer: quantity,
            contenedorId: input.dataset.contenedorId,
            pacienteId: null
          });
        }
      });

      if (transferItems.length === 0) {
        showSuccessMessage('No se seleccionaron cantidades válidas para traspasar', false);
        return;
      }

      await handleMassTransfer(transferItems);
    });
  }

  if (cancelMassTransferBtn) {
    cancelMassTransferBtn.addEventListener('click', () => {
      hideModal(massTransferModal);
    });
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await configurePersistence();
    await loadTransito();
  } else {
    console.warn('No hay usuario autenticado');
    showSuccessMessage('Por favor, inicia sesión para continuar', false);
  }
});