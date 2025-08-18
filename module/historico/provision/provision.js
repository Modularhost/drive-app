import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, getDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdWLsgSF7mtA4moJ4yu9WzrVwfpNqYjXo",
    authDomain: "respadol-modular.firebaseapp.com",
    projectId: "respadol-modular",
    storageBucket: "respadol-modular.firebasestorage.app",
    messagingSenderId: "458804625858",
    appId: "1:458804625858:web:5580163bc0736efbf2165b",
    measurementId: "G-30MEEM4VMZ"
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

    const provisionContainer = document.querySelector('.provision-container');
    const provisionTableBody = document.querySelector('#provision-table tbody');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const yearFilter = document.getElementById('year-filter');

    const elements = { provisionContainer, provisionTableBody, loadingModal, loadingProgress, successModal, successIcon, successMessage, yearFilter };
    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

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
        if (!date) return null;
        if (date instanceof Timestamp) return date.toDate();
        if (date instanceof Date) return date;
        return new Date(date);
    }

    async function loadProvisionData(selectedYear = '') {
        try {
            showModal(loadingModal, loadingProgress, 0);
            const datosHistoricoCollection = collection(db, 'datos_historico');
            const querySnapshot = await getDocs(datosHistoricoCollection);
            const monthlyData = { 0: { total: 0, facturado: 0 }, 1: { total: 0, facturado: 0 }, 2: { total: 0, facturado: 0 }, 3: { total: 0, facturado: 0 }, 4: { total: 0, facturado: 0 }, 5: { total: 0, facturado: 0 }, 6: { total: 0, facturado: 0 }, 7: { total: 0, facturado: 0 }, 8: { total: 0, facturado: 0 }, 9: { total: 0, facturado: 0 }, 10: { total: 0, facturado: 0 }, 11: { total: 0, facturado: 0 } };

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let fechaCirugia = formatDate(data.fecha_cirugia);
                if (fechaCirugia && !isNaN(fechaCirugia.getTime())) {
                    if (!selectedYear || fechaCirugia.getFullYear().toString() === selectedYear) {
                        const month = fechaCirugia.getMonth();
                        const ocMonto = parseFloat(data.oc_monto) || 0;
                        monthlyData[month].total += ocMonto;
                        if (data.estado && ['Facturado', 'Anular Item', 'Anular OC'].includes(data.estado)) {
                            monthlyData[month].facturado += ocMonto;
                        }
                    }
                }
            });

            provisionTableBody.innerHTML = '';
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            for (let i = 0; i < 12; i++) {
                const total = monthlyData[i].total;
                const facturado = monthlyData[i].facturado;
                const pendiente = total - facturado;
                const provision = total > 0 ? ((pendiente / total) * 100).toFixed(2) : 0;
                const provisionClass = provision > 20 ? 'provision-high' : '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${monthNames[i]}</td>
                    <td>${total.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${facturado.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${pendiente.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td class="${provisionClass}">${provision}%</td>
                `;
                provisionTableBody.appendChild(tr);

                const progress = Math.round((i + 1) / 12 * 100);
                showModal(loadingModal, loadingProgress, progress);
            }

            hideModal(loadingModal);
        } catch (error) {
            console.error('Error al cargar datos de provision:', error.message);
            showSuccessMessage('Error al cargar datos: ' + error.message, false);
            hideModal(loadingModal);
        }
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
    }

    async function init() {
        if (!provisionContainer) {
            console.error('Contenedor .provision-container no encontrado');
            return;
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error('No hay usuario autenticado');
                provisionContainer.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => window.location.href = 'index.html?error=auth-required', 2000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Documento de usuario no encontrado');
                    provisionContainer.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || (userData.permissions && userData.permissions.includes('Tablas:Historico'));
                if (!hasAccess) {
                    console.error('Acceso denegado');
                    provisionContainer.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                const datosHistoricoCollection = collection(db, 'datos_historico');
                const querySnapshot = await getDocs(datosHistoricoCollection);
                const years = [...new Set(querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    let fechaCirugia = formatDate(data.fecha_cirugia);
                    return fechaCirugia && !isNaN(fechaCirugia.getTime()) ? fechaCirugia.getFullYear().toString() : null;
                }).filter(year => year))].sort();
                populateYearFilter(years);

                yearFilter.addEventListener('change', () => {
                    const selectedYear = yearFilter.value;
                    loadProvisionData(selectedYear);
                });

                await loadProvisionData(yearFilter.value);
            } catch (error) {
                console.error('Error en verificación de usuario:', error.message);
                provisionContainer.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => init());
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(() => init(), 1);
} catch (error) {
    console.error('Error al inicializar Firebase:', error.message);
    const provisionContainer = document.querySelector('.provision-container');
    if (provisionContainer) provisionContainer.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
}