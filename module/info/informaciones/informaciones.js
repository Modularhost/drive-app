import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

export function initNotes(user) {
  if (!user) {
    console.error('Usuario no proporcionado');
    return;
  }

  const db = getFirestore();
  const auth = getAuth();
  const infoList = document.querySelector('.info-list');
  let addInfoBtn = document.querySelector('.add-info-btn');
  const consignacionTableBody = document.querySelector('#summary-table-body');
  const implantesTableBody = document.querySelector('#implantes-summary-table-body');

  if (!infoList) {
    console.error('Elemento .info-list no encontrado');
    return;
  }

  if (!addInfoBtn) {
    console.error('Botón .add-info-btn no encontrado en el DOM');
  }

  if (!consignacionTableBody) {
    console.error('Elemento #summary-table-body no encontrado');
  }

  if (!implantesTableBody) {
    console.error('Elemento #implantes-summary-table-body no encontrado');
  }

  async function isAdmin() {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.error('Documento de usuario no encontrado para UID:', user.uid);
        return false;
      }
      const userData = userSnap.data();
      const role = userData.role || '';
      return role === 'Administrador';
    } catch (error) {
      console.error('Error al verificar si el usuario es administrador:', error);
      return false;
    }
  }

  async function loadSummaries() {
    try {
      // Resumen de Cirugías Consignadas
      if (!consignacionTableBody) {
        console.error('Elemento #summary-table-body no encontrado al cargar el resumen de consignaciones');
        return;
      }
      const consignacionCollection = collection(db, 'pacientesconsignacion');
      const consignacionQuery = query(consignacionCollection, orderBy('fechaCX', 'asc'));
      const consignacionSnapshot = await getDocs(consignacionQuery);

      const summary2025 = {};
      consignacionSnapshot.forEach(doc => {
        const data = doc.data();
        let fechaCX;
        if (typeof data.fechaCX === 'string') {
          fechaCX = new Date(data.fechaCX);
        } else if (data.fechaCX instanceof Timestamp) {
          fechaCX = data.fechaCX.toDate();
        } else if (data.fechaCX instanceof Date) {
          fechaCX = data.fechaCX;
        } else {
          return;
        }

        if (fechaCX && !isNaN(fechaCX) && fechaCX.getFullYear() === 2025) {
          const month = (fechaCX.getMonth() + 1).toString().padStart(2, '0');
          if (!summary2025[month]) {
            summary2025[month] = { total: 0, pending: 0 };
          }
          summary2025[month].total += 1;
          if (data.estado !== 'Cargado') {
            summary2025[month].pending += 1;
          }
        }
      });

      // Actualizar tabla de consignaciones
      ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(month => {
        const totalCell = document.getElementById(`total-${month}`);
        const pendingCell = document.getElementById(`pending-${month}`);
        if (totalCell && pendingCell) {
          totalCell.textContent = summary2025[month]?.total > 0 ? summary2025[month].total : '';
          pendingCell.textContent = summary2025[month]?.pending > 0 ? summary2025[month].pending : '';
          if (summary2025[month]?.pending > 0) {
            pendingCell.classList.add('pending-non-zero');
          } else {
            pendingCell.classList.remove('pending-non-zero');
          }
        }
      });

      // Resumen de Cargas Implantes
      if (!implantesTableBody) {
        console.error('Elemento #implantes-summary-table-body no encontrado al cargar el resumen de implantes');
        return;
      }
      const implantesCollection = collection(db, 'pacientesimplantes');
      const implantesQuery = query(implantesCollection, orderBy('fechaCX', 'asc'));
      const implantesSnapshot = await getDocs(implantesQuery);

      const implantesSummary2025 = {};
      implantesSnapshot.forEach(doc => {
        const data = doc.data();
        let fechaCX;
        if (typeof data.fechaCX === 'string') {
          fechaCX = new Date(data.fechaCX);
        } else if (data.fechaCX instanceof Timestamp) {
          fechaCX = data.fechaCX.toDate();
        } else if (data.fechaCX instanceof Date) {
          fechaCX = data.fechaCX;
        } else {
          return;
        }

        if (fechaCX && !isNaN(fechaCX) && fechaCX.getFullYear() === 2025) {
          const month = (fechaCX.getMonth() + 1).toString().padStart(2, '0');
          if (!implantesSummary2025[month]) {
            implantesSummary2025[month] = { total: 0, pending: 0 };
          }
          implantesSummary2025[month].total += 1;
          if (data.estado !== 'Cargado') {
            implantesSummary2025[month].pending += 1;
          }
        }
      });

      // Actualizar tabla de implantes
      ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(month => {
        const totalCell = document.getElementById(`implantes-total-${month}`);
        const pendingCell = document.getElementById(`implantes-pending-${month}`);
        if (totalCell && pendingCell) {
          totalCell.textContent = implantesSummary2025[month]?.total > 0 ? implantesSummary2025[month].total : '';
          pendingCell.textContent = implantesSummary2025[month]?.pending > 0 ? implantesSummary2025[month].pending : '';
          if (implantesSummary2025[month]?.pending > 0) {
            pendingCell.classList.add('pending-non-zero');
          } else {
            pendingCell.classList.remove('pending-non-zero');
          }
        }
      });
    } catch (error) {
      console.error('Error al cargar los resúmenes:', error);
      alert(`Error al cargar los resúmenes: ${error.message}. Intenta de nuevo.`);
    }
  }

  async function loadInfo() {
    try {
      infoList.innerHTML = '';
      const infoRef = collection(db, 'informaciones');
      const snapshot = await getDocs(infoRef);
      const isUserAdmin = await isAdmin();
      if (addInfoBtn) {
        addInfoBtn.style.setProperty('display', isUserAdmin ? 'block' : 'none', 'important');
      } else {
        console.error('Botón .add-info-btn no encontrado al ejecutar loadInfo');
      }
      snapshot.forEach(doc => {
        renderInfo(doc.id, doc.data().content, false, isUserAdmin);
      });
    } catch (error) {
      console.error('Error al cargar las informaciones:', error);
      alert(`Error al cargar las informaciones: ${error.message}. Intenta de nuevo.`);
    }
  }

  function renderInfo(id, content, isNew = false, isUserAdmin = false) {
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('info-container');
    infoContainer.dataset.id = id;

    if (isNew && isUserAdmin) {
      const textarea = document.createElement('textarea');
      textarea.classList.add('info-textarea');
      textarea.value = content || '';
      textarea.placeholder = 'Escribe la información general aquí...';
      infoContainer.appendChild(textarea);

      const actions = document.createElement('div');
      actions.classList.add('info-actions');

      const saveBtn = document.createElement('button');
      saveBtn.classList.add('info-btn', 'save');
      saveBtn.textContent = 'Guardar';
      saveBtn.addEventListener('click', () => saveInfo(id, textarea.value, infoContainer));

      const cancelBtn = document.createElement('button');
      cancelBtn.classList.add('info-btn', 'cancel');
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', () => infoContainer.remove());

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      infoContainer.appendChild(actions);
    } else {
      const infoText = document.createElement('div');
      infoText.classList.add('info-text');
      infoText.textContent = content;
      infoContainer.appendChild(infoText);

      if (isUserAdmin) {
        const actions = document.createElement('div');
        actions.classList.add('info-actions');

        const editBtn = document.createElement('button');
        editBtn.classList.add('info-btn', 'edit');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => editInfo(id, content, infoContainer));

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('info-btn', 'delete');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', () => deleteInfo(id, infoContainer));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        infoContainer.appendChild(actions);
      }
    }

    infoList.appendChild(infoContainer);
  }

  async function saveInfo(id, content, infoContainer) {
    if (!content.trim()) {
      alert('La información no puede estar vacía.');
      return;
    }

    try {
      const isUserAdmin = await isAdmin();
      if (!isUserAdmin) {
        alert('No tienes permiso para realizar esta acción.');
        return;
      }

      if (id === 'temp') {
        const infoRef = collection(db, 'informaciones');
        const docRef = await addDoc(infoRef, {
          content: content,
          uid: user.uid,
          createdAt: new Date()
        });
        infoContainer.dataset.id = docRef.id;
      } else {
        const infoRef = doc(db, 'informaciones', id);
        const docSnap = await getDoc(infoRef);
        if (!docSnap.exists()) {
          throw new Error('El documento no existe');
        }
        await updateDoc(infoRef, { content });
      }

      infoContainer.innerHTML = '';
      const infoText = document.createElement('div');
      infoText.classList.add('info-text');
      infoText.textContent = content;
      infoContainer.appendChild(infoText);

      if (isUserAdmin) {
        const actions = document.createElement('div');
        actions.classList.add('info-actions');

        const editBtn = document.createElement('button');
        editBtn.classList.add('info-btn', 'edit');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => editInfo(id, content, infoContainer));

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('info-btn', 'delete');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', () => deleteInfo(id, infoContainer));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        infoContainer.appendChild(actions);
      }
    } catch (error) {
      console.error('Error al guardar la información:', error);
      alert(`Error al guardar la información: ${error.message}. Intenta de nuevo.`);
    }
  }

  async function editInfo(id, content, infoContainer) {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      alert('No tienes permiso para editar esta información.');
      return;
    }

    infoContainer.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.classList.add('info-textarea');
    textarea.value = content;
    textarea.placeholder = 'Escribe la información general aquí...';
    infoContainer.appendChild(textarea);

    const actions = document.createElement('div');
    actions.classList.add('info-actions');

    const saveBtn = document.createElement('button');
    saveBtn.classList.add('info-btn', 'save');
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', () => saveInfo(id, textarea.value, infoContainer));

    const cancelBtn = document.createElement('button');
    cancelBtn.classList.add('info-btn', 'cancel');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      infoContainer.innerHTML = '';
      const infoText = document.createElement('div');
      infoText.classList.add('info-text');
      infoText.textContent = content;
      infoContainer.appendChild(infoText);

      const actions = document.createElement('div');
      actions.classList.add('info-actions');

      const editBtn = document.createElement('button');
      editBtn.classList.add('info-btn', 'edit');
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => editInfo(id, content, infoContainer));

      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('info-btn', 'delete');
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', () => deleteInfo(id, infoContainer));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      infoContainer.appendChild(actions);
    });

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    infoContainer.appendChild(actions);
  }

  async function deleteInfo(id, infoContainer) {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      alert('No tienes permiso para eliminar esta información.');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta información?')) return;

    try {
      const infoRef = doc(db, 'informaciones', id);
      await deleteDoc(infoRef);
      infoContainer.remove();
    } catch (error) {
      console.error('Error al eliminar la información:', error);
      alert(`Error al eliminar la información: ${error.message}. Intenta de nuevo.`);
    }
  }

  if (addInfoBtn) {
    const addInfoBtnClone = addInfoBtn.cloneNode(true);
    addInfoBtn.parentNode.replaceChild(addInfoBtnClone, addInfoBtn);
    addInfoBtn = addInfoBtnClone;

    addInfoBtn.addEventListener('click', async () => {
      const isUserAdmin = await isAdmin();
      if (!isUserAdmin) {
        alert('No tienes permiso para añadir información.');
        return;
      }
      renderInfo('temp', '', true, true);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadInfo();
    loadSummaries();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      loadInfo();
      loadSummaries();
    });
  }

  window.addEventListener('moduleCleanup', () => {
    if (addInfoBtn) {
      addInfoBtn.removeEventListener('click', () => { });
    }
  });
}

window.initNotes = initNotes;