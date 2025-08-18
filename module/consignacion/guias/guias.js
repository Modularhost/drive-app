import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, Timestamp, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

const firebaseConfig = {
  apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
  authDomain: "modular-app-16bd6.firebaseapp.com",
  projectId: "modular-app-16bd6",
  storageBucket: "modular-app-16bd6.firebasestorage.app",
  messagingSenderId: "1006327040835",
  appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
  measurementId: "G-GVKBWL9GT9"
};

try {
    let app;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    setPersistence(auth, browserLocalPersistence).catch(error => {
        console.warn('Error al configurar persistencia:', error.message);
    });

    const container = document.querySelector('.guias-container');
    const tableBody = document.querySelector('#guias-table tbody');
    const guiaForm = document.getElementById('guia-form');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const formContainer = document.querySelector('.form-container');

    const elements = {
        container, tableBody, guiaForm, successModal, successIcon, successMessage, formContainer
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let currentEditId = null;
    let isLoading = false; 
    let lotesUnsubscribe = null; 

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async function isAdmin() {
        try {
            if (!currentUser) return false;
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                console.error('Documento de usuario no encontrado para UID:', currentUser.uid);
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

    function formatDateOnly(date) {
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'string') {
            parsedDate = new Date(date);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '-';
        return parsedDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
    }

    function showModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'block';
        modal.removeAttribute('hidden');
    }

    function hideModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'none';
        modal.setAttribute('hidden', 'true');
    }

    let lastErrorMessage = null;
    let lastErrorTime = 0;
    const ERROR_DEBOUNCE_MS = 3000;

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert('Mensaje: ' + message);
            return;
        }
        const now = Date.now();
        if (isSuccess || (message !== lastErrorMessage || now - lastErrorTime > ERROR_DEBOUNCE_MS)) {
            successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
            successMessage.textContent = message;
            successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
            showModal(successModal);
            setTimeout(() => hideModal(successModal), 2000);
            if (!isSuccess) {
                lastErrorMessage = message;
                lastErrorTime = now;
            }
        }
    }

    function resetForm() {
        if (guiaForm) {
            guiaForm.reset();
            currentEditId = null;
            guiaForm.querySelector('.form-btn.save').textContent = 'Guardar';
        }
    }

    async function getEstadoFromLotes(guiaDespacho) {
        try {
            const lotesQuery = query(collection(db, 'lotes'), where('documentoDelivery', '==', guiaDespacho));
            const querySnapshot = await getDocs(lotesQuery);
            if (!querySnapshot.empty) {
                const loteData = querySnapshot.docs[0].data();
                const estado = loteData.estado || 'Sin asignar';
                return estado;
            }
            return 'Sin asignar';
        } catch (error) {
            console.error('Error al obtener estado desde lotes:', error.message);
            return 'Sin asignar';
        }
    }

    const debouncedLoadGuias = debounce(loadGuias, 500);

    async function loadGuias() {
        if (isLoading) {
            return;
        }
        isLoading = true;

        try {
            if (!tableBody) {
                console.error('No se encontró la tabla de guías');
                showSuccessMessage('Error: No se encontró la tabla de guías', false);
                return;
            }

            const isUserAdmin = await isAdmin();
            if (formContainer) {
                formContainer.style.display = isUserAdmin ? 'block' : 'none';
            }

            if (isUserAdmin) {
                document.querySelector('#guias-table').classList.add('admin');
            } else {
                document.querySelector('#guias-table').classList.remove('admin');
            }

            const guiasCollection = collection(db, 'guias');
            const querySnapshot = await getDocs(guiasCollection);
            tableBody.innerHTML = '';
            const fragment = document.createDocumentFragment();

            for (const doc of querySnapshot.docs) {
                const data = doc.data();
                const estado = await getEstadoFromLotes(data.guiaDespacho);
                const tr = document.createElement('tr');
                tr.dataset.guiaId = doc.id;
                if (estado === 'Cargado') {
                    tr.classList.add('state-cargado');
                } else if (estado === 'Pendiente') {
                    tr.classList.add('state-pendiente');
                }
                tr.innerHTML = `
                    <td>${data.folio || '-'}</td>
                    <td>${formatDateOnly(data.fechaGuia)}</td>
                    <td>${data.guiaDespacho || '-'}</td>
                    <td>${estado}</td>
                    <td class="admin-only">
                        <button class="action-btn edit" data-id="${doc.id}">Editar</button>
                        <button class="action-btn delete" data-id="${doc.id}">Eliminar</button>
                    </td>
                `;
                fragment.appendChild(tr);
            }

            tableBody.appendChild(fragment);

            if (isUserAdmin) {
                tableBody.querySelectorAll('.action-btn.edit').forEach(btn => {
                    btn.addEventListener('click', () => editGuia(btn.dataset.id));
                });
                tableBody.querySelectorAll('.action-btn.delete').forEach(btn => {
                    btn.addEventListener('click', () => deleteGuia(btn.dataset.id));
                });
            }
        } catch (error) {
            console.error('Error al cargar guías:', error.message);
            showSuccessMessage('Error al cargar guías: ' + error.message, false);
        } finally {
            isLoading = false;
        }
    }

    function listenLotesChanges() {
        if (lotesUnsubscribe) {
            lotesUnsubscribe();
        }

        const lotesCollection = collection(db, 'lotes');
        lotesUnsubscribe = onSnapshot(lotesCollection, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'modified' || change.type === 'added') {
                    const loteData = change.doc.data();
                    const guiaDespacho = loteData.documentoDelivery;
                    const estado = loteData.estado || 'Sin asignar';
                    if (guiaDespacho) {
                        const guiasQuery = query(collection(db, 'guias'), where('guiaDespacho', '==', guiaDespacho));
                        const querySnapshot = await getDocs(guiasQuery);
                        if (!querySnapshot.empty) {
                            const guiaRef = doc(db, 'guias', querySnapshot.docs[0].id);
                            await updateDoc(guiaRef, { estado });
                        }
                    }
                }
            }
            debouncedLoadGuias();
        }, (error) => {
            console.error('Error al escuchar cambios en lotes:', error.message);
            showSuccessMessage('Error al sincronizar estados: ' + error.message, false);
        });
    }

    function cleanup() {
        if (lotesUnsubscribe) {
            lotesUnsubscribe();
            lotesUnsubscribe = null;
        }
    }

    async function saveGuia(guiaId, formData, isEdit = false) {
        try {
            const isUserAdmin = await isAdmin();
            if (!isUserAdmin) {
                showSuccessMessage('No tienes permiso para realizar esta acción', false);
                return;
            }

            const guiaData = {
                folio: formData.folio || '-',
                fechaGuia: formData.fechaGuia ? Timestamp.fromDate(new Date(formData.fechaGuia)) : null,
                guiaDespacho: formData.guiaDespacho || '-',
                uid: currentUser.uid,
                createdAt: Timestamp.now()
            };

            if (isEdit) {
                const guiaRef = doc(db, 'guias', guiaId);
                await updateDoc(guiaRef, guiaData);
                showSuccessMessage('Guía actualizada correctamente');
            } else {
                await addDoc(collection(db, 'guias'), guiaData);
                showSuccessMessage('Guía creada correctamente');
            }

            resetForm();
            await loadGuias();
        } catch (error) {
            console.error('Error al guardar la guía:', error.message);
            showSuccessMessage('Error al guardar la guía: ' + error.message, false);
        }
    }

    async function editGuia(guiaId) {
        try {
            const isUserAdmin = await isAdmin();
            if (!isUserAdmin) {
                showSuccessMessage('No tienes permiso para editar guías', false);
                return;
            }

            const guiaRef = doc(db, 'guias', guiaId);
            const guiaSnap = await getDoc(guiaRef);
            if (!guiaSnap.exists()) {
                showSuccessMessage('Guía no encontrada', false);
                return;
            }

            const data = guiaSnap.data();
            guiaForm['folio'].value = data.folio || '';
            guiaForm['fechaGuia'].value = data.fechaGuia ? formatDateOnly(data.fechaGuia).split('-').reverse().join('-') : '';
            guiaForm['guiaDespacho'].value = data.guiaDespacho || '';
            guiaForm.querySelector('.form-btn.save').textContent = 'Actualizar';
            currentEditId = guiaId;
        } catch (error) {
            console.error('Error al preparar edición de guía:', error.message);
            showSuccessMessage('Error al preparar edición de guía: ' + error.message, false);
        }
    }

    async function deleteGuia(guiaId) {
        try {
            const isUserAdmin = await isAdmin();
            if (!isUserAdmin) {
                showSuccessMessage('No tienes permiso para eliminar guías', false);
                return;
            }

            if (!confirm('¿Estás seguro de que deseas eliminar esta guía?')) return;

            const guiaRef = doc(db, 'guias', guiaId);
            await deleteDoc(guiaRef);
            showSuccessMessage('Guía eliminada correctamente');
            await loadGuias();
            resetForm();
        } catch (error) {
            console.error('Error al eliminar la guía:', error.message);
            showSuccessMessage('Error al eliminar la guía: ' + error.message, false);
        }
    }

    if (guiaForm) {
        const submitHandler = async (e) => {
            e.preventDefault();
            const formData = {
                folio: guiaForm['folio'].value,
                fechaGuia: guiaForm['fechaGuia'].value,
                guiaDespacho: guiaForm['guiaDespacho'].value
            };
            await saveGuia(currentEditId, formData, !!currentEditId);
        };

        const cancelBtn = guiaForm.querySelector('.form-btn.cancel');
        const cancelHandler = () => {
            resetForm();
        };

        guiaForm.addEventListener('submit', submitHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loadGuias();
            listenLotesChanges();
        } else {
            console.warn('Usuario no autenticado');
            showSuccessMessage('Por favor, inicia sesión para continuar', false);
            if (formContainer) formContainer.style.display = 'none';
            if (tableBody) tableBody.innerHTML = '';
        }
    });

    window.addEventListener('beforeunload', cleanup);

} catch (error) {
    console.error('Error inicializando la aplicación:', error.message);
    alert('Error al inicializar la aplicación: ' + error.message);

}
