import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, limit, startAfter, getDoc, doc, Timestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
        console.error('Error al configurar persistencia:', error.message);
    });

    const container = document.querySelector('.listado-precios-container');
    const proveedorInput = document.getElementById('proveedor');
    const proveedorSearch = document.getElementById('proveedor-search');
    const proveedorList = document.getElementById('proveedor-list');
    const buscadorInput = document.getElementById('buscador');
    const filterYearSelect = document.getElementById('filter-year');
    const descargarFormatoBtn = document.getElementById('descargar-formato-btn');
    const importarBtn = document.getElementById('importar-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const importFileInput = document.getElementById('import-file');
    const tableBody = document.querySelector('#precios-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');

    const elements = {
        container, proveedorInput, proveedorSearch, proveedorList, buscadorInput, filterYearSelect,
        descargarFormatoBtn, importarBtn, exportExcelBtn, importFileInput, tableBody,
        prevBtn, nextBtn, pageInfo, totalRecords, successModal, successIcon, successMessage,
        loadingModal, loadingProgress
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let precios = [];
    let currentPage = 1;
    const recordsPerPage = 50;
    let lastVisible = null;
    let totalPages = 1;
    let quickFilters = { proveedor: null, search: null, year: null };

    function parseCustomDate(dateStr) {
        if (!dateStr) return new Date();
        const regex = /^(\d{2})-(\d{2})-(\d{4})(?:\s(\d{2}):(\d{2}))?$/;
        const match = dateStr.match(regex);
        if (!match) {
            console.warn(`Formato de fecha inválido: ${dateStr}`);
            return new Date();
        }
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const hours = match[4] ? parseInt(match[4], 10) : 0;
        const minutes = match[5] ? parseInt(match[5], 10) : 0;
        const date = new Date(year, month, day, hours, minutes);
        if (isNaN(date.getTime())) {
            console.warn(`Fecha inválida después de parsear: ${dateStr}`);
            return new Date();
        }
        return date;
    }

    function formatDate(date) {
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'string') {
            parsedDate = parseCustomDate(date);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '-';
        return parsedDate.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    function showModal(modal, progressElement = null, percentage = null) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) {
            progressElement.textContent = `${percentage}%`;
        }
    }

    function hideModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'none';
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    async function loadProveedores() {
        try {
            const preciosCollection = collection(db, 'listado_precios');
            const querySnapshot = await getDocs(preciosCollection);
            const proveedores = [...new Set(querySnapshot.docs.map(doc => doc.data().proveedor))].sort();
            return proveedores;
        } catch (error) {
            console.error('Error al cargar proveedores:', error.message);
            showSuccessMessage('Error al cargar proveedores: ' + error.message, false);
            return [];
        }
    }

    function filterAndRenderSuggestions(input, suggestionsList, proveedores, showAll = false) {
        suggestionsList.innerHTML = '';
        const inputValue = input.value.trim();
        let filteredProveedores = showAll || !inputValue ? proveedores : proveedores.filter(prov => prov.toLowerCase().includes(inputValue.toLowerCase()));

        const showAllLi = document.createElement('li');
        showAllLi.textContent = 'Mostrar todos';
        showAllLi.addEventListener('click', () => {
            input.value = ''; 
            suggestionsList.innerHTML = '';
            suggestionsList.style.display = 'none';
            quickFilters.proveedor = null;
            currentPage = 1;
            loadPrecios();
        });
        suggestionsList.appendChild(showAllLi);

        if (filteredProveedores.length === 0 && !showAll) {
            suggestionsList.style.display = 'none';
            return;
        }
        filteredProveedores.forEach(prov => {
            const li = document.createElement('li');
            li.textContent = prov;
            li.addEventListener('click', () => {
                input.value = prov;
                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
                quickFilters.proveedor = prov;
                currentPage = 1;
                loadPrecios();
            });
            suggestionsList.appendChild(li);
        });
        suggestionsList.style.display = 'block';
    }

    async function setupProveedorAutocomplete() {
        if (!proveedorInput || !proveedorList || !proveedorSearch) return;
        const proveedores = await loadProveedores();
        proveedorInput.addEventListener('input', () => filterAndRenderSuggestions(proveedorInput, proveedorList, proveedores, false));
        proveedorInput.addEventListener('focus', () => {
            if (proveedorInput.value.trim()) filterAndRenderSuggestions(proveedorInput, proveedorList, proveedores, false);
        });
        proveedorSearch.addEventListener('click', () => filterAndRenderSuggestions(proveedorInput, proveedorList, proveedores, true));
        document.addEventListener('click', e => {
            if (!proveedorInput.contains(e.target) && !proveedorList.contains(e.target) && !proveedorSearch.contains(e.target)) {
                proveedorList.innerHTML = '';
                proveedorList.style.display = 'none';
            }
        });
    }

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p.anio)
            .map(p => p.anio.toString())
        )].sort((a, b) => b - a);
        filterYearSelect.innerHTML = '<option value="">Seleccione un año</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
        filterYearSelect.value = quickFilters.year || '';
    }

    function applyQuickFilters(data) {
        return data.filter(item => {
            let matches = true;

            if (quickFilters.proveedor) {
                matches = matches && item.proveedor === quickFilters.proveedor;
            }

            if (quickFilters.year) {
                matches = matches && item.anio.toString() === quickFilters.year;
            }

            if (quickFilters.search) {
                const searchLower = quickFilters.search.toLowerCase();
                matches = matches && (
                    (item.referencia || '').toLowerCase().includes(searchLower) ||
                    (item.descripcion || '').toLowerCase().includes(searchLower)
                );
            }

            return matches;
        });
    }

    async function loadPrecios() {
        try {
            if (!tableBody || !loadingModal || !loadingProgress) {
                showSuccessMessage('Error: Elementos esenciales no encontrados', false);
                return;
            }

            showModal(loadingModal, loadingProgress, 0);
            const preciosCollection = collection(db, 'listado_precios');
            const countSnapshot = await getDocs(preciosCollection);
            const totalRecordsCount = countSnapshot.size;
            totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
            totalPages = Math.ceil(totalRecordsCount / recordsPerPage);

            let q = query(preciosCollection, orderBy('fechaIngresado', 'desc'), limit(recordsPerPage));
            if (lastVisible && currentPage > 1) {
                q = query(preciosCollection, orderBy('fechaIngresado', 'desc'), startAfter(lastVisible), limit(recordsPerPage));
            }
            const querySnapshot = await getDocs(q);
            precios = [];
            querySnapshot.forEach(doc => {
                precios.push({ docId: doc.id, ...doc.data() });
            });
            if (precios.length > 0) {
                lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            }

            await setupProveedorAutocomplete();
            updateYearFilter(precios);
            const filteredPrecios = applyQuickFilters(precios);
            renderTable(filteredPrecios);
            updatePagination(filteredPrecios.length);
            hideModal(loadingModal);
        } catch (error) {
            console.error('Error al cargar precios:', error.message);
            showSuccessMessage('Error al cargar datos: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    function renderTable(data) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        data.forEach(precio => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${precio.anio || '-'}</td>
                <td>${precio.proveedor || '-'}</td>
                <td>${precio.referencia || '-'}</td>
                <td>${precio.descripcion || '-'}</td>
                <td>${precio.precio ? precio.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-'}</td>
                <td>${formatDate(precio.fechaIngresado)}</td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    }

    function updatePagination(total) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPagesFiltered = Math.ceil(total / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPagesFiltered || 1}`;
        if (!quickFilters.proveedor) {
            pageInfo.textContent += ' (Mostrando resultados de todos los proveedores)';
        } else {
            pageInfo.textContent += ` (Mostrando resultados de ${quickFilters.proveedor})`;
        }
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPagesFiltered || totalPagesFiltered === 0;
    }

    async function descargarFormato() {
        try {
            const data = [{
                Año: '',
                Proveedor: '',
                Referencia: '',
                Descripción: '',
                Precio: '',
                'Fecha Ingresado': ''
            }];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Formato Precios');
            XLSX.writeFile(wb, 'formato_precios.xlsx');
        } catch (error) {
            console.error('Error al descargar formato:', error.message);
            showSuccessMessage('Error al descargar formato: ' + error.message, false);
        }
    }

    async function exportToExcel() {
        try {
            const filteredPrecios = applyQuickFilters(precios);
            const data = filteredPrecios.map(precio => ({
                Año: precio.anio || '-',
                Proveedor: precio.proveedor || '-',
                Referencia: precio.referencia || '-',
                Descripción: precio.descripcion || '-',
                Precio: precio.precio ? precio.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-',
                'Fecha Ingresado': formatDate(precio.fechaIngresado)
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Precios');
            XLSX.writeFile(wb, 'listado_precios.xlsx');
        } catch (error) {
            console.error('Error al exportar a Excel:', error.message);
            showSuccessMessage('Error al exportar a Excel: ' + error.message, false);
        }
    }

    async function importarDatos(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            showModal(loadingModal, loadingProgress, 0);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(sheet);
                    if (!jsonData.length) {
                        showSuccessMessage('El archivo Excel está vacío', false);
                        hideModal(loadingModal);
                        return;
                    }

                    const fullName = await getUserFullName();
                    const now = Timestamp.fromDate(new Date());
                    const batch = writeBatch(db);
                    let processed = 0;

                    for (const row of jsonData) {
                        const anio = parseInt(row['Año']);
                        const proveedor = (row['Proveedor'] || '').toString().trim();
                        const referencia = (row['Referencia'] || '').toString().trim().toUpperCase();
                        const descripcion = (row['Descripción'] || '').toString().trim().toUpperCase();
                        let precio = (row['Precio'] || '').toString().replace(/[^0-9]/g, '');
                        precio = precio ? parseInt(precio) : 0;
                        const fechaIngresadoStr = row['Fecha Ingresado'] ? row['Fecha Ingresado'].toString().trim() : '';
                        const fechaIngresado = fechaIngresadoStr ? parseCustomDate(fechaIngresadoStr) : new Date();

                        if (!anio || !proveedor || !referencia || !descripcion || !precio) {
                            console.warn('Fila inválida:', row);
                            continue;
                        }
                        if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 10) {
                            console.warn(`Año inválido: ${anio}`);
                            continue;
                        }
                        if (precio > 9999999) {
                            console.warn(`Precio excede el límite: ${precio}`);
                            continue;
                        }
                        if (!fechaIngresado || isNaN(fechaIngresado.getTime())) {
                            console.warn(`Fecha inválida: ${fechaIngresadoStr}`);
                            continue;
                        }

                        const precioId = await getNextPrecioId();
                        const precioRef = doc(collection(db, 'listado_precios'));
                        batch.set(precioRef, {
                            precioId,
                            anio,
                            proveedor,
                            referencia,
                            descripcion,
                            precio,
                            fechaIngresado: Timestamp.fromDate(fechaIngresado),
                            usuario: fullName,
                            fechaCreacion: now,
                            lastAction: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                            uid: auth.currentUser.uid
                        });
                        const logRef = doc(collection(db, 'listado_precios', precioRef.id, 'logs'));
                        batch.set(logRef, {
                            action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                            details: `Precio "${referencia}" importado`,
                            timestamp: now,
                            user: fullName,
                            uid: auth.currentUser.uid
                        });

                        processed++;
                        const progress = Math.round((processed / jsonData.length) * 100);
                        showModal(loadingModal, loadingProgress, progress);
                    }

                    await batch.commit();
                    hideModal(loadingModal);
                    showSuccessMessage(`Datos importados correctamente (${processed} registros)`);
                    loadPrecios();
                    importFileInput.value = '';
                } catch (error) {
                    console.error('Error al importar datos:', error.message);
                    showSuccessMessage('Error al importar datos: ' + error.message, false);
                    hideModal(loadingModal);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error al procesar archivo:', error.message);
            showSuccessMessage('Error al procesar archivo: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    async function getUserFullName() {
        const user = auth.currentUser;
        if (!user) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    async function getNextPrecioId() {
        const preciosCollection = collection(db, 'listado_precios');
        const q = query(preciosCollection, orderBy('precioId', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextId = 1;
        if (!querySnapshot.empty) {
            const lastPrecio = querySnapshot.docs[0].data();
            nextId = parseInt(lastPrecio.precioId || '0') + 1;
        }
        return nextId.toString().padStart(4, '0');
    }

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

    const debouncedLoadPrecios = debounce(loadPrecios, 500);

    async function init() {
        if (!container) {
            console.error('Contenedor .listado-precios-container no encontrado');
            return;
        }

        if (buscadorInput) {
            buscadorInput.addEventListener('input', () => {
                quickFilters.search = buscadorInput.value.trim();
                currentPage = 1;
                debouncedLoadPrecios();
            });
        }

        if (filterYearSelect) {
            filterYearSelect.addEventListener('change', () => {
                quickFilters.year = filterYearSelect.value || null;
                currentPage = 1;
                debouncedLoadPrecios();
            });
        }

        if (descargarFormatoBtn) {
            descargarFormatoBtn.addEventListener('click', descargarFormato);
        }

        if (importarBtn && importFileInput) {
            importarBtn.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', importarDatos);
        }

        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', exportToExcel);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    debouncedLoadPrecios();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    debouncedLoadPrecios();
                }
            });
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error('No hay usuario autenticado');
                container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => {
                    window.location.href = 'index.html?error=auth-required';
                }, 2000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Documento de usuario no encontrado');
                    container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' ||
                    (userData.permissions && userData.permissions.includes('Implantes:Referencias'));
                if (!hasAccess) {
                    console.error('Acceso denegado');
                    container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                currentUser = user;
                await debouncedLoadPrecios();
            } catch (error) {
                console.error('Error en verificación de usuario:', error.message);
                container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => init(), 1);
    }
} catch (error) {
    console.error('Error al inicializar Firebase:', error.message);
    const container = document.querySelector('.listado-precios-container');
    if (container) {
        container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
    }

}
