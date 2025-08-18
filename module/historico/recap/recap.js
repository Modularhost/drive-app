import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, getDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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

    const recapContainer = document.querySelector('.recap-container');
    const recapTableBody = document.querySelector('#recap-table tbody');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const yearFilter = document.getElementById('year-filter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');

    const elements = { recapContainer, recapTableBody, loadingModal, loadingProgress, successModal, successIcon, successMessage, yearFilter, prevBtn, nextBtn, pageInfo, totalRecords };
    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    const recordsPerPage = 50; // 50 registros por página
    let currentPage = 1;
    let providers = [];
    let totalProviders = 0;
    let allMonthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
    let empresaRutCache = new Map(); // Cache para RUTs de empresas

    function showModal(modal, progressElement = null, percentage = null) {
        if (!modal) { console.warn('Modal no encontrado'); return; }
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) progressElement.textContent = `${percentage}%`;
    }

    function hideModal(modal) {
        if (!modal) { console.warn('Modal no encontrado'); return; }
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

    function formatDate(date) {
        if (!date) {
            console.warn('Fecha nula recibida');
            return null;
        }
        if (date instanceof Timestamp) return date.toDate();
        if (date instanceof Date) return date;
        try {
            return new Date(date);
        } catch (e) {
            console.warn('Error al parsear fecha:', date, e.message);
            return null;
        }
    }

    async function cacheEmpresaRuts() {
        try {
            const empresasCollection = collection(db, 'empresas');
            const querySnapshot = await getDocs(empresasCollection);
            console.log(`Cargados ${querySnapshot.size} documentos de empresas`);
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.nombreEmpresa && data.rutEmpresa) {
                    empresaRutCache.set(data.nombreEmpresa, data.rutEmpresa);
                } else {
                    console.warn(`Documento de empresa inválido: ${doc.id}`, data);
                }
            });
        } catch (error) {
            console.error('Error al cachear RUTs:', error.message);
        }
    }

    function getEmpresaRut(proveedor) {
        return empresaRutCache.get(proveedor) || "Empresa no registrada";
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async function loadRecapData(selectedYear = '') {
        try {
            showModal(loadingModal, loadingProgress, 0);
            recapTableBody.innerHTML = '';
            const fragment = document.createDocumentFragment();
            allMonthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };

            // Obtener todos los documentos de datos_historico
            const datosHistoricoCollection = collection(db, 'datos_historico');
            let querySnapshot;
            if (selectedYear) {
                const startDate = Timestamp.fromDate(new Date(`${selectedYear}-01-01`));
                const endDate = Timestamp.fromDate(new Date(`${selectedYear}-12-31T23:59:59`));
                querySnapshot = await getDocs(query(
                    datosHistoricoCollection,
                    where('fecha_cirugia', '>=', startDate),
                    where('fecha_cirugia', '<=', endDate)
                ));
            } else {
                querySnapshot = await getDocs(datosHistoricoCollection);
            }

            console.log(`Cargados ${querySnapshot.size} documentos de datos_historico`);

            const registrosMap = new Map();
            let processedDocs = 0;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const proveedor = data.proveedor || 'Sin Proveedor';
                let fechaCirugia = formatDate(data.fecha_cirugia);
                if (fechaCirugia && !isNaN(fechaCirugia.getTime())) {
                    if (!registrosMap.has(proveedor)) {
                        registrosMap.set(proveedor, []);
                    }
                    registrosMap.get(proveedor).push(data);
                } else {
                    console.warn(`Documento con fecha inválida: ${doc.id}`, data);
                }
                processedDocs++;
                const progress = Math.round((processedDocs / querySnapshot.size) * 40); // 40% para carga de datos
                showModal(loadingModal, loadingProgress, progress);
            });

            providers = Array.from(registrosMap.keys());
            totalProviders = providers.length;
            console.log(`Proveedores encontrados: ${totalProviders}`);

            if (totalProviders === 0) {
                showSuccessMessage('No se encontraron datos para mostrar.', false);
                recapTableBody.innerHTML = '<tr><td colspan="15">No hay datos disponibles</td></tr>';
                hideModal(loadingModal);
                updatePaginationControls(totalProviders);
                return;
            }

            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            const paginatedProviders = providers.slice(startIndex, endIndex);

            // Carga progresiva en lotes de 10
            async function renderBatch(start, end) {
                const batchFragment = document.createDocumentFragment();
                for (let i = start; i < Math.min(end, paginatedProviders.length); i++) {
                    const proveedor = paginatedProviders[i];
                    const rut = getEmpresaRut(proveedor);
                    const registros = registrosMap.get(proveedor);
                    const monthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
                    registros.filter(r => !r.estado || r.estado === 'Pendiente factura').forEach(r => {
                        const fechaCirugia = formatDate(r.fecha_cirugia);
                        if (fechaCirugia && !isNaN(fechaCirugia.getTime())) {
                            const month = fechaCirugia.getMonth();
                            const ocMonto = parseFloat(r.oc_monto) || 0;
                            if (!isNaN(ocMonto)) {
                                monthlyTotals[month] += ocMonto;
                                allMonthlyTotals[month] += ocMonto;
                            } else {
                                console.warn(`Monto inválido en documento: ${r.id || 'sin ID'}`, r);
                            }
                        }
                    });

                    const total = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${proveedor}</td>
                        <td>${rut}</td>
                        <td>${monthlyTotals[0].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[1].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[2].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[3].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[4].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[5].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[6].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[7].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[8].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[9].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[10].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${monthlyTotals[11].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        <td>${total.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    `;
                    batchFragment.appendChild(tr);

                    const progress = 40 + Math.round((i + 1) / paginatedProviders.length * 50); // 50% para renderizado
                    showModal(loadingModal, loadingProgress, progress);
                }
                fragment.appendChild(batchFragment);
                recapTableBody.appendChild(fragment);

                if (end < paginatedProviders.length) {
                    setTimeout(() => renderBatch(end, end + 10), 0);
                } else {
                    // Añadir fila de total general solo en la última página
                    if (currentPage === Math.ceil(totalProviders / recordsPerPage)) {
                        const totalRow = document.createElement('tr');
                        totalRow.innerHTML = `
                            <td><strong>Total General</strong></td>
                            <td>-</td>
                            <td>${allMonthlyTotals[0].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[1].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[2].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[3].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[4].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[5].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[6].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[7].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[8].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[9].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[10].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${allMonthlyTotals[11].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                            <td>${Object.values(allMonthlyTotals).reduce((a, b) => a + b, 0).toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                        `;
                        recapTableBody.appendChild(totalRow);
                    }
                    updatePaginationControls(totalProviders);
                    hideModal(loadingModal);
                    console.log('Renderizado completo. Filas en la tabla:', recapTableBody.children.length);
                }
            }

            showModal(loadingModal, loadingProgress, 40); // 40% tras cargar datos
            await renderBatch(0, 10); // Renderizar primeras 10 filas
        } catch (error) {
            console.error('Error al cargar datos de recap:', error.message);
            showSuccessMessage('Error al cargar datos: ' + error.message, false);
            recapTableBody.innerHTML = '<tr><td colspan="15">Error al cargar datos</td></tr>';
            hideModal(loadingModal);
        }
    }

    function updatePaginationControls(total) {
        const totalPages = Math.ceil(total / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        totalRecords.textContent = `Total de registros: ${total}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        console.log(`Paginación actualizada: Página ${currentPage} de ${totalPages}, Total: ${total}`);
    }

    function setupColumnResizing() {
        const table = document.getElementById('recap-table');
        const cols = table.querySelectorAll('col');
        const headers = table.querySelectorAll('th.resizeable');

        function throttle(fn, wait) {
            let lastCall = 0;
            return function (...args) {
                const now = Date.now();
                if (now - lastCall >= wait) {
                    lastCall = now;
                    return fn(...args);
                }
            };
        }

        headers.forEach((header, index) => {
            const col = cols[index];
            if (!col) return;

            let startX, startWidth;

            const onMouseMove = throttle((e) => {
                const newWidth = startWidth + (e.clientX - startX);
                if (newWidth > 60) { // Ancho mínimo de 60px
                    col.style.width = `${newWidth}px`;
                    header.classList.add('resizing');
                }
            }, 16); // Limitar a ~60 FPS (16ms)

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                header.classList.remove('resizing');
            };

            header.addEventListener('mousedown', (e) => {
                if (e.offsetX > header.offsetWidth - 10) { // Detectar clic en el borde derecho
                    startX = e.clientX;
                    startWidth = parseInt(getComputedStyle(col).width, 10) || 100;
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }
            });
        });
    }

    function populateYearFilter(years) {
        if (!yearFilter) { console.error('Elemento year-filter no encontrado'); return; }
        yearFilter.innerHTML = '<option value="">Todos los años</option>';
        if (years.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Sin años disponibles';
            option.disabled = true;
            yearFilter.appendChild(option);
        } else {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }
        const currentYear = new Date().getFullYear().toString();
        if (years.includes(currentYear)) {
            yearFilter.value = currentYear;
        }
        console.log(`Filtro de años poblado: ${years.length} años disponibles`);
    }

    async function init() {
        if (!recapContainer) {
            console.error('Contenedor .recap-container no encontrado');
            return;
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error('No hay usuario autenticado');
                recapContainer.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => window.location.href = 'index.html?error=auth-required', 2000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Documento de usuario no encontrado');
                    recapContainer.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || (userData.permissions && userData.permissions.includes('Tablas:Historico'));
                if (!hasAccess) {
                    console.error('Acceso denegado');
                    recapContainer.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                showModal(loadingModal, loadingProgress, 0);
                await cacheEmpresaRuts(); // Cachear RUTs al inicio
                showModal(loadingModal, loadingProgress, 10); // 10% tras cachear RUTs

                const datosHistoricoCollection = collection(db, 'datos_historico');
                const querySnapshot = await getDocs(datosHistoricoCollection);
                const years = [...new Set(querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    let fechaCirugia = formatDate(data.fecha_cirugia);
                    return fechaCirugia && !isNaN(fechaCirugia.getTime()) ? fechaCirugia.getFullYear().toString() : null;
                }).filter(year => year))].sort();
                populateYearFilter(years);
                showModal(loadingModal, loadingProgress, 20); // 20% tras cargar años

                yearFilter.addEventListener('change', debounce(() => {
                    currentPage = 1;
                    loadRecapData(yearFilter.value);
                }, 300));

                prevBtn.addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        loadRecapData(yearFilter.value);
                    }
                });

                nextBtn.addEventListener('click', () => {
                    const totalPages = Math.ceil(totalProviders / recordsPerPage);
                    if (currentPage < totalPages) {
                        currentPage++;
                        loadRecapData(yearFilter.value);
                    }
                });

                await loadRecapData(yearFilter.value);
                setupColumnResizing();
            } catch (error) {
                console.error('Error en verificación de usuario:', error.message);
                recapContainer.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
                hideModal(loadingModal);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => init());
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(() => init(), 1);
} catch (error) {
    console.error('Error al inicializar Firebase:', error.message);
    const recapContainer = document.querySelector('.recap-container');
    if (recapContainer) recapContainer.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;

}
